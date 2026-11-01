# COMRDY

**Tagline:** Commerce Ready: test whether an AI checkout buys what the customer actually asked for.

Prepared submission copy for executable source `03c145157878602971c7f4bbd30555c512fade35`. The measured Sandbox results below are recorded; public evidence is deployed; the final film and authenticated Devpost submission remain pending. Do not submit the local rehearsal as provider evidence.

## Inspiration

A successful payment tells us that money moved. It does not tell us that a shopping agent bought the right product, kept the delivered budget, or respected a customer's refusal of substitutions.

We wanted engineers to see that difference before shipping an AI checkout flow. COMRDY turns a customer's instruction into a testable contract and shows exactly where a checkout stops satisfying it.

## What it does

The demo follows one purchase at our fictional Northpath Supply merchant: one blue Ocean Shell, size M, for no more than $160 delivered, with no substitutions or subscriptions. The item, shipping and tax total $148.

An AI compiler proposes constraints with their source phrases. The buyer reviews and confirms them. A constrained shopping agent prepares the cart; the buyer approves through the normal PayPal Sandbox flow. COMRDY then injects a disclosed fault between authorization and the final capture check: the size changes at the same price, or shipping pushes the total to $173.

Intent Lineage identifies the first divergence. A deterministic gate blocks capture if any hard requirement fails or lacks evidence. The application requests a void and retrieves its status. One bounded recovery restores the requested item under the unchanged contract, requires fresh approval, and verifies again before capture.

A separate readiness bench runs 12 reproducible synthetic cases through the same invariant engine: budget boundaries, missing evidence, quantity/currency drift, stale revisions and authorization mismatches. Engineers can compose a bounded case, inspect its exact failed rules, and export JSON or CSV. The judge workbench provides a guided tour and searchable saved evidence using AG Grid Community. A downloadable Postman collection reproduces HTTP boundary checks. These checks make no AI or payment calls.

Engineers can inspect the contract, merchant observations, decision and redacted provider resources; compare the original and recovered attempts; and replay saved events without invoking a payment.

## How we built it

TypeScript and Next.js serve the test lab and controlled storefront. OpenAI Responses API handles structured compilation and constrained browser actions; the model and prompt version are recorded. KERNEL isolates the shopping browser. A pure invariant engine makes the payment decision, separate from the model.

PayPal Orders v2 and Payments v2 provide Sandbox order creation, buyer approval, authorization, exact-amount capture, void and readback. Operation identities are persisted before network requests. PostgreSQL transactions and leases coordinate the web process and persistent worker. Retries reuse the original economic identity; ambiguous outcomes are reconciled before another action. Verified webhooks trigger readback rather than authorizing a new payment.

Vercel hosts the web/API deployment; a persistent Render worker shares managed PostgreSQL and retains private browser evidence. The qualified runs executed clean source `03c145157878602971c7f4bbd30555c512fade35`. The deployed evidence-package revision `d9a3d4c` has the same executable source digest; run evidence retains its actual execution revision.

## Challenges we ran into

The hardest part was handling the gap between authorization and capture. Merchant state can change while the payment resource remains valid. We therefore check both before authorization and immediately before capture, bind the decision to the checkout revision and provider resources, and atomically claim the capture command.

Network uncertainty was another challenge. A timeout cannot tell us whether a provider completed an operation. The application preserves that uncertainty and retrieves the provider state; a denied test is not treated as a released authorization until void is confirmed.

## Accomplishments

We built a complete, inspectable workflow around two deliberate merchant faults, one constrained recovery, and a clear distinction between test verdict and payment state. The interface keeps the first divergence visible on phones as well as desktop.

On that frozen source, provider retrieval qualified the latest three original attempts in each scenario: **3/3 valid captures, 3/3 variant denials with confirmed voids, and 3/3 shipping denials with confirmed voids — 9/9 total**. One separately recorded recovery preserved the original confirmed contract, used a fresh order, authorization and buyer approval, and completed a $148 capture bound to the correct size-M merchant order.

