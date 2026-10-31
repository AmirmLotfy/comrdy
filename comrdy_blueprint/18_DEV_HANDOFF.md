> Implementation notice (2026-11-01): the focused hackathon scope in [IMPLEMENTATION_SCOPE](../docs/IMPLEMENTATION_SCOPE.md), the root README, and CURRENT_HANDOFF supersede the original SaaS scope, schedules, and unverified claims below. The original blueprint is retained as design history.

# COMRDY Developer Handoff

Version: 0.1

This document is the implementation entry point after the product/design specifications.

---

## 1. Build target

Ship two deployable applications plus one worker:

1. `comrdy.com` — public marketing + authenticated product;
2. demo merchant — controlled Northpath Supply environment;
3. worker — browser-agent and replay execution.

Core rule:

> An LLM may compile or explore; deterministic code decides whether a payment action satisfies the contract.

---

## 2. Local prerequisites

Recommended:

- Node 22 LTS or current project-supported version;
- pnpm;
- Docker Desktop for Postgres/Redis in local dev;
- PayPal Sandbox developer account;
- browser-runner credential if using KERNEL;
- LLM provider API key for compiler/agent tests.

Pin exact versions in repository toolchain files.

---

## 3. Environment variables

Example categories; exact names may change but validation is mandatory.

```bash
# App
APP_URL=
APP_ENV=development
SESSION_SECRET=

# Database
DATABASE_URL=
REDIS_URL=

# Evidence
EVIDENCE_BUCKET=
EVIDENCE_REGION=
EVIDENCE_ACCESS_KEY_ID=
EVIDENCE_SECRET_ACCESS_KEY=

# PayPal Sandbox
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=

# Agent runner
BROWSER_PROVIDER=kernel
KERNEL_API_KEY=
PLAYWRIGHT_FALLBACK_ENABLED=true

# LLM
LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL_CONTRACT=
LLM_MODEL_AGENT=

# Demo
DEMO_MODE=true
DEMO_FAULT_CONTROL_SECRET=
DEMO_STORE_URL=
```

### Hard assertions

If `DEMO_MODE=true`:

- `PAYPAL_ENV` must equal `sandbox`;
- target host must be on demo allowlist;
- production payment credentials must be rejected.

---

## 4. First local run

Target developer experience:

```bash
pnpm install
cp .env.example .env.local
pnpm db:up
pnpm db:migrate
pnpm seed:demo
pnpm dev
```

Then:

- COMRDY web: `http://localhost:3000`
- demo store: `http://localhost:3001`
- worker health: documented local port/endpoint.

If PayPal Sandbox secrets are missing, app should enter `local simulation` mode only for non-payment UI development and display a clear warning. The official demo must use real Sandbox integration.

---

## 5. Database migration policy

- schema in `packages/db`;
- generated migrations committed;
- no destructive auto-sync in production;
- migrations run as explicit deploy step;
- demo seed is idempotent;
- data reset limited to demo workspace/store.

---

## 6. Public API conventions

- version under `/api/v1` once externalized;
- internal UI routes may use typed server actions/route handlers;
- all IDs opaque UUID/ULID;
- money as `{ amount_minor, currency }`;
- timestamps ISO 8601 UTC;
- errors use stable machine code + concise user message;
- pagination cursor-based for event/case tables;
- idempotency key accepted on mutation endpoints that can trigger external/economic actions.

Example error:

```json
{
  "error": {
    "code": "CONTRACT_INVALID",
    "message": "Final total limit must include a currency.",
    "request_id": "req_..."
  }
}
```

---

## 7. Required packages/interfaces

### `@comrdy/contracts`

Owns shared Zod schemas/types. No package may redefine transaction state ad hoc.

### `@comrdy/invariant-engine`

Pure deterministic functions. No network, no LLM, no database dependency in evaluator core.

### `@comrdy/commerce-state`

Normalizes merchant/browser/provider observations to canonical state.

### `@comrdy/paypal`

Provider adapter:

```ts
interface PaymentProvider {
  createOrder(input): Promise<OrderRef>
  getOrder(id): Promise<OrderState>
  authorize(input): Promise<AuthorizationState>
  capture(authorizationId, input): Promise<CaptureState>
  refund(captureId, input): Promise<RefundState>
  verifyWebhook(input): Promise<VerifiedWebhook>
}
```

Do not leak provider-specific response objects throughout product code.

### `@comrdy/evidence`

- artifact metadata;
- redaction;
- checksums;
- signed URL creation;
- normalized trajectory events.

---

## 8. Run state machine implementation

Persist state transitions; do not infer them only from logs.

```text
QUEUED
→ PREPARING
→ EXECUTING
→ EVALUATING
→ PAYMENT_PENDING
→ GATING
→ CAPTURING | BLOCKED
→ POST_PURCHASE
→ FINALIZING
→ COMPLETED
```

Exceptional:

```text
INFRA_FAILED
CANCELED
INCONCLUSIVE
```

Transition function rejects illegal moves.

---

## 9. LLM boundary

### Allowed

- parse natural-language mandate into candidate structured contract;
- generate semantic paraphrases;
- execute browser shopping mission;
- summarize root cause from deterministic evidence;
- draft remediation text.

