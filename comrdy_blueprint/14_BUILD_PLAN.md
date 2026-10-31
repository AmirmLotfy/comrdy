# COMRDY Build Plan

Version: 0.1  
Target submission: 2026-11-12 12:00 PM PST.

The plan assumes a focused small team or one strong builder using coding agents. The product architecture is real; the submission scope is intentionally narrow.

---

## 1. Priority model

### P0 — must ship for the hackathon thesis

- auth + one workspace/project;
- controlled demo merchant;
- mission + Intent Contract;
- invariant engine;
- one browser-agent runner;
- PayPal Sandbox AUTHORIZE -> COMRDY gate -> capture/block;
- event/state evidence;
- Intent Lineage;
- violations/case detail;
- six deterministic chaos faults;
- replay of stored run;
- overview/runs screens;
- marketing homepage;
- public repo/docs;
- under-3-minute video.

### P1 — materially improves winning odds

- parallel synthetic suite;
- differential path comparison;
- AG Grid power filters;
- remediation suggestions;
- CI example/GitHub Action;
- shareable read-only report;
- API keys;
- post-purchase refund validation;
- polished onboarding.

### P2 — real-product roadmap, cut before P0 slips

- production runtime gate;
- broad Shopify/Magento integrations;
- multi-provider payments;
- full ACP/UCP native implementations;
- SSO/SCIM;
- billing;
- full multi-region worker fleet;
- custom enterprise retention;
- reliability benchmark network.

---

## 2. Monorepo structure

```text
comrdy/
├─ apps/
│  ├─ web/                 # marketing + authenticated app
│  ├─ demo-store/          # Northpath Supply
│  └─ worker/              # browser and run execution
├─ packages/
│  ├─ db/                  # schema, migrations, repositories
│  ├─ contracts/           # zod schemas and public types
│  ├─ invariant-engine/    # deterministic evaluator
│  ├─ commerce-state/      # normalization and diffs
│  ├─ paypal/              # PayPal adapter
│  ├─ agent-runner/        # execution abstractions
│  ├─ evidence/            # recorder, redaction, hashing
│  ├─ ui/                  # COMRDY UI primitives/tokens
│  ├─ observability/       # log/trace wrappers
│  └─ config/              # lint/tsconfig/env validation
├─ fixtures/
│  ├─ missions/
│  ├─ contracts/
│  ├─ faults/
│  └─ golden-results/
├─ docs/
├─ .github/workflows/
├─ LICENSE
└─ README.md
```

---

## 3. Recommended implementation stack

### Frontend

- Next.js App Router.
- React + TypeScript.
- Tailwind CSS.
- shadcn/Radix primitives customized to COMRDY tokens.
- AG Grid for run/violation/audit data.
- TanStack Query only where server actions/route caching are insufficient.
- Recharts for the few trend views that need charts.

### Backend

- Node/TypeScript.
- Postgres.
- Drizzle ORM.
- Redis/Valkey for queues and run locks.
- BullMQ or equivalent job queue.
- S3-compatible evidence store.
- Server-Sent Events for hackathon live run stream; avoid WebSocket complexity unless required.

### Worker

- isolated long-running worker;
- KERNEL browser sessions where available;
- Playwright local/demo fallback;
- per-case concurrency limit.

### Deploy

- Vercel: web + marketing.
- Render or equivalent: worker/API if long-running execution is not suitable for serverless.
- managed Postgres/Redis.

---

## 4. Week 1 — Foundation and transaction truth

**Oct 7-13**

### Outcome

One no-fault mission can compile, shop, authorize in PayPal Sandbox, evaluate, and capture.

### Tasks

#### Day 1

- initialize monorepo;
- lint/type/test/CI baseline;
- tokenized COMRDY design system;
- database schema and migrations;
- environment validation.

#### Day 2

- build Northpath catalog/PDP/cart/checkout;
- implement deterministic totals;
- add reset endpoint;
- create buyer fixture.

#### Day 3

- implement Intent Contract schema;
- hand-author M01 contract first;
- implement core invariant operators;
- normalized commerce-state model.

#### Day 4

- PayPal OAuth token helper;
- Orders v2 create with authorization intent;
- payer approval flow;
- authorization persistence.

#### Day 5

- COMRDY gate service;
- successful verification -> capture;
- hard failure -> no capture;
- store payment events.

#### Day 6

- case timeline/evidence recorder;
- first simple run detail UI;
- screenshot capture.

#### Day 7

- run M01 no-fault repeatedly;
- fix flakiness;
- document architecture.

**Week 1 exit gate:** 10/10 M01 no-fault runs produce correct authorization + capture.

---

## 5. Week 2 — False success and controlled chaos

**Oct 14-20**

### Outcome

COMRDY convincingly prevents wrong transactions.

### Tasks

- implement F01 variant mutation;
- implement F02 total/shipping mutation;
- F05 inventory flip;
- F07 subscription injection;
- F09 duplicate retry;
- F10 refund mismatch;
- violation taxonomy;
- first-divergence detection;
- Intent Lineage component;
- false-success metrics;
- PayPal event/reconciliation webhook flow;
- golden scenario fixtures.

