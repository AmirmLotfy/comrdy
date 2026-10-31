# COMRDY ground-up implementation audit

Reviewed 2026-11-01 against `AGENTS.md`, `CURRENT_HANDOFF.md`, and `docs/IMPLEMENTATION_SCOPE.md`. Source baseline: `cda093d4ab534ee2effd0c5c51c846f056da1b4d`. This report owns no application changes. No builds, tests, provider calls, credentials, or paid resources were used by this audit. Other ongoing design work was left untouched.

## Completion assessment

The focused application is substantially implemented: editable/confirmed contracts; deterministic hard-constraint and evidence checks; a bounded AI browser shopper; controlled merchant state; Sandbox authorization/capture/void adapters; durable commands and worker reconciliation; one unchanged-contract recovery; stored evidence; and a prepared video pipeline. The broader historical SaaS blueprint is explicitly out of scope.

It is not yet a fully qualified, delivered project. There are source-level correctness and evidence gaps below, alongside the already disclosed live-provider, deployment, media and submission work. Earlier local results are recorded in `docs/LOCAL_VALIDATION.md` (31/31 tests, production build and browser checks); those checks were not rerun for this review and do not cover the identified paths or establish live acceptance.

## Prioritized findings

Follow-up source corrections are recorded below. They do not change the live qualification denominators. Focused qualification tests have been added but are awaiting the coordinator's single verification run.

### P1 — Definitive settlement errors can abandon an active authorization

**Sources:** `src/server/sandbox.ts:253–268`, `:315–332`, `:1036–1044`.

`command()` maps any definitive PayPal error to `infra_failed` and replaces the last payment status with `PROVIDER_ERROR`, including errors from capture and void. The worker only resumes `reconciling` or webhook-pending runs, while the new-run guard does not block `infra_failed`. For example, after authorization succeeds and the variant gate denies capture, a non-ambiguous void failure can leave a CREATED authorization, stop automatic readback, and allow another run. A definitively rejected capture has the same unresolved-authorization risk. The current tests cover uncertain capture and successful void, but not this definitive financial-error path.

**Required correction:** preserve the observed authorization status and explicit unresolved settlement state; retrieve provider truth and either safely void or remain inconclusive. Prevent a new economic attempt while the prior authorization is unresolved. Add focused mocked cases for definitive capture and void errors and verify no new run can start until reconciliation proves a safe terminal outcome.

**Coordinator follow-up:** source corrections now preserve provider truth after definitive settlement errors, block new runs with unresolved authorizations regardless of display status, and safely reconcile/void after rejected capture. The coordinator reports passing focused mocked regressions; integrated validation and live-provider qualification remain separate pending gates.

### P1 — Ungated control does not establish the wrong-size merchant order claimed by the film

**Sources:** `scripts/ungated-control.ts:65–82`, `:123–146`; `submission/video/narration.json`, first scene.

The control creates a bare PayPal amount, then assigns `createCanonicalState("variant")` to a local evidence record before capture. It does not operate the Northpath cart or create a merchant order. A successful run therefore proves a real Sandbox capture alongside a deliberately changed local fixture. It does not yet prove the script's claim that “the order contains small,” or supply a comparable ungated merchant-order record.

**Required correction:** persist an isolated real controlled-merchant checkout and resulting order linked to the capture, with the disclosed M-to-S change, or narrow every product/video claim to the evidence actually produced. Keep the control isolated and operator-only. Validate its order/capture binding before using it as the film's opening proof.

**Follow-up:** the control now identifies its local fixture limitation in stored evidence, and only reports payment-control completion after exact provider order/authorization/capture readback checks. The narration, storyboard and production instructions no longer claim that the control created a wrong-size merchant order. Real ungated merchant-order execution remains unimplemented and is no longer claimed by this film plan.

### P2 — The compiler qualification score conflates useful compilation with safe clarification

**Source:** `scripts/qualify-intent.ts:20–42`.

Every nonempty `needsResolution` list currently sets `passed=true`, including clear corpus requests that have explicit executable expectations. A compiler that asks for clarification on every request can score 20/20. Executable candidates are checked for size, cap and three prohibitions/count rules, but not the Ocean Shell identity or blue color. Most operators are also left unspecified by `has()`, so an incorrect operator with the same value can pass the score.

**Required correction:** report executable success and expected clarification separately. For executable fixtures, require no unresolved fields and verify all required product/color/size/quantity/cap/prohibition rules, including operators. If an explicit safe-clarification rate remains useful, report that as a separate denominator rather than compiled-contract accuracy. Add small deterministic evaluator fixtures demonstrating that all-clarification, missing-color, wrong-product and wrong-operator outputs cannot claim executable success.

**Follow-up:** `scripts/lib/qualification.ts` now checks executable outputs separately from expected clarifications, verifies the required identity/color/size/count/cap/prohibition constraints and allowed operators, and checks candidate semantic validity. `scripts/qualify-intent.ts` reports both denominators and unexpected clarifications. Its report explicitly requires human review of clarification relevance and unsupported additional constraints. `tests/qualification.test.ts` covers the prior false-pass cases; execution is pending coordinator validation.

### P2 — Payment qualification can pass without proving the retrieved capture belongs to the retrieved order

**Source:** `scripts/qualify-payments.ts:37–53`.

