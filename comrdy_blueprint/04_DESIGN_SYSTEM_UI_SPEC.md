# COMRDY Design System and UI Specification

## 1. Design north star

**A financial test instrument, not an AI product.**

COMRDY should feel like a tool a payments engineer can trust during an incident: light, exact, calm, high-contrast, data-first, and visibly deterministic.

The product must not look like a generic AI SaaS template.

## 2. Reference lock

### Primary marketing reference role: Brex
Preserve:
- white/light neutral canvas;
- high confidence sans typography;
- product-first screenshots;
- contained max-width layout;
- one strong action accent;
- minimal shadow.

Do not copy:
- Brex orange;
- proprietary headline type;
- exact card/layout proportions.

### Product UI reference role: shadcn/UI style discipline
Preserve:
- monochrome base;
- clear 1px borders;
- compact density;
- practical component states;
- Geist-like technical typography;
- low decoration.

### Technical evidence role: Convex
Borrow only:
- dark code/evidence panels for raw payloads;
- monospace as a functional contrast;
- syntax colors confined to code/raw evidence.

### Operational dashboard structure: Stellate + Mercury
Borrow:
- dense filterable metrics/table layout;
- stable sidebar and main workspace;
- chronological audit clarity;
- detail drawer for traces.

### Comparison/replay pattern: GitHub diff
Borrow:
- side-by-side changed-state comparison;
- clear additions/removals/changed values;
- sticky context while investigating.

## 3. Anti-AI-slop constraints

Hard rejects:
- indigo/violet brand palette;
- gradient blobs;
- glassmorphism;
- glowing borders;
- generic 3D shapes;
- “AI brain” or sparkle icons;
- shield/checkmark logo cliché;
- cards around every text block;
- default dark mode;
- serif headline with one decorative italic word;
- fake terminal windows used as decoration;
- multi-color rainbow dashboards;
- motivational product copy;
- tiny unreadable gray text;
- enormous 80px hero headline with no product evidence;
- left accent stripes unless they encode status.

## 4. Brand identity

### Name treatment
Use `COMRDY` in uppercase in the wordmark and legal/product contexts.

Do not visually expand it to “Commerce Ready” in the logo. The explanation belongs in copy, not the mark.

### Logo for hackathon
Wordmark only.

Reason:
- avoids a rushed AI-generated logo;
- creates a serious infrastructure identity;
- makes the unusual name itself memorable.

Recommended wordmark styling:
- Geist Sans or equivalent;
- 650/700 weight;
- uppercase;
- tracking `-0.03em` at large sizes, `0` in navigation;
- no symbol attached.

Later, a custom typographic mark can modify one glyph after professional logo work.

## 5. Color system

No gradients in the core product.

### Neutral scale

| Token | Hex | Use |
|---|---|---|
| `--c-white` | `#FFFFFF` | page / primary surfaces |
| `--c-gray-25` | `#FBFCFD` | alternate section background |
| `--c-gray-50` | `#F7F8FA` | app shell secondary surface |
| `--c-gray-100` | `#EEF1F4` | hover / disabled surface |
| `--c-gray-200` | `#D9DEE5` | default border |
| `--c-gray-300` | `#B8C0CC` | strong border |
| `--c-gray-500` | `#697586` | tertiary text / icons |
| `--c-gray-650` | `#47515E` | secondary text |
| `--c-gray-800` | `#202833` | strong secondary text |
| `--c-gray-950` | `#0C1117` | primary text / dark controls |

### Brand accent: Signal Blue

| Token | Hex | Use |
|---|---|---|
| `--c-brand-50` | `#EAF2FF` | selected tint / info background |
| `--c-brand-100` | `#D6E6FF` | light interaction background |
| `--c-brand-500` | `#0B63F6` | primary brand interaction |
| `--c-brand-600` | `#0958DD` | hover |
| `--c-brand-700` | `#084FC7` | pressed |
| `--c-brand-900` | `#06398F` | high contrast brand text |