### Not allowed

- final ALLOW/DENY based only on prose judgment;
- money arithmetic using model output;
- credential selection;
- skipping user constraints because page asks it to;
- creating provider capture/refund call without deterministic policy path.

All compiler output must validate against schema and contract policy.

---

## 10. UI implementation rules

From the design lock:

- Geist Sans + Geist Mono only;
- default light mode;
- exact semantic token roles;
- 1px borders; limited shadow;
- no default card wrappers around every section;
- AG Grid customized to look native to COMRDY, not default theme;
- Intent Lineage is bespoke, not forced into a generic table component;
- raw JSON/code may use dark evidence surface;
- no gradient backgrounds.

### Responsive

Desktop is primary, but all routes must be functional at 390 px. Dense operational tables can become:

- condensed row list;
- filter sheet;
- separate detail route/drawer.

Do not depend on horizontal scrolling for every important action.

---

## 11. Demo fixtures

Repository includes:

```text
fixtures/
  missions/M01.yaml
  contracts/M01.json
  faults/F01.json
  faults/F02.json
  ...
  golden-results/M01-none.json
  golden-results/M01-F01.json
```

Hero case must never depend on an LLM compiler producing a slightly different contract on recording day. It may demonstrate compiler UI, but confirmed fixture is versioned.

---

## 12. CI pipeline

For every PR:

1. install/frozen lockfile;
2. lint;
3. typecheck;
4. unit tests;
5. database migration validation;
6. integration tests with mocked provider;
7. deterministic golden engine tests;
8. secret scan;
9. build apps/packages.

Nightly or protected branch:

- PayPal Sandbox smoke test;
- browser-agent M01 smoke;
- core demo gold scenarios if execution budget permits.

---

## 13. Seed and judge mode

`pnpm seed:demo` creates:

- demo user/workspace;
- project `Hackathon Demo`;
- Northpath target;
- PayPal Sandbox integration placeholder/connection record;
- M01-M10;
- baseline agent profile;
- six P0 chaos rules;
- optional historical sample run for immediate dashboard readability.

Historical sample data must be clearly labeled `Sample` unless generated from real recorded demo runs.

---

## 14. Demo reset

`pnpm demo:reset` or admin action:

- verifies environment;
- clears active faults;
- resets merchant DB;
- archives/clears transient demo runs as configured;
- does not delete source fixtures;
- checks PayPal Sandbox reachability;
- returns success only when demo is runnable.

---

## 15. Repository README outline

1. COMRDY logo/one-line thesis.
2. 20-second GIF or screenshot of Intent Lineage.
3. Problem: false success.
4. Architecture diagram.
5. Why PayPal is central.
6. Quickstart.
7. Demo scenario.
8. Intent Contract example.
9. Invariant engine example.
10. Security/sandbox disclaimer.
11. Project structure.
12. Roadmap.
13. Open-source license.
14. Contributors.

Avoid a README that starts with 40 badges.

---

## 16. Open-source license

Choose a permissive license compatible with the hackathon's open-source requirement and intended commercialization. MIT or Apache-2.0 are simple candidates; obtain legal advice if commercialization strategy requires a different structure.

The public repo must include the actual license file before submission.

---

## 17. Source attribution

Include a `docs/SOURCES.md` or this blueprint's `19_SOURCES.md` for:

- PayPal docs;
- hackathon rules/resources;
- external protocol references;
- design research sources;
- third-party libraries/licenses as appropriate.

Do not imply any competitor/reference endorses COMRDY.

---

## 18. Definition of done by surface

### Marketing

- no placeholder copy;
- responsive;
- correct meta/OG;
- demo/source links work;
- no fake customer logos/testimonials.

### Onboarding

- can create project and target;
- PayPal Sandbox connection health visible;
- user reaches first mission without reading docs.

### Mission/Contract

- compiler validates;
- hard constraints explicit;
- user can edit/confirm;
- version persisted.

### Run

- events stream;
- infrastructure errors separate;
- cancel works safely;
- verdict persisted.

### Case

- Intent Lineage shows every observed checkpoint;
- exact first divergence identified;
- provider/payment state visible;
- evidence opens securely.

### Payment

- no hard-violation capture;
- valid case captures;
- duplicate retry does not duplicate economic outcome;
- webhook reconciliation idempotent.

### Chaos

- P0 fault set reproducible;
- demo only;
- active fault visible in internal controls and evidence.

### Security

- secrets absent from frontend/log/evidence;
- tenant isolation tested;
- all demo/payment environment assertions active.

---

## 19. Final engineering checklist before video lock

- [ ] tag known-good commit;
- [ ] freeze migrations;
- [ ] rotate any credentials exposed during development;
- [ ] verify sandbox-only settings;
- [ ] run hero scenario 10 times;
- [ ] run no-fault scenario 10 times;
- [ ] check dashboard sample labels;
- [ ] clear personal browser data;
- [ ] verify incognito public demo;
- [ ] save backup run replay;
- [ ] export schema diagram and architecture diagram for README/submission;
- [ ] verify all public links;
- [ ] run secret scanner one final time.
