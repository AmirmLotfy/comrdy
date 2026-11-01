# COMRDY research extension

Observed **1 November 2026, Africa/Cairo** (Devpost connector receipts approximately `2026-10-31T23:43Z`). Research baseline: `/Users/frameless/Desktop/Comrdy`, `main`, `17c2f00538b4315951a93247c53a18241619a63c`. This is a recommendation packet, not evidence that the proposed features or provider integrations have shipped.

## Recommended direction

Make COMRDY a controlled test bench that answers a merchant engineer's concrete question: **“When an agent's cart stops matching the buyer's approved request, can we show where it changed, prevent capture, and prove what happened to the authorization?”**

Prioritize three connected additions: executable constraint coverage; an evidence review workbench; and a merchant readiness report backed by runnable API checks. Keep the existing fictional merchant and PayPal Sandbox scope. The opportunity is a focused verification workflow, not a new general shopping assistant or a claim that COMRDY invented payment mandates.

This is a research-backed product hypothesis. No merchant interviews, adoption, measured customer savings, market-size estimate, or exhaustive competitor audit were performed.

## Current official hackathon requirements

The current Devpost connector and [official overview](https://paypalaihackathon.devpost.com/) require meaningful PayPal Sandbox and AI use, a functional build, and an explanation of the tools' roles. Sponsor tools are optional. The five equally weighted judging criteria are technological implementation, design, potential impact, innovation, and presentation; the connector reports a five-point scale. For COMRDY, the strongest demonstration is an actual agent attempt, a specific violated condition, the deterministic capture decision, and the independently retrieved payment outcome.

The [official rules](https://paypalaihackathon.devpost.com/rules) require a public licensed source repository and a working demo or complete run instructions. The YouTube video must be public and under three minutes. Submission closes **12 November 2026 at 20:00 UTC**; judging runs **1–15 December**. The project's existing retention-through-21-December plan remains useful. Personal eligibility and declarations belong to the user.

The [28 October organizer update](https://paypalaihackathon.devpost.com/updates) recommends submitting by 5 November for an early eligibility review, showing PayPal and AI clearly, supplying something judges can run, and keeping keys out of source. No submission action was taken by this research task.

Official prize data lists $67,500 cash plus $2,250 in Render credits; promotional copy uses $69,750 total. Relevant awards include Best Use of PayPal + AI and Best Use of Agentic Commerce. The rules allow one grand **or** honorable-mention award plus one sponsor award. Add integrations because they improve the working product; there is no published points multiplier for sponsor count. [Prize section](https://paypalaihackathon.devpost.com/#prizes), [rules](https://paypalaihackathon.devpost.com/rules).

## Every sponsor, and a practical fit decision

All entries below were checked against the current official sponsor resource pages. Offers are published offers, not credits claimed or account eligibility verified.

| Sponsor | Official capability or offer | Meaningful COMRDY use | Decision for this extension |
| --- | --- | --- | --- |
| [PayPal](https://developer.paypal.com/api/rest/) | Sandbox checkout, authorization, capture, void and resource readback are the core payment surface. | Existing fail-closed gate and independent control must ultimately produce real Sandbox evidence. | Essential. Preserve separation of authorization, capture and merchant order. |
| [AG Grid](https://paypalaihackathon.devpost.com/details/aggrid) | Grids, charts and AG Studio dashboards; sponsor guidance explicitly prefers polish, custom widgets/layouts and the Studio Agent Framework. | Filter and compare actual runs, constraint failures, evidence age and payment resolution; export the selected evidence rows. | Best new UI fit. Community is a useful bounded integration, while Studio is a stronger sponsor-specific direction only if licensing and scope fit. |
| [APIMatic](https://paypalaihackathon.devpost.com/details/apimatic) | API-contract SDKs and Context Plugins; the PayPal context plugin is advertised without extra APIMatic credentials. | Use the PayPal plugin to review an actual integration change and record which operation/schema it informed. | Optional developer aid. Do not claim use from reading documentation alone; do not replace the existing provider adapter for a badge. |
| [Astropods](https://paypalaihackathon.devpost.com/details/astropods) | Declarative agent runtime, tool integrations, deployment and observability. | A future hosted shopper harness could expose agent execution traces. | Defer: introduces a second execution platform alongside the existing worker/KERNEL path without resolving the immediate evidence gap. |
| [Bryntum](https://paypalaihackathon.devpost.com/details/bryntum) | Gantt, Scheduler and Calendar; sponsor award targets meaningful use of these components. | Useful for multi-resource fulfillment or settlement scheduling, which COMRDY does not currently model. | Defer. A short run-event timeline alone does not justify a scheduling dependency. |
| [Channel3](https://paypalaihackathon.devpost.com/details/channel3) | Normalized product/variant/price/availability search via API or MCP; published hackathon offer is 20,000 searches. Actual calls must be part of the product for sponsor eligibility. | Later compare search-result facts against merchant checkout facts, explicitly treating discovery as non-authoritative. | Defer for this milestone: arbitrary retailers, catalog licensing and binding external products to the controlled merchant would expand scope. |
| [Elastic](https://paypalaihackathon.devpost.com/details/elastic) | Structured, text and vector search plus analytics/agent tools; local deployment and a time-limited cloud trial are offered. | Search large historical failure corpora by constraint, drift point and provider outcome. | Defer until run volume justifies another data store. Current bounded evidence can be searched in the existing app. |
| [KERNEL](https://paypalaihackathon.devpost.com/details/kernel) | Agent browser infrastructure with live view/replay; advertised $50 hackathon credit offer. | Existing shopper uses a real browser against the controlled merchant; a captured action trace can identify the first drift. | Keep. Show actual provider execution separately from saved playback. Credits and live execution remain unverified. |
| [Postman](https://paypalaihackathon.devpost.com/details/postman) | API design, testing, distribution and documentation; official PayPal collection linked. | Publish a runnable collection exercising COMRDY's contract, owner, evidence and forbidden-operation boundaries. | Strong low-cost fit. A collection file is “Postman-compatible”; claim tested in Postman/Newman only after it actually runs. |
| [Render](https://paypalaihackathon.devpost.com/details/render) | Long-lived workers, databases and Workflows; advertised $50 hackathon credit offer. | Existing prepared companion worker/database target is a genuine persistent execution need. | Keep the prepared architecture. Do not claim deployed use before live receipts, or add Workflows merely to increase tool count. |
| [Zapier](https://paypalaihackathon.devpost.com/details/zapier) | MCP actions across connected apps; a new-account Professional trial is advertised. | A later approved notification or merchant-ticket workflow after a verified blocked case. | Defer. Financial authority must remain in the deterministic server; no outward messages or account connections are needed for this extension. |

[AG Grid's current licensing page](https://www.ag-grid.com/react-data-grid/community-vs-enterprise/) confirms Community is MIT-licensed. Its [CSV documentation](https://www.ag-grid.com/react-data-grid/csv-export/) supports Community API export and warns about spreadsheet formula execution. Use allowlisted columns and neutralize formula prefixes; hidden columns are not a privacy boundary. Sponsor award eligibility and stronger sponsor judging preferences are distinct: the formal rules permit any AG Grid tool, while the sponsor page asks for more than a plain table.

## What is verified about Beavous

The sponsor's [14 August 2026 results article](https://www.backblaze.com/blog/results-from-the-backblaze-generative-ai-media-hackathon/) identifies **Beavous as second place** in the Backblaze Generative Media Hackathon. It highlights organization-scoped campaigns, queued private workers, correction lineage, private prompt references, and independent re-download/re-hash checks rather than trusting a stored manifest. This verifies the published award and the sponsor's characterization; it is not a fresh operational audit of Beavous.

The [Beavous Devpost project](https://devpost.com/software/beavous) describes an approved, versioned Product Truth Lock; four concepts in four aspect ratios; copy, reel and campaign export; visible QA failures; and human approval. Its writeup distinguishes integrity checks from authorship proof and reports durable job identities, bounded retries and cost controls. Direct `beavous.com` retrieval was unavailable through the research web tool; Devpost's indexed content and the sponsor article were readable. No live application acceptance or source-code reuse is claimed here.

Reuse the product patterns, with COMRDY-specific meaning:

| Beavous lesson | COMRDY already has | Useful next step |
| --- | --- | --- |
| Approve structured truth before execution | Human-confirmed contract and original/final candidate provenance | Show every hard rule in the executable coverage matrix. |
| Retain failures and correction lineage | Original run plus one bounded recovery | Put original and recovery evidence together with unchanged-contract verification. |
| Independently check the recorded result | Provider readback and exact resource bindings | Make the final provider observation and its timestamp visible, alongside unresolved outcomes. |
| Deliver an inspectable artifact | Redacted evidence/export machinery | Give judges a searchable evidence library and reproducible local checks. |

The existing COMRDY architecture already implements much of the durable workflow lesson. Reimplementing queues, adding tenants, or copying Beavous's media features would not strengthen this milestone. No Beavous assets or code were copied.

## Market evidence and honest differentiation

| Primary source, checked 1 November 2026 | What already exists | COMRDY's defensible scope |
| --- | --- | --- |
| [PayPal Agent Ready](https://developer.paypal.com/agent-ready/overview/), updated 13 October 2026 | ACP and UCP integration paths connect AI checkout to Braintree and PayPal; the current page includes a PayPal Orders v2 path. | COMRDY is a controlled verification lab, not a replacement payment protocol or certified Agent Ready integration. |
| [PayPal's WebMCP article](https://developer.paypal.com/community/blog/WebMCP_PayPal_Agent_Ready/) | Structured product/cart actions, buyer-controlled PayPal approval, and advice to check catalog, availability, pricing and checkout consistency. | Turn those consistency questions into executed scenarios with evidence. Do not borrow PayPal's internal benchmark results as COMRDY results. |
| [AP2 specification](https://ap2-protocol.org/) | Signed checkout/payment mandates bind constraints, authorization and transaction details into an audit trail. | User intent and auditability are established concepts. COMRDY differentiates through understandable failure tests and an actual Sandbox authorization/capture boundary, without AP2 certification claims. |
| [Stripe ACP introduction](https://stripe.com/blog/developing-an-open-standard-for-agentic-commerce) | Programmatic agent/business checkout, buyer confirmation, payment-provider token handling and merchant control. | Demonstrate when checkout facts no longer satisfy approved intent. “AI can buy products” alone is not novel. |
| [OWASP prompt-injection guidance](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) | External website/file content can redirect model behavior; deterministic validation, least privilege and human approval reduce consequences. | A merchant-content instruction must not modify the confirmed contract or acquire capture authority. One adversarial fixture is coverage, not universal prompt-injection protection. |

These sources establish an active technical need for trustworthy agent checkout. They do **not** establish that no competing verification product exists. The narrower gap inferred here is the need for a merchant-facing workflow that connects approved constraints, browser-observed drift, authoritative merchant state and separately reconciled payment outcomes in one reviewable test.

## Ranked additions and acceptance

### 1. Executable constraint suite

**Audience:** merchant engineers deciding whether their agent checkout is safe to test further. **Benefit:** replace a two-fault showcase with explicit, reproducible coverage of the existing approved contract.

At the research baseline, `DemoFault` and the public start path support `none`, `variant` and `shipping`. The generic invariant engine already understands quantity, subscription, inventory, currency-qualified money and unknown values. Add these five bounded scenarios to the same fictional merchant: quantity drift, forbidden subscription flag, stock loss, missing required total, and currency mismatch. A subscription scenario is a deliberately forbidden checkout fact, not a real subscription product.

Each scenario should carry a stable ID, changed path, expected decision, injection checkpoint and expected payment consequence. Results must come from executing the shared gate against actual generated snapshots; a card that prints a predetermined “blocked” status is not coverage. Preserve all failed hard rules instead of returning only the first failure. Label pure-engine, local workflow, browser, and provider executions independently.

Acceptance:

1. Eight scenario definitions are visible; only executed cases enter the executed denominator. An untouched suite begins at `0/8`, not `8/8`.
2. No-fault passes only with complete matching evidence. Quantity/subscription/inventory/variant/shipping violations block; a missing hard fact remains unknown and blocks; currency disagreement never converts or silently compares nominal numbers.
3. Every result links exact expected and observed values, rule IDs, snapshots, contract hash and checkpoint. Changes at selection versus later checkout have distinct first-drift locations.
4. Local execution never makes PayPal or model calls. A Sandbox attempt cannot silently fall back to local fixtures. Provider failures and unfinished attempts remain visible.
5. Any authorized blocked case ends with provider-confirmed void or explicit unresolved reconciliation. No new fault creates a second capture path or weakens fresh approval/recovery limits.

**Implementation boundary:** extend the fixtures, controlled merchant, projection types and UI coherently; do not advertise a scenario in the live workflow if it only runs in the pure engine. Existing clean-revision provider qualification cannot be inherited after changes.

### 2. Evidence review workbench with AG Grid

**Audience:** merchant reviewer or judge inspecting several attempts. **Benefit:** move from manually opening isolated runs to finding which conditions failed and whether payment handling finished safely.

Use AG Grid Community for a real data workflow: sortable/filterable run rows, explicit environment/source revision, test condition, gate verdict, authorization/capture/merchant-order states, reconciliation status and a detail link. Keep the existing case view and two-run comparison as drill-downs. Add compact coverage and unresolved-payment summaries derived from the same rows. A narrow-screen list can carry the same facts without forcing a wide spreadsheet onto a phone.

Acceptance:

1. Filters operate on actual authorized or reviewed public records. Empty evidence produces a clear empty state; it never displays invented successful runs.
2. Counts separate local results from provider results and preserve failed/unfinished attempts. Filtering must not turn a selected subset into a qualification claim.
3. Detail inspection exposes original/recovery relationships and contract mismatch warnings. An ALLOW verdict alone never renders as captured or merchant-order complete.
4. Read-only playback, filtering, comparison and export trigger no POST, payment or agent call. Owner-only runs are not made public by adding a grid.
5. CSV exports only documented safe fields, uses the current filter intentionally, neutralizes formula prefixes, and excludes tokens, approval URLs, browser control URLs and buyer data. Keyboard and mobile operation remain usable.

**Differentiation:** a falsifiable evidence workbench for a bounded commerce test, not decorative payment analytics. Claim AG Grid use once it is installed and used. Do not claim Studio or its agent framework unless actually integrated.

### 3. Merchant readiness report and Postman verification kit

**Audience:** an engineer preparing the controlled merchant and an evaluator checking the trust boundary. **Benefit:** explain what is observable, missing, stale or unqualified before anyone mistakes a green UI for safe payment readiness.

Build the report from the existing contract/snapshot/provider schemas. For each required field show its source, observed value or explicit absence, timestamp/revision, and next action when missing. Include buyer approval, merchant/payee binding, amount/currency agreement, capture/void reconciliation and evidence export status. Statuses should be `observed`, `missing`, `stale`, `mismatch`, or `not executed`; avoid a synthetic percentage or “certified” badge.

Ship a Postman-compatible collection with a local environment template and no secrets. Cover compile/confirm, reading a run/evidence, owner isolation, CSRF rejection, invalid contracts and forbidden direct capture/void routes. Keep paid/provider execution opt-in and documented outside the default collection. An optional merchant-text fixture can attempt to override the mandate; the approved contract hash and capture authority must remain unaffected.

Acceptance:

1. Removing a required field produces a specific missing finding, not “ready”; omitted values are not treated as explicit false/absence.
2. Stale evidence or a mismatched merchant/provider binding blocks readiness. The report explains the same decision the existing gate makes rather than introducing a second policy engine.
3. A run with authorization but no completed capture remains authorized/unresolved; only exact completed capture readback permits merchant-order completion.
4. The collection runs against the local app with explicit expected status/body assertions. Invalid ownership or CSRF attempts fail and leave state unchanged. Evidence checks assert redaction.
5. Replaying a report or the default collection performs no financial action. Provider qualification is shown as pending until separately executed, with the current clean revision recorded.

## Scope and delivery boundary

Implement in this order: shared scenario definitions and result projection; evidence workbench; readiness report/collection. Reuse the current deterministic engine and durable payment machinery. Run one bounded validation pass after integration, then qualify the changed revision separately when credentials and deployment are authorized.

Do not add arbitrary merchant onboarding, production payments, subscriptions, refunds, a second agent runtime, protocol certification, or a new paid service to make the sponsor table longer. Keep the $100 total additional-spend cap and the instruction to finish code before asking for real credentials.

Suggested demonstration: confirm the buyer's request; execute a changed checkout; inspect the first failing hard rule; show the blocked capture and actual authorization resolution; compare one allowed attempt; finish on the measured coverage and evidence library. Until live provider receipts exist, all narration and screenshots must continue to say local simulation.

Research performed read-only Devpost/web queries and local source reads. No install, build, test, browser automation, credentials, financial action, account mutation, deployment or submission was performed by this research task.