Rules:
- Brand blue is for navigation selection, links, focus, and primary marketing CTA.
- It is not a success color.
- Do not flood page backgrounds with blue.
- Do not create blue gradients.

### Semantic success

- text/icon: `#147D3F`
- background: `#ECF8F0`
- border: `#A9DDBB`

### Semantic warning/review

- text/icon: `#8A5B00`
- background: `#FFF7E0`
- border: `#E9C66A`

### Semantic danger/blocked

- text/icon: `#B42318`
- background: `#FFF0EE`
- border: `#F0A8A0`

### Semantic neutral/unknown

- text/icon: `#47515E`
- background: `#F2F4F7`
- border: `#D9DEE5`

### Evidence console

Use dark only where raw technical content benefits from it.

- background: `#101419`
- raised: `#171C22`
- text: `#E7EDF4`
- muted: `#9DA9B8`
- border: `#2B333D`
- syntax colors are confined to code/evidence only.

## 6. Typography

### Primary
`Geist Sans`, with system fallback.

Roles:
- marketing display;
- product headings;
- body;
- controls;
- tables.

### Monospace
`Geist Mono` or `IBM Plex Mono`.

Use only for:
- IDs;
- invariant expressions;
- JSON;
- timestamps where useful;
- code;
- hashes;
- API keys.

Do not use monospace for entire dashboard body copy.

### Type scale

| Role | Desktop | Mobile | Weight | Line height |
|---|---:|---:|---:|---:|
| Marketing display | 64 | 42 | 600 | 1.02 |
| H1 app | 32 | 28 | 600 | 1.15 |
| H2 | 24 | 22 | 600 | 1.2 |
| H3 | 18 | 18 | 600 | 1.3 |
| Body | 15 | 15 | 400 | 1.55 |
| UI | 14 | 14 | 450/500 | 1.4 |
| Small | 12 | 12 | 450/500 | 1.45 |
| Micro | 11 | 11 | 500 | 1.35 |

Tracking:
- display: `-0.035em`;
- H1/H2: `-0.02em`;
- UI labels: `0.005em`;
- uppercase labels: `0.075em`;
- small 11-12px text: `0.015em`.

Use `font-variant-numeric: tabular-nums` for amounts, metrics, timestamps, and table numbers.

## 7. Layout

### Marketing
- max content width: 1280px;
- page gutter: 24px mobile, 40px tablet, 64px desktop;
- hero content width: 980px max;
- section spacing: 96-136px desktop, 64-88px mobile;
- dominant product evidence should occupy 65-85% of viewport width where shown.

### App shell
- nav width: 232px expanded;
- compact rail: 64px;
- top bar: 52px;
- workspace max width: none for tables; 1480px preferred for narrative/detail screens;
- detail reading measure: 72ch max for explanatory prose.

## 8. Spacing system

Base 4px.

Tokens:
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`

Default component inner spacing: 12-16px.
Default section gaps in app: 24-32px.

## 9. Radius

- button: 7px;
- input/select: 7px;
- small tag: 5px;
- card only where justified: 9px;
- drawer/modal: 10px;
- evidence/code: 8px;
- never use 20-32px “soft SaaS” radii.
- pills only for compact filters/status tokens where shape carries meaning.

## 10. Borders and elevation

Default hierarchy is created with borders and background tone, not shadow.

- default border: 1px `#D9DEE5`;
- stronger split: `#B8C0CC`;
- subtle shadow only for popover/modal: `0 8px 30px rgba(12,17,23,.10)`;
- simple cards have no shadow.

## 11. Buttons

### Primary
- background: `#0C1117` inside product;
- marketing hero primary may use `#0B63F6`;
- white text;
- 7px radius;
- 36-40px height.

Product uses dark primary because operational UI should not look promotional.

### Secondary
- white background;
- 1px gray border;
- primary text.

### Destructive
- red text or red fill only for real destructive actions.

