# COMRDY UX and Information Architecture

## 1. UX thesis

COMRDY is an operational developer/finance product. The interface should answer three questions in this order:

1. **What happened?**
2. **Was it allowed?**
3. **Where did it drift?**

The UX must never force users to interpret a decorative “AI score” before seeing evidence.

## 2. Product navigation

Desktop left navigation:

```text
COMRDY

Overview
Runs
Test suites
Missions
Contracts

Assurance
  Violations
  Replays
  Chaos

Build
  Targets
  Agents
  Integrations
  API keys

Workspace
  Team
  Audit log
  Settings
```

Hackathon MVP may hide unimplemented sections rather than showing dead navigation.

Top bar:
- workspace switcher;
- environment badge (`Sandbox` always visible in hackathon);
- global search / command shortcut;
- docs/help;
- user menu.

## 3. Marketing site information architecture

```text
/
/product
/how-it-works
/paypal
/security
/docs
/research          later
/pricing           beta/later
/changelog         later
```

Primary public CTA during hackathon: `Run the demo`.
Secondary CTA: `View source`.

Do not force signup before a visitor can understand the product.

## 4. First-run onboarding

Goal: first evidence in <15 minutes.

### Step 1 - Welcome

Headline: `Prove your first agent transaction.`

Choices:
- `Use COMRDY demo store` - recommended.
- `Connect a staging store` - advanced.

The recommended path must be visually dominant without calling the advanced path “expert mode.”

### Step 2 - PayPal Sandbox

Two modes:
- `Use COMRDY demo sandbox` for hosted demo.
- `Connect my PayPal Sandbox` for developer installation.

Show exactly what credentials are required and state that secrets are encrypted and never displayed again.

### Step 3 - Mission pack

Default pack: `Transaction integrity starter pack`.

Contains:
- correct purchase;
- budget cap;
- wrong variant;
- shipping over cap;
- discount removal;
- inventory loss;
- duplicate retry;
- subscription mutation;
- refund mismatch.

Allow deselection, but preselect all for demo.

### Step 4 - Review contract

Show one representative compiled contract rather than nine forms.

Two-column arrangement:
- left: original mandate;
- right: deterministic constraints.

CTA: `Run 9 missions`.

### Step 5 - Live run

Take user directly into a streaming run page instead of a generic success page.

## 5. Core flow: create mission

```text
Missions
  -> New mission
     -> Buyer mandate
     -> Compile contract
     -> Review hard constraints
     -> Choose agent / target
     -> Optional chaos
     -> Save or Run now
```

### Buyer mandate screen

One large plain textarea, not a chatbot.

Example placeholder:
`Buy the Ocean Shell in blue, size M. Spend no more than $150 delivered. Do not substitute another size and do not start a subscription.`

Below:
- target;
- variable presets;
- advanced controls collapsed.

CTA: `Compile contract`.

### Contract review

Display hard constraints as a compact table:

| Constraint | Operator | Value | Hard? |
|---|---|---|---|
| product.slug | = | ocean-shell | Yes |
| variant.color | = | blue | Yes |
| variant.size | = | M | Yes |
| total | <= | 150 USD | Yes |
| substitution | = | false | Yes |
| subscription | = | false | Yes |

Do not render each constraint as a separate rounded card.

## 6. Core flow: run detail

Header:
- suite name;
- target;
- agent profile;
- started time;
- run status;
- actions: `Stop`, `Replay failures`, `Export`.

### Summary strip

Use one horizontal strip, not four floating cards.

```text
ATR 66.7% | False successes 6 | Hard failures 3 | Prevented $428
```

Each item is clickable and filters the mission table.

### Main run table

Columns:
- Mission
- Result
- Drift
- Authorized
- Captured
- Total
- Duration
- Agent
- Evidence

Use AG Grid virtualization, column pinning, keyboard navigation, server-side filter state for real product.

Row result labels:
- PASS
- FALSE SUCCESS
- HARD FAIL
- INDETERMINATE
- INFRA

### Live mode

Rows appear as cases progress. A subtle activity indicator can appear in the status cell; do not animate the entire row.

## 7. Core flow: transaction detail

This is the product's signature screen.

### Header band

Left:
`False success blocked`

Right:
`PayPal authorization $178.00` / `Capture blocked`

Below:
- transaction/case ID;
- mission;
- target;
- agent;
- run link.

### Intent Lineage

Primary visualization.

Columns are checkpoints:

```text
Mandate -> Agent -> Cart -> Checkout -> Authorization -> Decision
```

Rows are attributes:

```text
Product
Color
Size
Quantity
Item price
Shipping
Tax
Total
Currency
Subscription
```

