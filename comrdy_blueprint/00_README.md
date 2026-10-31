> Implementation notice (2026-11-01): the focused hackathon scope in [IMPLEMENTATION_SCOPE](../docs/IMPLEMENTATION_SCOPE.md), the root README, and CURRENT_HANDOFF supersede the original SaaS scope, schedules, and unverified claims below. The original blueprint is retained as design history.

# COMRDY Product Blueprint

Version: 0.1
Date: 2026-10-06
Domain: comrdy.com
Working category: Agentic Commerce Transaction Assurance

## One-line product definition

COMRDY tests and verifies whether an AI shopping agent preserves the customer's authorized intent from product selection through cart, checkout, PayPal authorization, capture, order creation, and refund.

## Core insight

A payment can succeed and still be the wrong purchase.

COMRDY does not treat `PAYMENT_COMPLETED` as success by itself. It compares the actual economic outcome with a deterministic intent contract compiled from the shopper mandate.

## Primary product metrics

- Agent Transaction Reliability (ATR): correct economic outcomes / valid missions.
- False Success Rate (FSR): technically completed transactions that violate the mandate / technically completed transactions.
- Hard Failure Rate (HFR): missions that fail before a valid transaction outcome / valid missions.
- Prevented Invalid Value (PIV): total value of invalid authorizations or captures blocked by COMRDY.
- Intent Fidelity: weighted percentage of invariant checks that stayed true from mandate to final outcome.

## Hackathon scope lock

Build the product as a real SaaS architecture, but ship a narrow, undeniable hackathon slice:

1. Intent Contract Compiler.
2. Synthetic shopper runner.
3. Deterministic invariant engine.
4. PayPal Sandbox authorize -> verify -> capture or block.
5. Commerce Chaos fault injection.
6. Intent Lineage + false-success evidence view.
7. Counterfactual replay for one failed mission.
8. One controlled demo store with reproducible faults.

Do not make PayPal Agent Ready, Store Sync, or restricted partner access a blocking dependency. Use public PayPal Sandbox Orders/Payments APIs as the guaranteed core path.

## Product principles

1. Deterministic money decisions. LLMs may interpret intent; they do not authorize money movement.
2. Evidence over scores. Every finding must include source intent, observed state, violated invariant, and transaction evidence.
3. Real financial lifecycle. Testing continues past checkout into authorization, capture, order state, refund, and cancellation.
4. Reproducible failure. Every run has a seed, environment snapshot, agent version, contract version, and event timeline.
5. Low-trust by default. The system assumes prices, inventory, shipping, discounts, retries, agent decisions, and protocols can drift.
6. Light, precise interface. COMRDY should look like payment infrastructure, not an AI demo.

## Document map

- `01_PRODUCT_STRATEGY.md` - category, ICP, moat, differentiation, scope.
- `02_PRD.md` - full product requirements and acceptance criteria.
- `03_UX_INFORMATION_ARCHITECTURE.md` - navigation, onboarding, workflows, roles.
- `04_DESIGN_SYSTEM_UI_SPEC.md` - visual system, colors, typography, components.
- `05_ERD_DATA_MODEL.md` - relational model and Mermaid ERD.
- `06_BACKEND_ARCHITECTURE_API.md` - services, queues, API contracts, run state machine.
- `07_ENGINE_INTENT_ASSURANCE.md` - intent contracts, invariant graph, chaos, replay, scoring.
- `08_PAYPAL_INTEGRATION.md` - exact PayPal Sandbox architecture and safety rules.
- `09_FRONTEND_SCREEN_SPECS.md` - screen-by-screen product UI specification.
- `10_MARKETING_SITE.md` - homepage IA, copy, SEO, product pages, conversion paths.
- `11_DEMO_STORE_TEST_PLAN.md` - demo merchant, seeded faults, mission library.
- `12_VIDEO_SUBMISSION.md` - under-3-minute Devpost video production plan and voiceover.
- `13_SECURITY_QA_OBSERVABILITY.md` - security model, QA, accessibility, reliability.
- `14_BUILD_PLAN.md` - monorepo, weekly execution plan, P0/P1/P2 backlog.
- `15_REFERO_RESEARCH.md` - research references and design decision ledger.
- `16_GTM_PRICING_ROADMAP.md` - commercialization, packaging, roadmap, defensibility.
- `17_ANALYTICS_COPY_EVENTS.md` - product analytics and UI language system.
- `18_DEV_HANDOFF.md` - environment, CI, local run, demo mode, definition of done.
- `19_SOURCES.md` - official PayPal/Devpost sources, competition references, Refero research index.
- `20_BRAND_ASSET_PRODUCTION.md` - wordmark, favicon, imagery, OG/social, video/asset production rules.
- `21_HACKATHON_SUBMISSION.md` - final hackathon positioning, judge strategy, screenshots, claim boundaries, submission checklist.

## Recommended stack

### Web and product UI
- Next.js, React, TypeScript.
- Tailwind CSS.
- shadcn/ui primitives, customized to COMRDY tokens.
- AG Grid for high-density run and transaction tables.
- Recharts or a similarly small chart library only where a chart adds operational value.

### Backend
- TypeScript API service.
- PostgreSQL.
- Drizzle ORM or direct typed SQL.
- Redis-compatible queue/cache.
- Dedicated worker service for agent runs and replay.
- S3-compatible object storage for screenshots, trace payloads, and evidence artifacts.

### Agent execution
- KERNEL or equivalent isolated cloud browser sessions for browser-agent tests.
- Playwright inside controlled demo and fallback execution paths.
- LLM provider only for contract compilation, mission generation, root-cause assistance, and remediation drafting.

### Payments
- PayPal Sandbox.
- Orders v2 with `AUTHORIZE` intent.
- Payments v2 to capture authorized payments only after COMRDY passes verification.
- PayPal webhooks for asynchronous state reconciliation.

### Deployment
- Vercel for marketing/product web.
- Render or equivalent long-running infrastructure for API/worker.
- Managed PostgreSQL.
- Managed Redis.

## Brand lock

- Name: COMRDY.
- Primary message: `A payment can succeed and still be wrong.`
- Product explanation: `COMRDY proves whether an AI shopper stayed inside the customer's intent before money is captured.`
- Wordmark first. Do not rush an AI-generated icon for the hackathon.
- No gradients, glassmorphism, purple AI styling, floating sparkles, decorative 3D, shield-check cliches, or generic “agent” mascots.