### Financial action
Capture/Refund buttons require explicit labels:
- `Capture authorized payment`
- `Issue sandbox refund`

Never use generic `Confirm`.

## 12. Status tokens

Status token = icon + text + optional background.

Examples:
- `PASS`
- `FALSE SUCCESS`
- `BLOCKED`
- `AUTHORIZED`
- `CAPTURED`
- `REVIEW`
- `INFRA`

Do not rely on green/red alone.

## 13. Tables

Tables are a major COMRDY surface.

Rules:
- 40-44px row height desktop;
- sticky header;
- tabular numerals;
- left-align text, right-align currency/numbers;
- do not center most columns;
- filters use top toolbar and column menus;
- selected row uses brand-50 background;
- status cells use compact semantic label;
- row hover is gray-25/50, not blue glow.

AG Grid should be customized to remove heavy enterprise visual chrome.

## 14. Intent Lineage component

This is the signature COMRDY visual.

### Structure
- fixed left attribute column;
- horizontal checkpoint columns;
- value cells;
- thin connective arrow/rule between checkpoints;
- first invalid transition emphasized;
- later inherited invalid values remain visibly linked but less intense.

### Visual states
- unchanged/pass: neutral;
- changed but allowed: brand soft + `changed` label;
- failed: danger background/border;
- unknown: warning/neutral hatch is forbidden; use explicit `Unknown` label.

### Interaction
- hover/focus on a cell shows checkpoint time and source;
- click opens evidence drawer;
- keyboard arrows move between cells;
- sticky row/column labels.

## 15. Timeline

Payment/evidence timeline uses a single vertical rule and nodes.

Node shape:
- circle 8px;
- semantic fill if state is terminal;
- timestamp + title + short factual summary.

No large illustrated stepper.

## 16. Charts

Only use charts when they answer a trend/comparison question.

Allowed:
- ATR over time line;
- false success by violation horizontal bar;
- agent/protocol reliability comparison.

Avoid:
- donut charts for 2 values;
- gauge/speedometer;
- decorative area gradients;
- 3D charts.

## 17. Icons

Use Lucide or Phosphor, one library only.

Style:
- 16px default;
- 1.75-2px stroke;
- monochrome;
- semantic color only when state matters.

No emoji.

## 18. Motion

Motion should explain state change.

- 120-180ms UI transitions;
- table row progress uses small spinner;
- new event can fade/translate 4px;
- lineage failure can briefly highlight once;
- no ambient floating motion;
- respect `prefers-reduced-motion`.

## 19. Forms

- label always visible;
- hint text below only if necessary;
- validation near field;
- monospace only for technical secrets/URLs where helpful;
- advanced configuration collapsed by default;
- never use placeholder as label.

## 20. Marketing composition

Do not use generic left-text/right-image hero.

Homepage first viewport:
1. centered wordmark/nav;
2. full-width concise headline;
3. two CTAs;
4. one sentence of proof/context;
5. a wide Intent Lineage product visualization beginning inside the first viewport and extending below fold.

This makes the product mechanism, not a stock illustration, the visual identity.

## 21. Accessibility

- WCAG 2.2 AA.
- Focus ring: 2px brand-500 with 2px offset on white.
- Body text contrast >= 4.5:1.
- UI/graphic controls >= 3:1.
- no color-only status.
- evidence screenshots need descriptive alt/context text.
- data visualizations need table fallback or accessible labels.

## 22. Design QA checklist

Before shipping any screen:

- Is every card necessary?
- Is the most important operational fact visible without reading generated prose?
- Can a user distinguish authorization from capture?
- Is the environment visible near payment actions?
- Does each semantic color retain one meaning?
- Are raw IDs and amounts aligned with tabular numerals?
- Is generated copy clearly advisory when present?
- Does the screen still make sense with brand blue removed?
- Would this screenshot look plausible next to real financial/dev tools rather than an AI template?