Values remain neutral while unchanged. At the first invalid transition:
- cell gets semantic danger background;
- previous -> new value shown;
- invariant code appears;
- small evidence link opens relevant screenshot/event.

Example:

```text
Size     M | M | S | S | S | DENY
                  ^
             INV_VARIANT_SIZE
```

### Why it was blocked

Plain sentence:
`Checkout changed size M to S. The mission forbids substitution.`

Then deterministic rule:
`variant.size == "M"`

### Payment state

Use a vertical event timeline:
- order created;
- buyer approved;
- payment authorized;
- COMRDY verification failed;
- capture skipped.

### Evidence drawer

Right-side drawer on desktop / bottom sheet on mobile:
- screenshot;
- DOM/tool snapshot;
- normalized state JSON;
- redacted PayPal payload;
- event hash/time.

### Actions

- `Replay transaction`
- `Add to regression suite`
- `Copy evidence link`
- `Open raw trace`

## 8. Replay flow

Open as a full page, not a small modal.

Left side: Original.
Right side: Replay.

Top control:
`Change one variable`

Choices:
- Chaos profile
- Agent profile
- Model
- Prompt version
- Execution path

Everything else is locked by default.

Results compare:
- outcome;
- first drift point;
- total;
- capture decision;
- duration;
- step count.

A GitHub-style side-by-side diff is used for normalized event/state differences.

## 9. Chaos flow

Chaos is not hidden under “AI settings.” It is a test-engineering feature.

`Chaos` page:
- profiles list;
- active rules;
- deterministic seed;
- scope;
- trigger checkpoint;
- mutation action.

New rule form:

```text
At: CHECKOUT_READY
When: product.slug == "ocean-shell"
Mutate: shipping.total
From: current
To: +25 USD
Once per case: yes
```

Danger notice:
`Chaos runs only against targets marked Demo or Staging.`

## 10. Integrations UX

Cards are justified here because each integration is an actionable object.

Integration rows/cards:
- PayPal Sandbox;
- Browser Runner;
- Object Storage;
- Webhook endpoint;
- future structured protocols.

Each displays:
- status;
- environment;
- last verified;
- action.

Never display credential secrets after save.

## 11. API key UX

Pattern based on one-time secret reveal:

1. List page.
2. `Create API key` modal.
3. Name + scopes + expiration.
4. Secret revealed once.
5. Copy confirmation.
6. Return to masked key list.

Scopes:
- runs:read
- runs:write
- evidence:read
- projects:read

Production gate scopes are future/enterprise only.

## 12. Role model

### Owner
All actions, billing, delete workspace.

### Admin
Manage targets, integrations, users, suites, API keys.

### Member
Create/run tests, view evidence, create replays.

### Viewer
Read-only results and evidence.

Financial/runtime gate policy changes require Admin or Owner.

## 13. Empty states

### No runs
`No runs yet. Run the starter suite to verify your first agent transaction.`
CTA: `Run starter suite`

### No false successes
`No false successes in this range.`
Secondary sentence: `All completed transactions matched their hard intent constraints.`
No confetti.

### No PayPal integration
`Connect PayPal Sandbox before testing authorization and capture.`
CTA: `Connect PayPal Sandbox`

### No evidence
`Evidence was not recorded for this checkpoint.`
Show technical reason if available.

## 14. Error handling

Errors use specific remediation.

Bad:
`Something went wrong.`

Good:
`PayPal authorization timed out before an authorization ID was returned. No capture was attempted. Retry this case.`

## 15. Responsive behavior

### Desktop >= 1280
- persistent left navigation;
- full Intent Lineage table;
- right evidence drawer;
- multi-column diff/replay.

### Tablet 768-1279
- collapsible rail;
- lineage horizontally scrollable with sticky attribute column;
- evidence opens full-width drawer.

### Mobile <768
The product remains usable for review, not ideal for authoring complex suites.
- bottom or overlay navigation;
- run table becomes mission list;
- lineage becomes checkpoint accordion per attribute;
- no forced tiny desktop table.

## 16. Command/search

Global command palette:
- Open run by ID.
- Open transaction by ID.
- Run suite.
- New mission.
- Open integrations.

Keyboard shortcuts are discoverable, not required.

## 17. UX quality rules

- Do not use chat bubbles for ordinary configuration.
- Do not wrap every section in a card.
- Do not show meaningless AI confidence percentages.
- Do not collapse raw evidence behind generated prose only.
- Use tables for comparable structured data.
- Use drawers for drill-down that should preserve context.
- Use full pages for investigations/replay.
- Keep payment state distinct from test result state.
- Always show Sandbox/Staging environment near financial actions.
