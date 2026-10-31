# COMRDY Hackathon Video & Submission Plan

Version: 0.1  
Target: public Devpost demonstration video under three minutes.

---

## 1. Video objective

The video must prove one idea quickly:

> **A payment can succeed and still be the wrong purchase. COMRDY catches the difference before money is captured.**

Do not explain the entire roadmap. Show one false success, one deterministic reason it is wrong, one PayPal Sandbox authorization, and one capture decision.

Target final duration: **2:40-2:50**. Never publish a cut at 2:59; platform intros/outros can push playback over the limit.

---

## 2. Narrative structure

### Act 1 — Establish the blind spot

Most systems count completed checkout/payment as success. COMRDY checks whether the economic result stayed inside the human mandate.

### Act 2 — Show the failure

A synthetic shopper requests Ocean Shell / Blue / M / final total <= $160. The store mutates the cart to size S. PayPal authorization succeeds. COMRDY blocks capture.

### Act 3 — Show this is infrastructure, not a one-off demo

Show the Intent Lineage, the violated invariant, a controlled chaos run, a replay, and then one correct transaction that COMRDY allows to capture.

---

## 3. Exact storyboard and voiceover

### 00:00-00:08 — Hook

**Visual**  
Black text on white, no animation beyond a fast cut:

> A payment can succeed and still be wrong.

Then the COMRDY wordmark and app.

**Voiceover**  
"AI shoppers can complete checkout and still violate what the customer asked for."

### 00:08-00:22 — Define COMRDY

**Visual**  
COMRDY mission form with the mandate typed/pasted:

> Buy the Ocean Shell in blue, size M. Final total <= $160. Exactly one. No substitutions. No subscription.

Compiled contract appears beside it.

**Voiceover**  
"COMRDY compiles a shopper's request into deterministic commerce invariants, then tests the transaction from selection through payment."

### 00:22-00:42 — Run synthetic shopper

**Visual**  
Run view. One browser thumbnail enlarged; action timeline moves through product selection and cart. Keep speed 1.5-2x if needed.

**On-screen facts**

- Agent: Browser shopper A
- Environment: Demo / PayPal Sandbox
- Mission: M01

**Voiceover**  
"Here the agent correctly selects blue, size M. Our demo merchant then injects a controlled variant mutation during checkout."

### 00:42-01:02 — Reveal the false success

**Visual**  
Intent Lineage expands:

| | Mandate | Agent | Cart | Checkout |
|---|---|---|---|---|
| Size | M | M | S | S |
| Total | <=160 | 139 | 148 | 148 |

First drift cell turns semantic red.

**Voiceover**  
"The browser journey still reaches payment, so a conventional success metric would pass it. COMRDY sees the size changed from M to S."

### 01:02-01:27 — PayPal proof

**Visual**  
Payment panel:

- PayPal order created
- Authorization: COMPLETED
- Amount: $148.00
- COMRDY decision: BLOCK
- Capture: NOT SENT

Show the PayPal Sandbox transaction identifier in a compact evidence row; blur any secrets, never IDs required for understanding.

**Voiceover**  
"PayPal Sandbox successfully authorizes the amount. But authorization is not the same as permission to capture. COMRDY re-evaluates the contract and blocks capture because the purchase is wrong."

### 01:27-01:48 — Evidence, not a score

**Visual**  
Case detail with:

- violation: `SELECTION_DRIFT`
- failed invariant: `variant.size == M`
- expected: M
- observed: S
- first divergence checkpoint: Cart
- evidence screenshot thumbnail

**Voiceover**  
"Every failure has an exact invariant, the first divergent state, the transaction evidence, and a reproducible run seed."

### 01:48-02:08 — Commerce Chaos and differential testing

**Visual**  
Quick cuts:

1. Chaos toggle `Shipping +$20`.
2. Two-column Browser vs structured/WebMCP-compatible adapter result.
3. False Success Rate chart/table.

**Voiceover**  
"COMRDY can mutate price, shipping, inventory, retries, and refunds, and compare the same mandate across agent or protocol paths to expose transaction drift."

### 02:08-02:28 — Correct transaction

**Visual**  
Rerun M01 with faults off. Lineage all green/neutral. PayPal panel:

- Authorization: COMPLETED
- COMRDY: ALLOW
- Capture: COMPLETED

**Voiceover**  
"With the same mandate and a correct checkout, every invariant holds, so COMRDY allows capture."

### 02:28-02:42 — Product thesis

**Visual**  
Overview page with results:

- 10 missions
- 8 technically completed
- 6 correct
- 2 false successes
- 2 hard failures

Then lockup:

> Payments tell you whether money moved.  
> COMRDY tells you whether it should have.

**Voiceover**  
"Payments tell you whether money moved. COMRDY tells you whether it should have."

### 02:42-02:48 — Close

**Visual**

