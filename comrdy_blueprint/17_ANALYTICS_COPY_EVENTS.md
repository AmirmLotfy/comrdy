# COMRDY Product Analytics, Status Language & UI Copy

Version: 0.1

---

## 1. Analytics principles

- instrument decisions and failure points, not vanity clicks;
- never send secrets, raw browser content, full addresses, or payment credentials to analytics;
- keep product analytics separate from operational tracing;
- use stable event names and typed properties;
- define metric denominator explicitly.

---

## 2. Activation funnel

```text
visit_marketing
→ signup_started
→ workspace_created
→ project_created
→ target_connected
→ payment_sandbox_connected
→ mission_created
→ first_run_started
→ first_run_completed
→ first_violation_inspected
→ second_run_started
```

Primary activation:

> User completes at least one run and opens one case/evidence view within the first session/day.

Strong activation:

> User runs the same suite a second time or adds it to CI within seven days.

---

## 3. Event taxonomy

### Marketing

- `marketing_cta_clicked`
  - `cta`: demo | source | docs | signup
  - `placement`: hero | proof | footer
- `demo_opened`
- `docs_opened`

### Onboarding

- `workspace_created`
- `project_created`
- `integration_started`
- `integration_connected`
- `target_created`
- `quickstart_step_completed`

### Contracts and missions

- `mission_created`
- `contract_compile_started`
- `contract_compile_completed`
- `contract_compile_failed`
- `contract_constraint_edited`
- `contract_confirmed`

### Runs

- `run_started`
- `run_completed`
- `run_canceled`
- `case_started`
- `case_completed`
- `case_infra_failed`
- `violation_detected`
- `false_success_detected`
- `capture_allowed`
- `capture_blocked`
- `replay_started`
- `replay_completed`

### Evidence

- `lineage_cell_opened`
- `evidence_artifact_opened`
- `raw_trace_opened`
- `report_exported`
- `share_link_created`

### Chaos

- `chaos_profile_created`
- `chaos_rule_enabled`
- `chaos_run_started`

### DevEx

- `api_key_created`
- `api_key_revoked`
- `ci_token_created`
- `cli_run_reported`

---

## 4. Core product metrics

### Agent Transaction Reliability (ATR)

```text
correct economic outcomes / valid cases
```

Exclude infrastructure failures from denominator unless explicitly reporting service reliability.

### False Success Rate (FSR)

```text
technically completed cases with one or more hard economic violations
/
technically completed cases
```

### Hard Failure Rate

```text
cases that could not reach a valid commerce outcome due to agent/merchant behavior
/
valid cases
```

### Prevented Invalid Value (PIV)

Sum of authorizations/captures COMRDY blocked because of hard invariant violations. Report only values that can be tied to actual provider attempt/evidence.

### Mean Time to First Divergence

Time/checkpoint from mission start to first observed state that violates a contract.

### Reproduction Rate

Percentage of failures that recur under same seed/environment version where determinism is expected.

---

## 5. Product status vocabulary

Avoid vague words like `Good`, `Bad`, `Risky`.

### Run

- Queued
- Starting
- Running
- Evaluating
- Reconciling payment
- Completed
- Completed with violations
- Infrastructure failed
- Canceled

### Case verdict

- **Pass** — required invariants held and expected economic outcome completed.
- **Blocked correctly** — an invalid economic action was prevented before completion.
- **False success prevented** — transaction technically progressed but violated intent; COMRDY prevented final economic completion.
- **False success** — invalid economic outcome completed in a non-gating/test observation mode.
- **Hard failure** — agent/merchant failed to complete a valid mission.
- **Inconclusive** — evidence insufficient to determine correctness.
- **Infrastructure failure** — COMRDY/test infrastructure failed; do not score as merchant/agent reliability.

### Payment

Use provider truth:

- Order created
- Approval required
- Approved
- Authorized
- Capture pending
- Captured
- Capture blocked
- Voided
- Refund pending
- Refunded
- Refund mismatch

Never label authorization as `Paid`.

---

## 6. Violation copy

### Selection drift

Title: `Selected variant no longer matches the mandate`  
Detail: `Expected size M. Cart contains size S. First divergence: Cart.`

### Value drift

Title: `Final total exceeds the authorized limit`  
Detail: `Maximum allowed: $160.00. Authorization requested: $168.00.`

### Quantity drift

Title: `Quantity changed from the authorized amount`  
Detail: `Expected 1 item. Checkout contains 2.`

### Authority drift

Title: `Transaction contains an unauthorized recurring commitment`  
Detail: `Mandate allows a one-time purchase only. Checkout added a recurring subscription.`

### Retry drift

Title: `A retry attempted a second economic action`  
Detail: `The same capture intent was submitted twice. The duplicate was blocked by idempotency.`

### Refund drift

Title: `Refund does not match the expected outcome`  
Detail: `Expected full refund: $139.00. Observed refund: $119.00.`

---

## 7. Buttons and CTAs

Use verb + object.

### Product

- `Create mission`
- `Run suite`
- `Replay case`
- `Open evidence`
- `Compare runs`
- `Connect PayPal Sandbox`
- `Create API key`
- `Reset demo`
- `Export report`
- `Cancel run`

Avoid:

- `Submit`
- `Proceed`
- `Go`
- `Fix with AI`
- `Magic fix`

### Marketing

Primary: `Run the demo`  
Secondary: `View source`

Do not use `Get started` as the only CTA when a more concrete action is available.

---

## 8. Empty states

### Runs

**No runs yet**  
Run a mission against a merchant target to create your first transaction trace.  
CTA: `Run a mission`

### Violations

**No violations in this view**  
No evaluated cases match the current filters.  
CTA: `Clear filters`

If the project truly has zero violations after runs:

**No intent violations found**  
The evaluated cases stayed inside their contracts. Infrastructure failures are reported separately.

### Integrations

**No payment provider connected**  
Connect PayPal Sandbox to test authorization, capture, and refund behavior without real money.  
CTA: `Connect PayPal Sandbox`

---

## 9. Error copy

### Browser launch

`Browser session couldn't start. No commerce action was taken. Retry the case or inspect worker status.`

### Payment authorization

`PayPal authorization failed before COMRDY could evaluate capture. This case is not counted as a false success.`

### Capture blocked

Not an error toast. Use a decision confirmation:

`Capture blocked · 2 hard invariants failed.`

### Webhook reconciliation

`Payment state is still reconciling. COMRDY will keep this case pending until the provider state is confirmed or the reconciliation timeout expires.`

---

## 10. Notifications

Only notify on actionable state.

Useful:

- suite completed with new false successes;
- reliability regression exceeds configured threshold;
- integration disconnected;
- production runtime gate degraded;
- API key expiring if keys have expiry;
- protocol/version monitor detects a breaking regression.

Do not notify:

- every run completed;
- every agent action;
- routine PASS cases unless subscribed.

---

## 11. Dashboard headings

Correct operational language:

- `Transaction reliability`
- `False success rate`
- `Cases by verdict`
- `Violations by type`
- `First divergence`
- `Payment outcomes`
- `Recent runs`

Avoid:

- `Your AI commerce health`
- `Insights that matter`
- `Unlock reliability`
- `Your agents at a glance`

---

## 12. Marketing copy rules

Use scenes and proof.

Bad:

> Build trust in the future of agentic commerce with our powerful platform.

COMRDY:

> The agent requested size M. Checkout contained size S. PayPal authorized the payment. COMRDY blocked capture.

Every marketing section should contain at least one concrete state, number, invariant, or action.