The script checks that the order contains the authorization and contains exactly one distinct capture ID, but does not check that this ID equals the separately retrieved `run.payment.captureId`. It also does not verify capture order/authorization linkage, authorization amount/status, or the expected contract/merchant variant in the successful scenario. A mismatched stored capture of the same amount can therefore satisfy the current assertions. The runtime has stronger checks than this release verifier, but the verifier is supposed to independently establish actual provider truth.

**Required correction:** require the exact capture ID in the retrieved order; verify available capture-to-order/authorization links and exact authorization/order amounts; inspect the merchant order's expected size and contract binding. Preserve retrieved order evidence in the report. Separately record consecutive-run selection and failures rather than treating nine manually selected IDs as proof of consecutive qualification.

**Follow-up:** the shared qualification helper requires the retrieved capture to be the order's sole capture, exact amounts, final COMPLETED capture, CAPTURED authorization, and available related-ID/payee bindings. The release script also checks the merchant order case, capture, size and amount, and the sealed contract. Reports retain redacted order readback and explicitly state that nine selected IDs do not establish consecutive execution. Focused mismatch tests are added; live provider qualification is still pending.

### P2 — A late verified webhook cannot recover a run after the readback budget is exhausted

**Sources:** `src/server/sandbox.ts:1036–1044`, `:1089–1099`, `:1193–1198`.

Once `reconcileAttempts` reaches 12, both periodic reconciliation and a newly verified webhook are excluded by the same `<12` predicate. A PENDING capture that later becomes COMPLETED can remain inconclusive indefinitely even after its completion webhook is accepted. The report correctly retains uncertainty, but no supported operator readback command is provided by the current scripts/API to finish that state.

**Required correction:** distinguish bounded automatic financial replay from read-only provider reconciliation. Permit a fresh verified terminal webhook, or an explicit operator command, to trigger bounded readback without initiating capture/void or resetting financial retries. Test exhaustion followed by a valid provider completion notification.

**Coordinator follow-up:** late verified webhooks can now trigger read-only provider reconciliation after periodic retries are exhausted, without creating a new financial action. A focused mocked regression passes according to the coordinator; this has not yet been exercised against PayPal.

### P2 — Export-time HEAD is not the source revision that executed a run

**Sources:** `src/server/sandbox.ts:356–385`; `scripts/export-evidence.ts:24–30`; `scripts/qualify-payments.ts:83–90`.

Runs do not persist their source/deployment revision. Evidence export attaches the current checkout HEAD, even if the run happened before code changes or from a dirty checkout; the qualification report also omits execution provenance. The release requirement is qualification on the exact release commit, so this metadata cannot establish that requirement by itself.

**Required correction:** persist an immutable build/deployment revision on run creation and compiler execution, carry it through qualification/export, and reject mixed or unqualified revisions when preparing a release bundle. Until then, maintain an explicit external release receipt and label the export field as export revision only.

**Follow-up:** payment qualification now rejects absent/non-40-character execution revisions, dirty execution builds and mixed run revisions before any provider readback, and includes execution provenance in the report. The coordinator added immutable build receipts, Next/worker build metadata, and export checks that separate execution provenance from export revision. Integrated validation must still be recorded before release.

## Evidence and delivery still outstanding

The current handoff reports live compiler corpus **0/20** and live payment scenarios **0/9**. Live recovery/retry/restart/webhook cases, KERNEL account/browser entitlement, the isolated control, and provider-confirmed settlement remain unqualified. No credential or provider state was checked in this audit.

Hosting, source publication and long-lived evidence availability remain pending. `scripts/render-video.ts` and the editable 165-second Remotion composition exist, but actual seven-scene footage, reviewed narration/captions, the complete rendered master, public video and authenticated Devpost finalization do not. `qualified: true` is an operator declaration in the manifest, not independent verification of the footage's claims. The recorded Remotion/Zod compatibility warning still requires checking on the full final render.

The appropriate next milestone is to correct the bounded source/evidence defects above and locally verify those paths, then obtain private account configuration and run the release checklist on a pinned revision. Live payment approval, exact paid retention cost within the $100 cap, and submission declarations remain separate external gates.

## Coordinator verification after corrections

The corrected implementation passes 40/40 local tests, including real local PostgreSQL concurrency and the added settlement, late-webhook, qualification and serverless-storage regressions. The production build passes. The expanded Chrome walkthrough passes compile/confirm/denial/recovery, owner isolation, read-only playback, all product surfaces at 320/390/768/1440, modal focus wrapping/return, reduced motion, no-JavaScript homepage content and a complete touch run. The 1200×630 Open Graph asset and finite SVG replay are verified. These are local findings, not provider or hosted acceptance.

The final source correction also restores the persisted ALLOW verdict after late verified capture completion, records every worker revision, and checks production worker source against its clean build receipt. Export and qualification reject mixed/dirty web-worker revisions.

The ungated payment control remains intentionally narrower than the original film concept: a real Sandbox capture beside a deliberately changed local fixture, with no merchant order. Its script and captions now state that limit. It has not been executed against PayPal. A stronger wrong-size merchant-order control remains future work if that stronger opening claim is desired.

Vercel account inspection and project creation/settings are verified via CLI; no deployment, database, worker or paid resource was provisioned. The PayPal Sandbox dashboard is accessible and shows a Default Application; no dedicated COMRDY app or credentials were created/revealed. `PAYPAL_REVIEW.md` records the current official documentation review.