**Week 2 exit gate:** each of six P0 faults reproduces 10/10 and is explained by exact invariant evidence.

---

## 6. Week 3 — Product UX and replay

**Oct 21-27**

### Outcome

The build looks like a credible infrastructure product rather than a hackathon console.

### Tasks

- authenticated app shell;
- Overview;
- Runs table;
- Run detail;
- Case detail;
- Contracts;
- Chaos profiles;
- Integrations;
- API keys if time;
- counterfactual/stored replay;
- filter/sort/export;
- AG Grid polish;
- semantic status and accessibility;
- live SSE run state.

P1 if stable:

- two agent profiles;
- browser vs structured adapter differential view;
- remediation explanation.

**Week 3 exit gate:** a new viewer can identify why a false success occurred without verbal explanation.

---

## 7. Week 4 — Public product and judge experience

**Oct 28-Nov 3**

### Outcome

COMRDY is understandable before login and easy to judge.

### Tasks

- comrdy.com homepage;
- `/product`, `/how-it-works`, `/paypal`, `/security`, `/docs` essentials;
- open-source repository README;
- one-command local setup where feasible;
- demo workspace;
- reset-demo workflow;
- responsive QA;
- error/empty/loading states;
- shareable report route;
- performance pass;
- security pass;
- source/license attribution.

**Week 4 exit gate:** incognito visitor can understand COMRDY, launch/read the demo, and find source/docs in <60 seconds.

---

## 8. Week 5 — Freeze, proof, video, submission

**Nov 4-11**

### Nov 4-6

- feature freeze P0;
- full regression suite;
- PayPal webhook/retry testing;
- secret scan;
- accessibility pass;
- production/deployment health checks;
- browser compatibility.

### Nov 7-8

- rehearse M01 hero scenario;
- seed final data;
- capture clean runs;
- record screen material;
- record voiceover.

### Nov 9

- edit v1 video;
- internal 3-minute comprehension test;
- remove slow sections.

### Nov 10

- final video export/upload;
- prepare Devpost copy/screenshots;
- verify public repo/license.

### Nov 11

- final submission dry run;
- incognito test;
- backup deployment and local-run documentation;
- submit early if everything is stable.

### Nov 12

No new feature work. Only submission verification and emergency fixes.

---

## 9. Build order by dependency

```text
Normalized Commerce State
        ↓
Intent Contract
        ↓
Invariant Engine
        ↓
PayPal Adapter
        ↓
Run State Machine
        ↓
Evidence Recorder
        ↓
Browser Runner
        ↓
Chaos Engine
        ↓
Intent Lineage UI
        ↓
Metrics / Replay / Differential
```

Do not start with a dashboard full of fake metrics. First make the transaction state real.

---

## 10. Scope-cut rules

Cut in this order if schedule slips:

1. multi-agent/provider support;
2. auto-remediation patching;
3. full docs site;
4. API key UI;
5. shareable reports;
6. differential protocol adapter;
7. extra chaos faults beyond six;
8. marketing subpages.

Never cut:

- deterministic gate;
- real PayPal Sandbox authorization/capture;
- false-success case;
- evidence;
- replay/trace of hero case;
- demo reset;
- working public repo/video.

---

## 11. Technical risk register

| Risk | Probability | Impact | Mitigation |
|---|---:|---:|---|
| Browser agent flaky | High | High | stored replay, Playwright fallback, narrow demo target |
| PayPal approval adds demo friction | Medium | High | preconfigured Sandbox buyer, rehearse, record clean run |
| Webhook delay | Medium | Medium | poll/reconcile fallback + async status |
| LLM contract compiler misparses mandate | Medium | High | schema validation + confirmation + hand-seeded hero contract |
| False positives in invariant engine | Low/Med | High | deterministic golden fixtures |
| Too many UI screens | High | Medium | build P0 routes only first |
| Restricted PayPal agent products unavailable | High | Low | do not depend on Agent Ready/Store Sync |
| Sponsor integration distracts core | Medium | Medium | AG Grid/KERNEL only where native value exists |
| Public demo abuse | Medium | Medium | rate limit, demo workspace, CAPTCHA if needed, fixed targets |

---

## 12. Git workflow

- `main` always deployable.
- short-lived feature branches.
- required checks: typecheck, unit, integration smoke, lint, secret scan.
- migrations reviewed in PR.
- no direct secret changes in code.
- release tags for video recording (`v0.1-demo-lock`).

---

## 13. Definition of hackathon done

A stranger can:

1. understand the problem from homepage in 10 seconds;
2. launch a demo run;
3. see an AI shopper reach PayPal authorization;
4. see COMRDY identify an exact transaction-intent violation;
5. see capture blocked;
6. see a valid transaction captured;
7. inspect evidence/replay;
8. open the public source repository and run the documented project.

If those eight steps work, the submission is complete even if P1/P2 remain roadmap items.
