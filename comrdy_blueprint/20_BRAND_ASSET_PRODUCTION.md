# COMRDY Brand & Asset Production Brief

Version: 0.1

The brand should look like a transaction infrastructure company, not an AI startup. The product itself is the visual identity carrier.

---

## 1. Name

**COMRDY**

Interpretation: Commerce Ready, but the brand should not constantly spell this out. The name can evolve beyond readiness as the product becomes an assurance layer.

Domain: `comrdy.com`

### Capitalization

Preferred wordmark: `COMRDY`.

Product prose may use `COMRDY`. Avoid `ComRdy`, `Comrdy.ai`, or mixed camel-case variants.

---

## 2. Brand thesis

COMRDY is the layer that separates:

> **Payment success**

from:

> **Transaction correctness**

Brand attributes:

- exact;
- technical;
- financially credible;
- evidence-first;
- calm under failure;
- not futuristic for its own sake.

---

## 3. Wordmark

For the hackathon, use a typographic wordmark rather than rushing a symbol.

### Construction direction

- uppercase geometric/neo-grotesk wordmark;
- custom kerning based on Geist/Helvetica-like proportions;
- compact but not condensed;
- `COM` and `RDY` are one continuous word, not two colors;
- no speed lines, arrows, checkmarks, shields, sparkles, circuit traces, or payment-card icons.

### Color

Default:

- Ink `#0C1117` on white;
- white on Ink for dark footer/evidence contexts.

Signal Blue is not required in the wordmark.

### Clear space

Minimum clear space: height of the `O` counter around all sides.

### Minimum size

- web header: 92-108 px wide depending on final letterform;
- favicon uses monogram separately, not microscopic full word.

---

## 4. Monogram / favicon

Do not invent a complicated icon.

Recommended hackathon monogram:

> `CR`

or a custom `C` built from two horizontal transaction-state bars if a designer can make it distinctive without becoming a checkmark.

Requirements:

- works at 16x16;
- one color;
- no gradient;
- no payment-card silhouette;
- no shield.

Deliver:

- `favicon.ico`;
- `icon-16.png`;
- `icon-32.png`;
- `apple-touch-icon.png`;
- SVG monogram.

---

## 5. Primary colors

### Canvas

`#FFFFFF`

### Ink

`#0C1117`

### Signal Blue

`#0B63F6`

Signal Blue is an **interaction color**. Use it for:

- primary CTA;
- active/selected interactive state;
- focus/links;
- tiny product brand moments.

Do not turn it into:

- full-page blue gradients;
- decorative blobs;
- every icon;
- card backgrounds.

Semantic colors remain separate; see `04_DESIGN_SYSTEM_UI_SPEC.md`.

---

## 6. Image strategy

### Marketing

Primary media should be:

1. real COMRDY product UI;
2. Intent Lineage compositions;
3. precise transaction/evidence diagrams;
4. occasional Northpath demo-store screenshot.

Avoid stock photography unless a future editorial campaign specifically requires it.

### Product images

When product imagery is needed for Northpath:

- plain packshot-like outdoor products;
- neutral light backgrounds;
- no visible brand marks;
- no people required;
- consistent lighting and crop;
- 4:5 master assets, rendered into store aspect ratios.

These can be generated, but should never be the visual centerpiece of COMRDY's own marketing.

---

## 7. Signature graphic system

The brand's recurring graphic is **state lineage**.

Visual grammar:

- left-to-right checkpoints;
- horizontal data continuity;
- first divergence emphasized;
- evidence attached to state, not floating decoration;
- rows/columns based on real transaction attributes.

Use it in:

- hero;
- OG image;
- conference/hackathon screenshots;
- docs diagrams;
- social launch posts.

Do not create generic flowchart spaghetti. Keep state names and values readable.

---

## 8. Diagram language

Architecture diagrams:

- white canvas;
- 1px gray connectors;
- rectangular nodes with 6-8 px radius;
- Signal Blue only for active COMRDY boundary;
- red only for violation/block;
- dashed line only for async/webhook/event relation;
- no neon glows.

Recommended architecture diagram:

```text
Human mandate
    ↓
Intent Contract ────────┐
    ↓                   │
Agent → Merchant → PayPal Authorization
             ↓          │
        State snapshots │
             ↓          │
      Invariant Engine ←┘
          ↙       ↘
       ALLOW      BLOCK
         ↓
      Capture
```

---

## 9. Social/OG asset

Size: 1200x630.

Composition:

- white canvas;
- small COMRDY wordmark top-left;
- headline left/top:
  `A payment can succeed and still be wrong.`
- large Intent Lineage crop spanning lower 60%;
- size-M → size-S drift visible;
- right edge or footer: `comrdy.com`;
- no “AI” iconography.

The screenshot/lineage should do more work than the headline.

---

## 10. Devpost gallery assets

Prepare at minimum:

1. Hero — Intent Lineage false success.
2. Case detail — exact invariant violation.
3. PayPal panel — Authorized / COMRDY Block / Capture not sent.
4. Commerce Chaos — fault profile and result.
5. Differential comparison — same mission, different paths.
6. Architecture — human intent to payment outcome.

Each image should be legible on its own, not a dense contact sheet.

---

## 11. Screenshot standards

- use seeded demo data only;
- hide browser chrome unless context helps;
- no personal avatar/email;
- use same project/workspace name across assets;
- no fake logos/customers;
- status colors must match product tokens;
- timestamps/IDs may be truncated but must look real, not lorem ipsum;
- do not show unfinished navigation items.

---

## 12. Motion asset standards

For landing-page motion, prefer recorded/reconstructed product behavior:

- cursor optional;
- 6-10 second loops;
- silent;
- under 2 MB where feasible after optimization;
- pause when out of viewport;
- respect reduced-motion;
- never autoplay a heavy full-screen hero video on mobile.

Good loop:

1. cart size changes M -> S;
2. Lineage detects first divergence;
3. `Authorized` appears;
4. `BLOCK` decision appears;
5. capture remains `Not sent`.

---

## 13. Asset directory

```text
public/
  brand/
    comrdy-wordmark.svg
    comrdy-wordmark-inverse.svg
    comrdy-monogram.svg
    favicon.ico
    apple-touch-icon.png
  marketing/
    og-home.png
    hero-lineage.webp
    chaos.webp
    replay.webp
    paypal-gate.webp
  demo-store/
    products/
  video/
    title-card.png
    end-card.png
```

---

## 14. Brand QA

Before publishing an asset:

- [ ] would this still look like COMRDY if the word `AI` disappeared?
- [ ] is the graphic based on actual product evidence?
- [ ] is Signal Blue used for interaction/brand rather than decoration?
- [ ] are semantic colors truthful?
- [ ] is there any generic sparkle/brain/robot/shield cliché?
- [ ] are fonts only Geist Sans/Mono or the final approved wordmark construction?
- [ ] are screenshots real product states?
- [ ] are no third-party marks used without a reason/permission?
