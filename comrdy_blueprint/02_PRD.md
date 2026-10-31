# COMRDY Product Requirements Document

## 1. Product statement

COMRDY is a web application and developer platform that verifies AI-driven commerce transactions against deterministic customer intent before and after payment.

The product turns a buyer mandate into a structured Intent Contract, runs one or more shopping agents, observes the commerce state at each step, authorizes payment in PayPal Sandbox, evaluates invariants, and either allows capture or blocks the transaction with evidence.

## 2. Problem

Agentic commerce introduces a failure mode that conventional analytics, payment processors, and web QA do not reliably detect:

**the journey can be technically successful while the economic outcome is wrong.**

A model can select the wrong variant, exceed budget, accept an unauthorized substitution, convert a one-time purchase into a subscription, retry a payment twice, or lose a discount between cart and authorization. The payment layer can report success even though the original user mandate was violated.

## 3. Goals

### G1 - Verify intent fidelity

Create a deterministic source of truth for the customer's authorized constraints and continuously compare observed state against it.

### G2 - Exercise real payment lifecycle behavior

Use PayPal Sandbox authorization and capture so the product proves value at the exact boundary where money would move.

### G3 - Detect false success

Separate technical completion from correct economic completion.

### G4 - Produce replayable evidence

Every failed run must be reproducible and inspectable by engineering teams.

### G5 - Enable regression testing

A fixed mission library must run on demand, on schedule, and in CI after changes.

### G6 - Stay protocol-agnostic

The contract/assertion layer must not depend on one browser agent, model, store platform, or commerce protocol.

## 4. Non-goals for hackathon MVP

- Production use with real customer funds.
- Acting as a fraud/AML system.
- Replacing PayPal risk controls.
- Full Shopify App Store production integration.
- Full support for ACP, UCP, AP2, or Store Sync partner-only flows.
- Agent discovery/readiness SEO scanning.
- Generic browser testing outside commerce.
- A consumer shopping assistant.
- Cross-merchant benchmarking based on customer data.

## 5. Personas

### 5.1 Maya - Payments / Commerce Engineer

Needs to prove agent transactions are safe before enabling new purchase surfaces.

Success looks like:
- reproducible failures;
- exact API/state evidence;
- deterministic pass/fail;
- CI integration;
- idempotent payment handling.

### 5.2 Jordan - QA / SDET Lead

Needs to turn ambiguous natural-language customer tasks into stable regression tests.

Success looks like:
- parameterized mission library;
- seeded chaos;
- pass/fail rules;
- replays;
- exportable defects.

### 5.3 Priya - Head of Ecommerce

Needs an executive answer to whether agentic checkout is reliable.

Success looks like:
- Agent Transaction Reliability;
- False Success Rate;
- highest-risk failure classes;
- trend after fixes;
- prevented invalid value.

### 5.4 Sam - AI Platform Engineer

Needs to compare model/agent/protocol configurations without conflating model quality with store behavior.

Success looks like:
- same intent contract across configurations;
- side-by-side result matrix;
- trajectory and tool-call evidence;
- replay with one variable changed.

## 6. Primary user journeys

### J1 - First successful audit

1. User creates workspace.
2. User selects `Demo Store` or adds a staging target.
3. User connects PayPal Sandbox credentials.
4. COMRDY verifies credentials without displaying secrets.
5. User chooses the starter mission pack.
6. COMRDY compiles missions into Intent Contracts.
7. User reviews one contract and runs suite.
8. Browser agents execute.
9. COMRDY records state changes.
10. A valid mission is authorized and captured.
11. Invalid missions are authorized but blocked before capture.
12. Results page shows reliability and false-success findings.
13. User opens one finding and replays it.

### J2 - Create a custom mission

1. User clicks `New test`.
2. Enters natural-language buyer mandate.
3. Selects environment and agent profile.
4. COMRDY compiles deterministic constraints.
5. User edits/locks constraints if desired.
6. User chooses chaos rules or no chaos.
7. Runs one mission.
8. Sees trajectory and payment decision.

### J3 - Investigate a false success

1. User filters runs to `False success`.
2. Opens transaction.
3. Sees Intent Lineage from mandate to payment.
4. Violated invariant is pinned at the first drift point.
5. User opens raw evidence / snapshots.
6. Clicks `Replay`.
7. Changes one factor: model, path, chaos, or prompt variant.
8. Compares original vs replay.
9. Saves finding to regression suite.

### J4 - CI regression

1. Engineer creates API key.
2. CI invokes suite.
3. COMRDY runs selected mission set.
4. Results are returned synchronously as job accepted, then polled/streamed.
5. Build passes only if reliability threshold and severity policy are met.
6. Failed build links directly to evidence.

## 7. Functional requirements

