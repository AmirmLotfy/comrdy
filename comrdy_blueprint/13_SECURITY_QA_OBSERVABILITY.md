# COMRDY Security, QA & Observability Specification

Version: 0.1

COMRDY sits close to commerce and payment state. Even in the hackathon build, security must be designed as infrastructure, not added after the demo works.

---

## 1. Security principles

1. **Sandbox by default.** Hackathon execution never touches production payment credentials.
2. **Least privilege.** Every integration key receives the minimum scope COMRDY requires.
3. **Deterministic payment gate.** LLM output never directly authorizes capture/refund.
4. **Tenant isolation.** Workspace ownership is checked server-side on every resource lookup.
5. **Secrets never enter browser-agent prompts.** Workers obtain credentials from a scoped vault after policy checks.
6. **Untrusted merchant content stays untrusted.** Page text, tool output, structured data, and screenshots can contain prompt injection.
7. **Evidence is sensitive.** Screenshots, traces, addresses, transaction IDs, and agent prompts have retention/redaction policies.
8. **Reproducibility without secret retention.** Store hashes, versions, normalized states, and safe identifiers—not raw tokens.

---

## 2. Threat model

### Assets

- PayPal client secret/access tokens.
- COMRDY API keys.
- merchant credentials.
- synthetic/customer intent data.
- browser session state.
- payment/order identifiers.
- transaction evidence.
- webhook signing data.
- tenant/project records.

### Threat actors

- unauthenticated internet attacker;
- malicious workspace member;
- compromised merchant page;
- prompt-injected merchant content;
- accidental developer error;
- leaked API key;
- compromised worker/browser session.

---

## 3. P0 threat controls

### SSRF

**Risk:** target URL or page can direct workers to metadata/internal services.

Controls:

- parse and resolve URLs server-side;
- reject private, loopback, link-local, and cloud metadata IP ranges;
- re-check resolved IP after redirects;
- domain allowlist for hackathon demo;
- browser network policy blocks non-allowlisted payment/merchant domains.

### Cross-tenant IDOR

**Risk:** user changes an ID in a route and reads another workspace's trace.

Controls:

- all queries scoped by `workspace_id` from authenticated session;
- never authorize from client-supplied workspace ID alone;
- object-storage access via short-lived signed URLs created after tenant check;
- integration test for every object route.

### Secret leakage

Controls:

- provider secrets encrypted at rest;
- secret values write-only after creation;
- redact common key/token patterns from logs;
- evidence serializer strips headers/cookies by default;
- no `.env` in repository;
- no raw secrets in trace UI;
- API keys shown once, then stored as salted hash + prefix.

### Prompt injection from merchant content

Merchant pages are adversarial input.

Controls:

- system policy tells browser agent page instructions cannot change mission/authority;
- tool permission model separate from model instructions;
- payment actions require deterministic COMRDY gate;
- browser agent cannot fetch COMRDY secrets;
- any page asking to ignore constraints is logged as suspicious evidence;
- hard budget/quantity/subscription constraints enforced after agent action regardless of model reasoning.

### Duplicate economic action

Controls:

- COMRDY operation idempotency key per intended economic action;
- PayPal request id/idempotency support where applicable;
- database unique constraint on `economic_action_key`;
- worker retry checks persisted state before calling provider;
- webhook reconciliation is idempotent.

### Webhook spoofing/replay

Controls:

- verify provider webhook authenticity according to PayPal's supported verification flow;
- persist provider event ID with unique constraint;
- process async;
- respond quickly after safe receipt;
- ignore already-processed event IDs;
- maintain raw payload with strict retention and access controls.

### Fault injection in production

Controls:

- compile-time/environment kill switch;
- internal secret + admin role;
- demo target allowlist;
- Sandbox credential assertion;
- production deployment never includes demo-fault routes unless explicitly isolated.

### Stored XSS

Controls:

- never render merchant HTML in COMRDY;
- sanitize free-form labels and Markdown;
- screenshots served as images, not inline HTML;
- JSON rendered as text/code, never injected into DOM;
- CSP on COMRDY app.

---

## 4. Auth and RBAC

Roles:

- **Owner** — billing, delete workspace, manage secrets/roles.
- **Admin** — projects, integrations, API keys, runs, members.
- **Developer** — create/edit targets, missions, suites, run/replay.
- **Analyst** — read runs/evidence and export reports.
- **Viewer** — read-only summary/case access.

High-risk actions require recent authentication or explicit confirmation:

- delete project/workspace;
- rotate integration secret;
- enable runtime gate;
- production target change;
- export unredacted evidence;
- trigger bulk refund tests outside sandbox.

---

## 5. Data classification

| Class | Examples | Default retention | UI treatment |
|---|---|---:|---|
| Public | docs, marketing content | indefinite | normal |
| Internal | run metrics, suite names | account lifetime | authenticated |
| Sensitive | transaction IDs, prompts, addresses | 30-90 days configurable | masked/role restricted |
| Secret | API secrets, access tokens | minimum required | never displayed after save |

Synthetic demo data should be used wherever possible for hackathon execution.

---

## 6. Encryption and storage

- TLS for all network traffic.
- database encryption provided by managed host plus application-level encryption for integration secrets.
- object storage private by default.
- signed evidence URLs short-lived.
- backups encrypted.
- do not store full card data; COMRDY relies on PayPal-hosted/payment-provider flows and provider identifiers.

---

## 7. Audit log

Record:

- authentication events;
- member/role changes;
- API key creation/revocation;
- integration creation/rotation/deletion;
- target environment changes;
- run cancellation;
- fault/chaos activation;
- runtime-gate policy changes;
- evidence export;
- destructive actions.

