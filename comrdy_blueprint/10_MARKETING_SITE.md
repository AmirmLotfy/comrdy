# COMRDY Marketing Website Specification

Domain: `comrdy.com`

## 1. Site objective

The marketing site must make the category understandable in under 15 seconds and prove the product with real UI evidence before asking visitors to believe a broad claim.

Primary audience:
- payments/commerce engineers;
- AI commerce teams;
- ecommerce platform leaders;
- QA/SDET;
- hackathon judges.

## 2. Positioning

### Category line
`Agentic commerce transaction assurance.`

### Core headline
# A payment can succeed and still be wrong.

### Subhead
`COMRDY tests whether AI shoppers keep the customer's intent intact from product selection through authorization, capture, and refund.`

### Primary CTA
`Run the demo`

### Secondary CTA
`View source`

### Proof line
`Synthetic transactions. Deterministic rules. PayPal Sandbox.`

Avoid leading with “AI-powered.” AI is the test subject, not the brand promise.

## 3. Navbar

Left:
- COMRDY wordmark.

Center/right links:
- Product;
- How it works;
- PayPal;
- Security;
- Docs.

Actions:
- GitHub/source link icon + text;
- `Run demo` primary.

Sticky after small scroll; initially integrated into white page.

## 4. Homepage structure

Do not use generic hero -> 3 cards -> testimonials -> pricing -> FAQ.

The homepage is organized as an argument.

### Section 1 - Claim + live evidence

Centered hero text.

Below CTAs, show a wide real product capture/mock populated from demo data:

```text
MANDATE       AGENT       CART        CHECKOUT     PAYPAL AUTH     COMRDY
Size M   ->   Size M  ->  Size S  ->  Size S   -> $139 AUTH   -> BLOCK
```

A single red first-drift cell is the visual focal point.

Caption:
`The checkout worked. The purchase did not.`

### Section 2 - False success

Two-column narrative, but not symmetric cards.

Left large number/example:
`24 payments completed`

Then beneath:
`18 matched the mandate`
`6 were false successes`

Right copy:

Heading:
`Completion is not correctness.`

Body:
`A store can report a successful checkout while the agent bought the wrong variant, exceeded the budget, lost a discount, started a subscription, or retried payment twice. COMRDY measures the economic result against the shopper's actual authority.`

### Section 3 - The verification boundary

Full-width sequence diagram with product screenshots/evidence:

`Intent -> Agent -> Cart -> Checkout -> Authorize -> Verify -> Capture / Block`

Copy:
`COMRDY evaluates the transaction after authorization and before capture. Hard constraints are enforced deterministically; an LLM never decides whether money should move.`

### Section 4 - Commerce Chaos

Headline:
`Test what changes after the agent decides.`

Use a horizontal list of real mutation examples:
- Price changes;
- Shipping jumps;
- Discount disappears;
- Inventory vanishes;
- Variant mutates;
- Retry times out.

Each is represented as a before -> after state, not an icon card.

Example:
`Shipping $10 -> $35` with result `Capture blocked`.

### Section 5 - Evidence, not a score

Large transaction detail screenshot.

Copy:
`Every finding has a first drift point, violated invariant, state snapshots, PayPal lifecycle, and replayable evidence.`

CTA:
`See a failed transaction`

### Section 6 - Replay

Side-by-side screenshot inspired by code diff.

Headline:
`Change one variable. Run it again.`

Body:
`Replay a failed transaction with a different agent, prompt, execution path, or chaos profile while keeping the original intent contract fixed.`

### Section 7 - Built for PayPal's authorize/capture lifecycle

Avoid a giant PayPal logo wall.

Use factual copy:
`COMRDY uses PayPal Sandbox authorization as the test boundary. Valid transactions can be captured. Transactions that violate the mandate are stopped before capture.`

Small technical sequence.

CTA:
`Read the PayPal integration`

### Section 8 - Developer workflow

Code sample inside dark evidence/code panel:

```bash
npx comrdy run checkout-regression
```

Result:

```text
19 passed
2 false successes
0 captured invalid transactions
policy threshold failed
```

Copy:
`Run suites locally, in CI, or from the COMRDY dashboard.`

Mark CLI as “planned” if not actually implemented for hackathon. Never market an unbuilt feature as available.

### Section 9 - Open source / hackathon truth

During hackathon:

Heading:
`Inspect the test, not just the demo.`

Copy:
`The hackathon build is public and reproducible. Run the demo store, inspect the Intent Contract format, and follow the payment state from authorization to decision.`

Actions:
- `View repository`
- `Read docs`

### Section 10 - Final CTA

Dark neutral footer band, not gradient.

Headline:
`Did the agent buy the right thing?`

CTA:
`Run the demo`

Secondary:
`Read the architecture`

## 5. Homepage exact copy draft

### Hero

Eyebrow:
`Agentic commerce transaction assurance`

H1:
`A payment can succeed and still be wrong.`

Body:
`COMRDY tests whether AI shoppers keep the customer's intent intact from product selection through authorization, capture, and refund.`