The live compiler corpus met its automated expectations in **20/20 cases: 8/8 executable preservation cases and 12/12 expected clarifications**. Assistant inspection covered every raw and final output. One blocked subscription request marks the requested blue/medium variant as soft; it remains blocked for unsupported subscription and recurrence. The project owner reviewed and approved the complete 20-output packet with this limitation disclosed. These finite checks are not a claim of universal accuracy or perfect semantic preservation.

Five concurrent duplicate approval requests against an already completed run preserved one capture and one merchant order (**5/5**). A worker restart while another run awaited buyer approval resumed successfully. This restart did not exercise a lost provider response or an interruption during capture. A verified authorization-voided webhook arrived before authorization-created; the final state remained VOIDED with no capture. An unsigned forged webhook was rejected with HTTP 400. Live lost-response and duplicate-webhook delivery tests remain unperformed; their local mocks do not fill that gap.

## What we learned

Payment success and purchase correctness are different assertions. An LLM can help translate and execute intent, but a deterministic boundary is useful when deciding whether to capture money. Evidence becomes much more useful when it explains a divergence instead of only reporting a green or red result.

## What's next

After this controlled demonstration, we would expand the case corpus and evaluate additional merchant integrations. General autonomous recovery, arbitrary storefronts, subscriptions, refunds and multi-tenant operation are outside this release.

## Original work and disclosures

Implementation began November 1, 2026. The earlier blueprint is design history, not a pre-existing functioning service. COMRDY does not claim to invent intent-based payment authorization; its contribution is this testing workflow, controlled fault reproduction and inspectable PayPal integration.

Northpath Supply and Ocean Shell are fictional. All payments are Sandbox payments. No real customer savings, production deployment adoption or general repair capability is claimed. Codex assisted implementation and production; runtime AI and synthetic film narration are disclosed in the app/film and `ATTRIBUTION.md`.

## Validation scope and evidence (November 1)

The earlier automated suite passed 103/103 at source `7df`, including hosted PostgreSQL checks with financial operations mocked. The final `03c1451` UI passed type checking and a production build; the full earlier suite was not rerun at that final revision. The readiness bench previously matched 12/12 synthetic expectations: 2 ALLOW, 8 DENY and 2 REVIEW. These checks remain separate from the actual frozen-source Sandbox samples above.

Local qualification records are `artifacts/payment-qualification.json`, `artifacts/intent-qualification.json`, `artifacts/sandbox-recovery-03c1451.json` and `artifacts/live-duplicate-approval.json`. The recovery is `05d9de46-0882-4c64-bfa6-f2b48c43a7bb`, parent `eb1c1706-7093-4ce8-a3dd-a0c612d2b4b7`. The restart observation belongs to run `f6eee69b-2dd5-4314-85c8-2773cf468b99`.

The reviewed public receipt destinations are [qualification summary](https://comrdy.vercel.app/release/qualification.json), [protected evidence](https://comrdy.vercel.app/release/evidence.json) and [isolated control](https://comrdy.vercel.app/release/control.json). All three public receipt links were verified accessible without an operator session. The isolated control is separate from protected payment runs and makes no shopper or shipment claim.

## Submission links and remaining account steps

- Hosted demo: [COMRDY](https://comrdy.vercel.app).
- Source: [public MIT repository](https://github.com/AmirmLotfy/comrdy), qualified executable revision `03c145157878602971c7f4bbd30555c512fade35`.
- Video URL: **pending** final authentic 165-second film, human review, public YouTube upload and signed-out verification.
- Judge instructions: inspect the ten published saved runs without making payments. Fresh Sandbox runs require operator access and ordinary buyer approval; credentials are never included in public copy.
- Team/personal eligibility and sponsor declarations remain the user's accurate declarations; this draft does not create or change them.
- Submission timestamp: **pending** authenticated finalization of the existing Devpost entry. Retain submitted URLs, video/gallery readback and authenticated status in a completed copy of `submission/receipt.template.json`; a project page is not proof of submission.