Each audit event:

```text
id
workspace_id
actor_type / actor_id
action
resource_type / resource_id
before_hash / after_hash
ip_classification
user_agent_summary
created_at
```

Avoid storing unnecessary raw IPs beyond policy needs.

---

## 8. QA strategy

### Unit tests

Focus on deterministic logic:

- currency-safe money math;
- invariant operators;
- constraint normalization;
- quantity and subscription semantics;
- state transition validator;
- violation severity mapping;
- scoring math;
- idempotency key derivation;
- redaction.

### Integration tests

- Intent Contract -> invariant persistence;
- run worker -> state snapshots;
- PayPal Sandbox create/authorize/capture/refund;
- webhook reconciliation;
- evidence upload/download;
- RBAC per route;
- Redis/queue retry behavior.

### End-to-end tests

P0 flows:

1. sign in/create project;
2. connect PayPal Sandbox;
3. create target;
4. create mission;
5. run no-fault PASS case;
6. run F01 false-success case;
7. open case detail and lineage;
8. replay case;
9. export/share report;
10. reset demo.

### Golden scenario tests

Every seeded demo mission has a machine-readable expected result. These are the release gate for the hackathon build.

---

## 9. Invariant-engine QA

Money values must be integer minor units, never binary floating point.

Test classes:

- exact equality;
- upper/lower bounds;
- inclusive/exclusive limits;
- set membership;
- prohibited flags;
- deadline comparisons with timezone normalization;
- optional fields;
- missing evidence;
- contradictory contracts;
- currency mismatch;
- product variant aliases;
- retries and repeated events.

Property test example:

> If final total increases and all other state is equal, a case that already violated `total <= max` may not become PASS.

---

## 10. Agent-run reliability

### Timeouts

- page navigation: 30 s;
- tool operation: 30 s;
- full case: 5 min default;
- suite-level deadline configurable.

### Retry policy

- infrastructure retry only for clearly transient failures;
- no blind retry of economic actions;
- page action retry maximum 2 where idempotent;
- retry reason written to event timeline.

### Run outcome taxonomy

- PASS
- BLOCKED_CORRECTLY
- FALSE_SUCCESS_PREVENTED
- HARD_FAILURE
- INFRA_FAILURE
- INCONCLUSIVE
- CANCELED

Do not mix infrastructure failure into product reliability metrics.

---

## 11. Observability

### Structured logs

Every log line includes:

- `trace_id`
- `run_id`
- `case_id`
- `workspace_id` (internal UUID only)
- service
- event name
- severity
- duration
- provider
- error code

Never log raw secret values.

### Traces

Distributed trace spans:

```text
run.create
  contract.load
  browser.start
  browser.navigate
  state.normalize
  invariant.evaluate
  paypal.order.create
  paypal.authorization.observe
  gate.evaluate
  paypal.capture
  webhook.reconcile
  evidence.finalize
```

### Metrics

System:

- API p50/p95/p99 latency;
- worker queue depth;
- case runtime;
- browser start failure rate;
- provider error rate;
- webhook lag;
- evidence upload failures.

Product:

- ATR;
- FSR;
- hard failure rate;
- prevented invalid value;
- violations by taxonomy;
- first-divergence checkpoint;
- reliability by agent/protocol/merchant version.

---

## 12. Alerting

P0 operational alerts:

- PayPal webhook verification failures spike;
- capture request is sent after a hard DENY decision;
- duplicate capture detected;
- cross-tenant authorization assertion fails;
- evidence/secret redaction test fails;
- demo environment accidentally points to production payment host/credentials.

P1:

- browser failure >5% over 15 min;
- queue age >2 min;
- webhook lag >2 min;
- p95 API >1.5 s for core UI endpoints.

---

## 13. Performance budgets

### Marketing

- LCP <=2.5 s on representative mobile connection.
- CLS <=0.1.
- minimal client JS on static content.
- hero uses actual product UI image/HTML, not heavy video autoplay.

### App

- shell interactive <2.5 s on normal broadband;
- table interaction target <100 ms for local filter/sort response;
- route transition skeleton within 150 ms;
- run event stream visible within 2 s of worker event;
- virtualize large evidence/event tables.

---

## 14. Accessibility

Target WCAG 2.2 AA for core workflows.

Required:

- keyboard-accessible navigation and tables;
- visible focus ring;
- semantic form labels;
- status never conveyed by color alone;
- minimum contrast for body/UI text;
- `aria-live` for run state changes where useful;
- reduced-motion mode;
- charts have table/text alternatives;
- lineage matrix cells include text status and expected/observed values;
- dialogs trap focus and restore it on close.

---

## 15. Browser and responsive QA

Desktop primary:

- Chrome latest;
- Safari latest;
- Firefox latest.

Responsive checkpoints:

- 1440 px;
- 1280 px;
- 1024 px;
- 768 px;
- 390 px.

On mobile, dense tables switch to summarized rows + detail drawer/page. Do not squeeze 10 columns into horizontal-scroll-only UX for primary tasks.

---

## 16. Release gate

No release/hackathon submission if any item fails:

- [ ] capture can occur after hard violation in automated test;
- [ ] duplicate capture possible on retry scenario;
- [ ] tenant isolation test fails;
- [ ] secret appears in frontend response/log/evidence;
- [ ] fault endpoints operate outside demo/test;
- [ ] webhook verification disabled;
- [ ] M01+F01 is not reproducible;
- [ ] M01 no-fault cannot capture successfully;
- [ ] public demo exposes real personal data;
- [ ] core workflow cannot be completed with keyboard;
- [ ] repository contains credentials.