### 7.1 Authentication and workspace

P0:
- Email or OAuth login.
- Create workspace.
- Invite members by email later; single-member works for hackathon.
- Roles: Owner, Admin, Member, Viewer.
- Workspace-scoped data isolation.

Acceptance:
- User cannot access another workspace by guessing IDs.
- All API routes enforce workspace authorization.

### 7.2 Merchant targets

P0:
- Create a target with name, base URL, environment (`demo`, `staging`, `sandbox`).
- Demo target is preconfigured.
- Health check verifies reachability.
- Target stores capability metadata: browser, structured tools, checkout, payment adapter.

P1:
- Authenticated staging target credentials.
- Environment headers/cookies.
- Shopify/custom adapters.

### 7.3 PayPal integration

P0:
- Connect Sandbox client ID and secret.
- Encrypt secret at rest.
- Validate via OAuth token exchange.
- Create Orders v2 orders with `intent=AUTHORIZE`.
- Authorize after payer approval/test fixture.
- Store order and authorization IDs.
- Verify transaction.
- Capture the authorization only when policy allows.
- Receive and verify webhooks.
- Issue sandbox refund in post-purchase test.

P1:
- Separate merchant integrations per project.
- Braintree adapter.

### 7.4 Mission library

P0:
- Create, edit, archive mission.
- Natural language mandate.
- Tags.
- Expected path/merchant.
- Mission variables for size, color, quantity, max price.
- Clone mission.

P1:
- CSV/JSON import.
- Generated semantic variants.
- Scheduled mission sets.

### 7.5 Intent Contract Compiler

P0:
- Parse natural language mandate to versioned JSON contract.
- Contract schema validation.
- Distinguish hard constraints from preferences.
- Preserve original text and compiler version.
- Human-readable preview.
- Manual edit and lock.

Required hard-constraint types:
- product identity/category;
- variant attributes;
- quantity;
- item price cap;
- total price cap;
- currency;
- destination/eligibility;
- delivery deadline if supplied;
- substitution allowed/forbidden;
- subscription allowed/forbidden;
- payment frequency;
- merchant allow/deny if relevant.

Acceptance:
- Compiler output must be valid JSON against schema.
- Every hard constraint receives a stable invariant ID.
- Financial gate consumes only validated structured constraints.

### 7.6 Agent profiles

P0:
- Name.
- Runner type (`browser`).
- Model/provider metadata.
- Prompt/policy version.
- Browser/tool configuration.

P1:
- Structured tool / WebMCP adapter.
- ACP/UCP adapter where accessible.
- Custom agent HTTP adapter.

### 7.7 Test suites

P0:
- Name, description, target, missions, agent profile, chaos profile.
- Run now.
- Duplicate.
- Pass/fail policy.

Policy inputs:
- minimum ATR;
- maximum critical violations;
- maximum false success rate;
- whether payment capture is enabled for valid sandbox missions.

### 7.8 Run orchestration

P0:
- Queue run.
- Fan out mission cases.
- Each case has isolated browser session.
- Stream run progress to UI.
- Persist trajectory events.
- Retry infrastructure failures with bounded retry count.
- Do not retry a financial action without idempotency protection.

Run states:
`QUEUED -> COMPILING -> PREPARING -> EXECUTING -> AUTHORIZED -> VERIFYING -> CAPTURED|BLOCKED -> POST_PURCHASE -> COMPLETED|FAILED`

### 7.9 Snapshot and state extraction

P0:
At significant checkpoints capture normalized commerce state:
- selected product;
- variant;
- unit price;
- quantity;
- discount;
- subtotal;
- shipping;
- tax;
- total;
- currency;
- subscription state;
- inventory/availability;
- destination;
- order identifier;
- payment identifiers.

Checkpoint types:
- `AGENT_SELECTED`
- `CART_CREATED`
- `CART_UPDATED`
- `CHECKOUT_READY`
- `PAYMENT_AUTHORIZED`
- `PAYMENT_CAPTURED`
- `ORDER_CREATED`
- `REFUND_COMPLETED`

### 7.10 Invariant engine

P0:
- Evaluate all active invariants against each snapshot.
- Store PASS/FAIL/UNKNOWN.
- Identify earliest drift point.
- Calculate severity.
- Return gate decision.

Decision rules:
- `ALLOW`: all hard invariants pass and required evidence is present.
- `REVIEW`: no invariant failed, but critical evidence is unknown/incomplete.
- `DENY`: one or more hard invariants fail.

P0 hackathon policy:
- `REVIEW` behaves as block before capture.

### 7.11 Commerce Chaos

P0:
Controlled mutation rules:
- price increase;
- shipping increase;
- discount removal;
- inventory disappearance;
- variant mutation;
- quantity mutation;
- currency mutation;
- transient API timeout / retry;
- duplicate action attempt.

