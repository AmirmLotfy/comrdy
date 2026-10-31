# COMRDY PayPal AI Hackathon Submission Specification

Version: 0.1

This document turns the product into the strongest possible hackathon entry without overstating what is built.

---

## 1. Submission thesis

### Headline

**A payment can succeed and still be wrong.**

### One sentence

COMRDY verifies that an AI shopping agent's actual transaction stays inside the customer's authorized intent from product selection through PayPal authorization, capture, order, and refund.

### Why it matters

Agentic-commerce systems can report technical success even when the agent buys the wrong variant, exceeds a spend cap, changes quantity, accepts an unauthorized subscription, duplicates an economic action, or refunds the wrong amount.

---

## 2. Judging strategy

Design every part of the entry to improve one or more likely judging dimensions.

### Technology

Prove:

- natural-language Intent Contract compilation;
- deterministic invariant evaluation;
- real browser-agent execution;
- real PayPal Sandbox authorization/capture separation;
- evidence recorder;
- fault injection;
- idempotent retries;
- replay.

### Design

Prove:

- clear evidence-first interface;
- Intent Lineage;
- operational tables/filters;
- semantic payment states;
- no hackathon-dashboard visual clutter.

### Impact

Frame around transaction correctness and customer authorization, not abstract AI safety.

### Innovation

Emphasize **false success** and the full mandate-to-payment/post-purchase chain.

### Presentation

One hero scenario. One reveal. One before/after. No feature tour.

---

## 3. PayPal centrality statement

Use language like:

> PayPal is part of COMRDY's verification boundary. A synthetic shopper can reach a valid PayPal Sandbox authorization even when the economic transaction violates the shopper's mandate. COMRDY evaluates the resulting commerce/payment state and captures only when deterministic invariants pass.

Avoid:

> COMRDY supports PayPal checkout.

The latter makes PayPal sound replaceable/decorative.

---

## 4. AI centrality statement

Use language like:

> AI converts natural-language shopping intent into a candidate contract, executes nondeterministic commerce journeys, generates semantic variations, and assists with root-cause analysis. COMRDY then evaluates financial authority with deterministic code so a model cannot approve its own transaction.

This demonstrates both AI and non-AI safety engineering.

---

## 5. Innovation claim boundaries

Claim:

- COMRDY focuses on full-lifecycle transaction-intent integrity;
- it identifies false successes rather than treating completed checkout as correctness;
- it can place a deterministic gate between authorization and capture in its PayPal Sandbox demo;
- it records first divergence and evidence.

Do not claim:

- `the first ever` unless independently proven;
- patent protection;
- production certification;
- broad ACP/UCP support unless implemented;
- PayPal partnership/endorsement;
- customer adoption that does not exist.

---

## 6. Competitive answer if judges ask

### “Isn't this synthetic monitoring?”

> Synthetic monitoring usually checks whether a journey completes. COMRDY verifies whether the completed economic outcome remained inside the user's authority. A completed journey can be a false success.

### “Isn't this ShopperProbe/readiness testing?”

> Existing tools validate important pre-payment shopping behavior. COMRDY's wedge is the payment and post-payment lifecycle: authorization, deterministic capture gating, retry/idempotency behavior, order/refund correctness, and evidence connecting those outcomes back to the original intent.

### “Isn't this fraud detection?”

> Fraud asks whether the actor/transaction is malicious or suspicious. COMRDY asks whether an autonomous agent followed the specific authority the user gave it. A perfectly legitimate merchant and buyer can still produce an unauthorized agent outcome.

### “Why not let the LLM decide?”

> The model can interpret language, but financial limits, quantities, variants, subscriptions, and capture policy should be enforced deterministically. COMRDY separates semantic interpretation from economic authorization.

---

## 7. Architecture image for submission

Use a six-node visual:

```text
Human mandate
   ↓
Intent Contract
   ↓
AI Shopper → Merchant
   ↓
PayPal Authorization
   ↓
COMRDY Invariant Gate
   ↓
ALLOW → Capture
DENY  → Block + Evidence
```

Side rail:

```text
Commerce Chaos
State Snapshots
Intent Lineage
Replay
```

Keep one screen, not a giant cloud architecture poster.

---

## 8. Submission screenshots

Order:

1. False-success Intent Lineage.
2. PayPal authorized / capture blocked.
3. Violation evidence panel.
4. Chaos test matrix.
5. Replay/differential view.
6. Architecture.

Screenshot captions should explain the result, not label the UI.

Example:

> **PayPal authorization succeeded, but capture was blocked.** The shopper asked for size M; the cart mutated to size S.

---

## 9. Repository presentation

Top of README:

```text
COMRDY
Agentic Commerce Transaction Assurance

A payment can succeed and still be wrong.

[Run demo] [Watch video] [Read architecture]
```

Then immediately show the false-success GIF/image.

Repository should make three things obvious in <30 seconds:

1. it is real code;
2. PayPal is central;
3. the deterministic assurance engine is the novelty.

---

## 10. Judge-mode UX

If a public demo is exposed, add a small `Demo` route or demo workspace with:

- prebuilt M01 mission;
- `Run valid case`;
- `Run false-success case`;
- short text explaining Sandbox/no real money;
- pre-generated historical run if browser capacity is temporarily unavailable;
- source link.

Do not force judges through a 10-step onboarding wizard.

---

## 11. Live demo fallback hierarchy

1. live M01 run;
2. live COMRDY replay of a previously completed authentic M01 run;
3. recorded video;
4. static screenshots only as last backup.

All fallbacks must show truthful product output.

---

## 12. Final submission checklist

### Product

- [ ] live deployment stable;
- [ ] demo reset works;
- [ ] M01 pass works;
- [ ] M01 false-success works;
- [ ] PayPal Sandbox authorize/capture evidence works;
- [ ] repository matches deployed build tag;
- [ ] source license present.

### Story

- [ ] false success defined in one sentence;
- [ ] competitor difference can be explained in one sentence;
- [ ] PayPal centrality explicit;
- [ ] AI centrality explicit;
- [ ] claims are factual;
- [ ] roadmap clearly separated from shipped features.

### Video

- [ ] under 3:00 with margin;
- [ ] public YouTube;
- [ ] working product shown;
- [ ] no tiny unreadable UI;
- [ ] audio clear;
- [ ] no unlicensed music/assets.

### Devpost

- [ ] description proofread;
- [ ] correct links;
- [ ] GitHub public;
- [ ] deployment incognito-tested;
- [ ] all required fields completed;
- [ ] rules re-read on submission day;
- [ ] submit before deadline buffer.