Proof:
`Synthetic transactions. Deterministic rules. PayPal Sandbox.`

Buttons:
`Run the demo`
`View source`

### False success section

H2:
`Completion is not correctness.`

Body:
`An agent can reach checkout, receive an authorization, and still violate the buyer's instructions. COMRDY separates technical completion from a correct economic outcome.`

Sticky line:
`Payments tell you whether money moved. COMRDY tells you whether it should have.`

### Gate section

H2:
`Verify before capture.`

Body:
`The shopper's mandate becomes a locked set of deterministic invariants. When PayPal authorization returns, COMRDY compares the actual transaction against those rules. Pass: capture. Fail or unknown: block.`

### Chaos

H2:
`The store changes. The mandate does not.`

Body:
`Commerce Chaos changes price, shipping, inventory, discounts, variants, and retry behavior at controlled checkpoints so you can test whether the transaction still respects the buyer.`

### Evidence

H2:
`The first wrong value is the finding.`

Body:
`Intent Lineage shows where a value first diverged: agent selection, cart, checkout, authorization, order, or refund. Click the cell to open the underlying evidence.`

### Replay

H2:
`Change one variable. Run it again.`

Body:
`Keep the original contract fixed and replay the same mission with a different agent, prompt, path, or chaos rule.`

### Final

H2:
`Did the agent buy the right thing?`

Body:
`Run COMRDY against a controlled demo store and inspect every decision.`

## 6. Product page `/product`

Purpose: explain modules without repeating homepage.

Sections:
1. Intent Contract;
2. Invariant Engine;
3. Commerce Chaos;
4. Intent Lineage;
5. Transaction Flight Recorder;
6. Replay;
7. CI/runtime future.

Each section uses one real product screenshot or functional diagram.

## 7. How it works `/how-it-works`

Step-by-step technical flow:

1. Write a buyer mandate.
2. Compile a deterministic contract.
3. Run an agent against store.
4. Snapshot commerce state.
5. Authorize PayPal Sandbox payment.
6. Evaluate invariants.
7. Capture or block.
8. Replay failures.

Include contract JSON example and lineage screenshot.

## 8. PayPal page `/paypal`

Headline:
`Authorization is the boundary.`

Explain:
- Sandbox-only hackathon behavior;
- Orders v2 authorize intent;
- deterministic verification;
- capture only after ALLOW;
- idempotency;
- webhook reconciliation.

Important:
Do not imply affiliation beyond participating in the PayPal AI Hackathon unless authorized.

## 9. Security page `/security`

Plain factual sections:
- secrets;
- sandbox/live separation;
- tenant isolation;
- redaction;
- webhooks;
- data retention;
- responsible disclosure contact;
- open-source hackathon code.

Do not use decorative trust seals.

## 10. Docs landing `/docs`

Left docs nav, search, main reading column.

Start with:
- Quickstart;
- Intent Contracts;
- Run lifecycle;
- PayPal Sandbox;
- Demo Store;
- API;
- Security;
- Architecture.

Use the same light design system; code blocks use evidence dark surface.

## 11. Pricing

Do not prioritize pricing page during hackathon.

Post-beta proposed structure:
- Developer;
- Team;
- Enterprise.

Pricing must be tied to runs/mission execution/evidence retention, not arbitrary “AI credits.”

## 12. SEO

### Home title
`COMRDY - Agentic Commerce Transaction Assurance`

### Meta description
`Test whether AI shopping agents preserve customer intent through checkout, PayPal authorization, capture, order, and refund.`

### Core semantic topics
- agentic commerce testing;
- AI shopping agent testing;
- agent transaction assurance;
- synthetic commerce testing;
- payment authorization testing;
- AI checkout QA;
- agentic commerce observability.

Avoid keyword stuffing.

## 13. Structured data

Marketing site may use:
- Organization;
- SoftwareApplication/WebApplication if accurate;
- TechArticle for docs later.

Do not invent customer ratings or review schema.

## 14. Social preview

1200x630.

White background.
Large line:
`A payment can succeed and still be wrong.`

Below: compact Intent Lineage strip ending in `CAPTURE BLOCKED`.

COMRDY wordmark bottom-left.
No generic AI art.

## 15. Marketing motion

One memorable interaction:
As the user scrolls the first evidence module, the transaction progresses checkpoint by checkpoint. At cart, Size M changes to S; at authorization, amount remains valid; COMRDY then blocks capture.

Rules:
- motion maps to actual product state;
- not autoplaying cinematic noise;
- reduced-motion users see final static state.

## 16. Conversion paths

### Judge/developer
Home -> Run demo -> preloaded workspace -> Run starter suite.

### Merchant engineering
Home -> Product -> Docs/Security -> Join beta.

### Open-source user
Home -> Source -> Quickstart.

## 17. Do not claim until true

- “production safe”;
- “works with every protocol”;
- “prevents fraud”;
- “enterprise compliant”;
- “millions of transactions tested”;
- customer logos;
- fake benchmark data;
- Agent Ready access if not approved.