Requirements:
- seeded randomness;
- explicit activation in test environment;
- never active for arbitrary production targets;
- mutation event appears in evidence timeline.

### 7.12 PayPal capture gate

P0:
- After authorization, COMRDY retrieves normalized expected/actual states.
- Evaluates hard invariants.
- `ALLOW` triggers capture using authorization ID and idempotency key.
- `DENY` skips capture and records block reason.
- UI makes authorization vs capture visually distinct.

### 7.13 Evidence Chain / Transaction Flight Recorder

P0:
For each case store:
- original mission;
- contract;
- agent profile/version;
- screenshots;
- page/tool events;
- state snapshots;
- chaos events;
- invariant evaluations;
- PayPal request/response metadata with secrets redacted;
- webhook events;
- decision;
- capture/refund outcome.

### 7.14 Intent Lineage

P0:
Visualize major attributes as columns/rows through checkpoints.

Example attributes:
- SKU;
- size;
- color;
- quantity;
- total;
- currency;
- subscription.

The first changed/invalid value is visually emphasized and linked to raw evidence.

### 7.15 False Success classification

P0:
Case categories:
- `PASS`
- `HARD_FAILURE`
- `FALSE_SUCCESS_BLOCKED`
- `FALSE_SUCCESS_CAPTURED` (reserved; sandbox/testing only)
- `INDETERMINATE`
- `INFRA_FAILURE`

### 7.16 Replay

P0:
- Replay one failed case.
- Preserve original contract and seed by default.
- User can change one factor.
- Side-by-side comparison.

Allowed changed factors in MVP:
- chaos on/off;
- agent prompt version;
- model configuration;
- execution path if available.

### 7.17 Remediation

P1:
- Generate root-cause hypothesis.
- Recommend concrete fix.
- Link to evidence.
- Mark recommendation accepted/rejected.
- Re-run after fix.

LLM output is advisory only.

### 7.18 Dashboard and reporting

P0:
Workspace overview:
- ATR;
- FSR;
- HFR;
- prevented invalid value;
- runs over time;
- top violation classes;
- latest runs.

P0:
Run detail:
- progress/status;
- mission matrix;
- pass/fail counts;
- agent/payment outcomes;
- filterable table.

P0:
Transaction detail:
- Intent Lineage;
- checkpoint timeline;
- invariant list;
- PayPal authorization/capture state;
- evidence artifacts;
- replay CTA.

### 7.19 API keys and CI

P1 for product, P0 if sponsor/demo time permits:
- Create/revoke scoped API key.
- `POST /v1/runs`.
- `GET /v1/runs/:id`.
- machine-readable summary.
- exit policy documented for CI helper.

### 7.20 Alerts

P2:
- Email, Slack/webhook on critical false success.
- scheduled regression summary.

## 8. Non-functional requirements

### Reliability
- No duplicate capture caused by COMRDY retry behavior.
- All financial writes use idempotency strategy.
- Run events are append-only.
- Worker crashes can resume from durable state.

### Performance
- Product dashboard initial load target: <2.5 s on broadband for typical workspace.
- Table interactions should feel immediate for 10k rows using server pagination/virtualization.
- Stream run status rather than polling every second from every client.

### Security
- Secrets encrypted at rest and never returned after creation.
- Webhook verification.
- PII minimization.
- Audit log for credential, policy, gate, and permission changes.
- Strict tenant isolation.
- No live payment mode in hackathon deployment.

### Accessibility
- WCAG 2.2 AA target.
- Keyboard-operable tables, dialogs, filters, and timelines.
- Color is never the only failure signal.
- All status labels include text/icon.

### Auditability
- Every decision references exact contract version and snapshot hashes.
- Replays never overwrite original evidence.

## 9. Success metrics

### Hackathon success
- Judges understand the problem in <15 seconds.
- At least one valid mission captures in PayPal Sandbox.
- At least two seeded false successes are blocked.
- One replay demonstrates root-cause isolation.
- Demo completes reliably from reset state.

### Product activation
- User gets first completed 10-mission run within 15 minutes of signup.
- At least 80% of activated users open one evidence detail.

### Product value
- Weekly regression suites run per active workspace.
- Percentage of findings converted into permanent regression cases.
- Reduction in FSR after remediation.
- Prevented invalid value over time.

## 10. Product language

Use precise operational copy.

Preferred:
- Transaction Reliability
- False Success
- Capture blocked
- Authority drift
- Selection drift
- Value drift
- Evidence incomplete
- Replay
- Invariant failed

Avoid:
- AI magic
- smart insights
- supercharge
- revolutionary
- optimize your commerce
- agent readiness score as the product's main metric
