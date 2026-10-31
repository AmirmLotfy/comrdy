# COMRDY Refero Research & Design Decision Ledger

Version: 0.1

This document records the reference research used to prevent COMRDY from collapsing into generic AI-SaaS aesthetics.

---

## 1. Design brief used for research

**Designing:** COMRDY marketing site and web application.  
**Audience:** commerce engineers, payments/platform engineers, ecommerce product owners, QA/reliability teams, technical judges.  
**Platform:** desktop-first responsive web.  
**Primary goal:** understand transaction reliability, inspect evidence, and decide why a transaction was allowed/blocked.  
**Tone:** financial-infrastructure precision, technical proof, calm authority.  
**Main risk:** looking like an AI agent demo instead of infrastructure.  
**Memorable mechanism:** Intent Lineage—the transaction state changes visibly from mandate through payment.  
**Constraints:** light mode default; no AI clichés; high data density; payment/security credibility.

---

## 2. Styles researched

### Brex — primary marketing foundation

Refero style ID: `7471a4ea-ab61-4281-8f19-2d65352efc44`  
Source: `brex.com`

Useful traits:

- light financial-product authority;
- disciplined max-width layouts;
- product visuals as proof rather than decoration;
- neutral surfaces with one sharp action accent;
- minimal shadows;
- concise hierarchy.

Adapt for COMRDY:

- preserve the financial-infrastructure restraint;
- use COMRDY Signal Blue rather than Brex orange;
- use our own fully sans typography;
- make the product evidence matrix the hero visual.

Do not copy:

- exact Brex orange;
- exact headline type treatment;
- exact section layouts.

### shadcn/ui — primary app-system reference

Refero style ID: `c14c0a94-1037-449e-bf5b-4cb972656ac7`  
Source: `ui.shadcn.com`

Useful traits:

- stark bright canvas;
- Geist-like technical typography;
- 1px borders as primary separation;
- compact controls;
- near-monochrome surfaces;
- semantic color used sparingly.

Adapt for COMRDY:

- Geist Sans/Mono;
- crisp table/filter density;
- limited elevation;
- white/gray surfaces;
- status colors only for actual status.

Do not copy:

- overuse pill controls;
- generic component gallery composition.

### Convex — technical evidence treatment

Refero style ID: `d500b995-352a-4a4f-8016-cb00cdb6eb17`  
Source: `convex.dev`

Useful traits:

- code/evidence treated as a first-class visual asset;
- dark technical workbench inside an otherwise controlled system;
- monospace details;
- syntax color localized to code.

Adapt for COMRDY:

- dark evidence/JSON console only inside trace/code panels;
- monospace transaction IDs, invariant expressions, hashes;
- no syntax colors outside technical content.

Reject:

- warm parchment branding;
- decorative pixel motifs;
- dark hero as default.

### Attio — secondary precision reference

Refero style ID: `9f0c028b-6b11-415e-ab92-f32e4597cbe2`  
Source: `attio.com`

Useful traits:

- very precise light surfaces;
- strong whitespace and hairline dividers;
- restrained product frames.

Not adopted:

- serif hero typography. COMRDY is a developer/payment tool and does not need the editorial-serif contrast.

### Linear — rejected as primary, useful for interaction restraint

Refero style ID surfaced in research: `554b801c-3b31-4086-a7e5-ae613cdd618b`  
Source: `linear.app`

Useful:

- interface rigor;
- product screenshots as proof;
- compact interaction states.

Rejected as overall direction:

- dark command-center aesthetic. COMRDY should not default to dark mode or visually resemble generic AI/devtool marketing.

---

## 3. Product screens researched

### Stellate metrics dashboard

Refero screen ID: `20fd86b0-d60e-4e06-b9de-911cd2b94280`  
Source: `stellate.co`

Observed pattern:

- fixed navigation;
- explicit filter region;
- summary metric/chart;
- dense data table;
- drill-down without turning every datum into a card.

COMRDY application:

- Runs/Violations pages use compact filters and a wide evidence table;
- charts are subordinate to inspectable rows;
- operations stay scannable.

### Mercury user activity / audit log

Refero screen ID: `da0ff7bb-32ed-4295-a044-4edbcc3b0745`  
Source: `mercury.com`

Observed pattern:

- calm white enterprise admin;
- search/date filters;
- highly readable chronological table;
- security/audit content presented without visual drama.

COMRDY application:

- Audit Log;
- evidence/event history;
- user/integration changes.

### GitHub pull-request diff

Refero screen ID: `4b64c360-ee73-4c4e-91e2-1c7a9b923f8b`  
Source: `github.com`

Observed pattern:

- side-by-side comparison;
- context maintained around exact changed lines;
- red/green semantics tied to difference, not decoration;
- secondary tree/navigation supports inspection.

COMRDY application:

- Counterfactual Replay;
- before/after merchant state;
- protocol comparison;
- expected vs observed values.

### PayPal activity/transaction interfaces

Refero search surfaced PayPal Activity and invoice filtering screens/flows.  
Source: `paypal.com`

Observed pattern:

- transaction search is a first-class task;
- date/status filters are visible and reversible;
- payment state/amount is legible before secondary metadata;
- detail transitions preserve transaction context.

COMRDY application:

- payment-event filters;
- case detail hierarchy;
- transaction amount/status placed near decision state.

---

## 4. Flows researched

### OpenAI developer onboarding and API-key setup

Refero flow ID: `4178`

Useful sequence:

- project creation;
- one-time credential reveal;
- immediate code examples;
- optional next step rather than blocking onboarding.

COMRDY application:

- integration setup;
- API-key creation;
- first mission quickstart.

### Appwrite dev-key flow

Refero flow ID: `6027`

Useful:

