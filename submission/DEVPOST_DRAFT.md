# COMRDY

**Tagline:** A transaction test lab for engineers building AI checkout.

This copy is prepared for the qualified release. Replace the marked result/link fields with actual receipts before pasting into Devpost. Do not submit the local rehearsal as provider evidence.

## Inspiration

A successful payment tells us that money moved. It does not tell us that a shopping agent bought the right product, kept the delivered budget, or respected a customer's refusal of substitutions.

We wanted engineers to see that difference before shipping an AI checkout flow. COMRDY turns a customer's instruction into a testable contract and shows exactly where a checkout stops satisfying it.

## What it does

The demo follows one purchase at our fictional Northpath Supply merchant: one blue Ocean Shell, size M, for no more than $160 delivered, with no substitutions or subscriptions. The item, shipping and tax total $148.

An AI compiler proposes constraints with their source phrases. The buyer reviews and confirms them. A constrained shopping agent prepares the cart; the buyer approves through the normal PayPal Sandbox flow. COMRDY then injects a disclosed fault between authorization and the final capture check: the size changes at the same price, or shipping pushes the total to $173.

Intent Lineage identifies the first divergence. A deterministic gate blocks capture if any hard requirement fails or lacks evidence. The application requests a void and retrieves its status. One bounded recovery restores the requested item under the unchanged contract, requires fresh approval, and verifies again before capture.

Engineers can inspect the contract, merchant observations, decision and redacted provider resources; compare the original and recovered attempts; and replay saved events without invoking a payment.

## How we built it

TypeScript and Next.js serve the test lab and controlled storefront. OpenAI Responses API handles structured compilation and constrained browser actions; the model and prompt version are recorded. KERNEL isolates the shopping browser. A pure invariant engine makes the payment decision, separate from the model.

PayPal Orders v2 and Payments v2 provide Sandbox order creation, buyer approval, authorization, exact-amount capture, void and readback. Operation identities are persisted before network requests. PostgreSQL transactions and leases coordinate the web process and persistent worker. Retries reuse the original economic identity; ambiguous outcomes are reconciled before another action. Verified webhooks trigger readback rather than authorizing a new payment.

Vercel hosts the web/API deployment; a persistent companion worker shares the database and retains private browser evidence. The source, worker and exported evidence record their revision. [Verify actual final hosting before submission.]

## Challenges we ran into

The hardest part was handling the gap between authorization and capture. Merchant state can change while the payment resource remains valid. We therefore check both before authorization and immediately before capture, bind the decision to the checkout revision and provider resources, and atomically claim the capture command.

Network uncertainty was another challenge. A timeout cannot tell us whether a provider completed an operation. The application preserves that uncertainty and retrieves the provider state; a denied test is not treated as a released authorization until void is confirmed.

## Accomplishments

We built a complete, inspectable workflow around two deliberate merchant faults, one constrained recovery, and a clear distinction between test verdict and payment state. The interface keeps the first divergence visible on phones as well as desktop.

**Insert measured release results here:** live compiler corpus [passed]/20; three consecutive runs for each payment scenario [passed]/9; recovery [passed]/[total]; duplicate/restart/webhook checks [passed]/[total]. Include the actual clean source revision and receipt links. Local checks belong in a separate paragraph and must be labeled as mocks or local PostgreSQL/browser checks.

## What we learned

Payment success and purchase correctness are different assertions. An LLM can help translate and execute intent, but a deterministic boundary is useful when deciding whether to capture money. Evidence becomes much more useful when it explains a divergence instead of only reporting a green or red result.

## What's next

After this controlled demonstration, we would expand the case corpus and evaluate additional merchant integrations. General autonomous recovery, arbitrary storefronts, subscriptions, refunds and multi-tenant operation are outside this release.

## Original work and disclosures

Implementation began November 1, 2026. The earlier blueprint is design history, not a pre-existing functioning service. COMRDY does not claim to invent intent-based payment authorization; its contribution is this testing workflow, controlled fault reproduction and inspectable PayPal integration.

Northpath Supply and Ocean Shell are fictional. All payments are Sandbox payments. No real customer savings, production deployment adoption or general repair capability is claimed. Codex assisted implementation and production; runtime AI and synthetic film narration are disclosed in the app/film and `ATTRIBUTION.md`.

## Fields to complete at the final account stage

- Hosted demo: [verified public HTTPS URL]
- Source: [public repository with MIT license and matching release revision]
- Video: [public YouTube URL, verified signed out, 165 seconds]
- Instructions: use the public saved evidence immediately; fresh Sandbox runs require the documented buyer approval and operator access supplied to judges.
- Team/personal eligibility and sponsor declarations: user completes accurately.
- Submission receipt: authenticated status, finalization state, timestamp and submitted URLs retained in a completed copy of `submission/receipt.template.json`.