`comrdy.com`  
`Open-source hackathon build · PayPal Sandbox`

No extra spoken pitch.

---

## 4. Capture requirements

### Resolution

- Record at 2560x1440 or higher if machine supports it.
- Deliver 1920x1080, 30 fps, H.264.
- Browser zoom 100% unless legibility requires 110%.
- Cursor enlarged slightly; no novelty cursor effects.

### Browser setup

- fresh profile;
- no personal bookmarks, tabs, email, notifications, or account avatars;
- hide bookmarks bar;
- deterministic window size;
- COMRDY demo workspace pre-seeded;
- PayPal Sandbox only.

### Typography

At 1080p, no crucial label under approximately 18 rendered pixels in the edit. Zoom into evidence when needed rather than shrinking the whole UI.

### Audio

- voiceover first; music optional and unnecessary;
- if music is used, it must be original or clearly licensed for the public submission;
- voice centered and dry, no exaggerated trailer processing;
- target integrated loudness around -16 LUFS for web playback;
- remove room noise and mouth clicks.

---

## 5. Required video assets

Create these deliberately before recording:

1. COMRDY wordmark SVG.
2. Clean 16:9 title card.
3. Demo workspace with seeded data.
4. Mission M01 in no-fault and F01 states.
5. PayPal Sandbox account ready with known test buyer.
6. Transaction detail with complete evidence.
7. Differential comparison screenshot/state.
8. Overview state with a believable small data set.
9. Closing lockup with `comrdy.com`.

Do not use generic AI animations, robots, brains, glowing nodes, stock ecommerce footage, or fake code rain.

---

## 6. Editing language

- Mostly hard cuts.
- 120-180 ms ease only for panel focus/zoom.
- No whip transitions, lens flares, glitch effects, or cinematic bars.
- Use subtle 1.05-1.12x digital push when focusing a failure.
- Keep screen recordings full-resolution and crop rather than scale repeatedly.
- Highlight state changes with the actual product's semantic colors, not editor annotations wherever possible.

---

## 7. Backup video plan

If live browser-agent execution is unreliable during recording:

- execute the run in advance;
- record the genuine run replay from COMRDY's stored trajectory;
- clearly label it `Recorded run replay`;
- keep PayPal Sandbox evidence from that exact run.

Do not fake a result with static Figma screens or manually edited payment statuses.

---

## 8. Public submission copy

### Short description

COMRDY is transaction assurance for agentic commerce. It verifies that an AI shopper's actual cart, authorization, capture, order, and refund remain inside the customer's original intent—and exposes payments that technically succeeded but were economically wrong.

### Problem

Agentic commerce can produce false successes: checkout completes and payment authorizes, but the agent bought the wrong variant, exceeded the user's limit, changed quantity, accepted an unauthorized subscription, duplicated a retry, or refunded the wrong amount.

### Solution

COMRDY compiles user intent into deterministic invariants, runs synthetic commerce journeys, records every state transition, and gates PayPal Sandbox capture based on the verified economic outcome.

### PayPal usage

PayPal Sandbox is part of the transaction state machine, not an add-on. COMRDY creates Orders with authorization intent, verifies commerce invariants after authorization, captures only passing transactions, reconciles asynchronous events through webhooks, and validates refund behavior.

### AI usage

AI is used for natural-language intent compilation, synthetic mission generation, browser-agent execution, counterfactual investigation, and remediation assistance. Financial decisions are enforced by deterministic rules rather than an LLM verdict.

---

## 9. Devpost readiness checklist

- [ ] working project, not a mockup;
- [ ] public repository at submission time;
- [ ] open-source license included;
- [ ] README includes exact local run instructions;
- [ ] public YouTube link;
- [ ] video safely below three minutes;
- [ ] video shows actual working product;
- [ ] PayPal integration is visible and technically meaningful;
- [ ] no secrets in repo, screenshots, terminal, or video;
- [ ] no unlicensed copyrighted music/assets;
- [ ] demo URL works in an incognito session;
- [ ] seeded judge/demo account or frictionless sign-in path documented;
- [ ] reset instructions documented;
- [ ] architecture diagram included in repository/docs;
- [ ] all sponsor integrations truthfully described—no claims for integrations not shipped.

---

## 10. Recording-day runbook

1. Reset demo store.
2. Confirm Sandbox credentials and webhook endpoint.
3. Execute M01 no-fault once.
4. Execute M01+F01 once.
5. Verify both traces are complete.
6. Record clean app walkthrough.
7. Record browser replay separately.
8. Record PayPal Sandbox evidence separately.
9. Record 2-3 takes of voiceover.
10. Assemble rough cut before adding any motion.
11. Remove every second that does not increase proof or comprehension.
12. Watch once muted: UI must still communicate the idea.
13. Watch once audio-only: story must still make sense.
14. Export and verify exact duration after YouTube upload.