- concise create-key modal;
- immediate success/detail state;
- key appears in persistent list.

COMRDY application:

- API-key management.

### PayPal transaction search

Refero flow ID: `7382`

Useful:

- explicit search scope;
- clear no-result state;
- user can widen time/filter range.

COMRDY application:

- runs/cases/payment events.

### Refund flows

Refero surfaced refund flows across payment/business products (including PayPal-adjacent transaction patterns).

Useful:

- show amount and object being affected before confirmation;
- distinguish request, completion, and failure;
- preserve updated transaction state after refund.

COMRDY application:

- post-purchase refund verification and evidence.

---

## 5. Reference lock

### Primary direction

**Light financial infrastructure instrument.**

### Preserve

1. white/near-white canvas;
2. strong ink typography;
3. fine borders instead of decorative shadows;
4. product UI/evidence as primary visual media;
5. one restricted brand accent;
6. compact operational density.

### Borrow only

- from Convex: dark technical evidence surface for code/JSON only;
- from GitHub: high-clarity side-by-side diff semantics;
- from Mercury/Stellate: filter/table information hierarchy.

### Role rules

- Signal Blue = primary action, focus, selected interactive state; not section decoration.
- Green = verified/pass only.
- Red = actual violation/block/destructive action only.
- Amber = review/warning/inconclusive only.
- dark console = technical evidence only, never the default page canvas.
- monospace = IDs/code/invariants/data only.

### Explicit rejects

- indigo/violet AI palette;
- gradient backgrounds;
- glassmorphism;
- glowing nodes;
- robot/brain/sparkle imagery;
- giant rounded cards;
- warm cream + serif + earth-tone editorial trend;
- one italic/serif word inside a sans headline;
- shield/check logo cliché;
- decorative terminals with fake logs;
- vague `AI-powered`, `seamless`, `next-generation` marketing copy.

---

## 6. Token commitments

### Canvas

- `#FFFFFF` primary.
- `#FBFCFD` secondary page region.
- `#F7F8FA` muted field/table background.

### Ink

- `#0C1117` strongest.
- `#202833` primary copy.
- `#47515E` secondary copy.
- `#697586` tertiary copy.

### Border

- `#D9DEE5` default.
- `#EEF1F4` subtle divider.

### Brand accent

Signal Blue:

- core `#0B63F6`;
- hover `#0958DD`;
- active `#084FC7`;
- soft `#EAF2FF`.

### Semantics

Pass: `#147D3F` / `#ECF8F0`  
Review: `#8A5B00` / `#FFF7E0`  
Violation: `#B42318` / `#FFF0EE`

---

## 7. Typography lock

### Geist Sans

- all UI and marketing copy;
- weights 400/500/600;
- no unnecessary 700/800 heaviness;
- negative tracking at display sizes.

### Geist Mono

Only:

- contract expressions;
- transaction IDs;
- timestamps where alignment matters;
- code snippets;
- hashes;
- raw JSON.

No decorative code font in ordinary headings.

---

## 8. Signature design mechanism: Intent Lineage

This is the visual that should make COMRDY recognizable even with the logo hidden.

Rows are transaction attributes. Columns are checkpoints.

```text
                 MANDATE     AGENT       CART        CHECKOUT     AUTH        DECISION
Product          Ocean       Ocean       Ocean       Ocean        Ocean       —
Color            Blue        Blue        Blue        Blue         Blue        —
Size             M           M           S  ← drift  S            S           BLOCK
Quantity         1           1           1           1            1           —
Final total      ≤160        139         139         148          148         —
Subscription     No          No          No          No           No          —
```

Interaction:

- neutral cells stay low contrast;
- first divergent cell gets semantic danger treatment;
- later propagated invalid cells use a lighter danger tint;
- click a cell -> right drawer with source snapshot, timestamp, evidence, invariant result;
- horizontal position makes drift legible without reading prose.

This mechanism should appear:

- marketing hero;
- case detail;
- video;
- social image;
- docs.

---

## 9. Decision ledger

| Decision | Research source | Rule adapted | COMRDY rationale |
|---|---|---|---|
| Light canvas | Brex + shadcn | high-trust, product-first | avoids generic dark AI tool |
| Geist Sans | shadcn | precise technical sans | strong UI density, available web font |
| Thin borders | shadcn + Attio | structure over shadow | audit-grade information hierarchy |
| Signal Blue CTA | Brex accent discipline | one action accent | clear interactivity without color noise |
| Dark evidence console | Convex | dark only for code/evidence | separates raw trace from normal UI |
| Filter + table operations | Stellate | dense metrics workflow | runs are investigative, not card dashboards |
| Audit table | Mercury | chronological enterprise log | trust/security readability |
| Side-by-side diff | GitHub | semantic comparison | ideal for replay and protocol drift |
| One-time API secret | developer onboarding flows | reveal once + copy | standard safe key UX |
| Product evidence in hero | Brex/Attio | real UI is imagery | proves product rather than selling abstraction |

---

## 10. Pre-ship anti-slop QA

- [ ] no violet/indigo gradient appears;
- [ ] no section exists only to hold three generic feature cards;
- [ ] cards are used only for interactive/self-contained objects;
- [ ] no text says `revolutionary`, `seamless`, `next-generation`, `AI-powered` without concrete meaning;
- [ ] no abstract AI illustration;
- [ ] hero product evidence is real and readable;
- [ ] status color always means status;
- [ ] monospace always means technical data;
- [ ] headings are sans, not decorative serif swaps;
- [ ] homepage first viewport is recognizably about transaction assurance;
- [ ] app screenshots could plausibly sit beside real payment/devtool products;
- [ ] mobile states are purpose-designed rather than shrunk desktop tables.
