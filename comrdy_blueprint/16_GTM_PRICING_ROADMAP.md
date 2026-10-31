# COMRDY GTM, Pricing, Moat & Product Roadmap

Version: 0.1

---

## 1. Category

**Agentic Commerce Transaction Assurance**

Do not compete as another:

- AI shopping assistant;
- agent-readiness scanner;
- generic synthetic monitoring product;
- fraud detector;
- payment gateway;
- LLM evaluation dashboard.

COMRDY owns the question:

> Did the autonomous transaction remain inside the customer's authorized economic intent?

---

## 2. Initial ICP

### ICP 1 — Agentic-commerce builders

Teams building shopping agents, commerce copilots, or transaction-capable assistants.

Pain:

- nondeterministic model behavior;
- hard-to-reproduce checkout failures;
- fear of wrong purchases;
- no reliable regression suite for economic intent.

Buyer:

- engineering lead;
- product lead;
- payments lead.

### ICP 2 — Large merchants exposing agent surfaces

Merchants implementing structured commerce surfaces, WebMCP-like tools, agent APIs, or new agent checkout paths.

Pain:

- browser and protocol paths disagree;
- product/variant data drifts;
- successful checkout does not prove user intent was preserved;
- upgrades can silently break agents.

### ICP 3 — Payment/platform providers

Payment orchestration and commerce infrastructure teams that need independent transaction behavior testing.

Pain:

- integration regressions;
- retries/idempotency edge cases;
- unclear responsibility between agent, merchant, and payment layers.

---

## 3. Wedge

Start with **pre-production reliability testing** because it is easier to adopt than an inline production payment gate.

1. connect staging merchant;
2. define/import missions;
3. run synthetic shoppers;
4. identify false successes;
5. add COMRDY to CI;
6. only then offer runtime verification.

This creates trust before asking customers to put COMRDY in the payment path.

---

## 4. Product packaging

### COMRDY OSS

Purpose: category adoption and transparent core semantics.

Include:

- Intent Contract schema;
- deterministic invariant engine;
- local merchant adapter SDK;
- CLI;
- local golden-test runner;
- example demo store;
- report output.

Do not make the moat depend on hiding this code.

### COMRDY Cloud — Developer

Working price: **$99/month** after beta.

- hosted runs;
- 1 workspace;
- 3 projects;
- 1,000 case executions/month baseline;
- 14-day evidence retention;
- PayPal Sandbox adapter;
- CI integration;
- 3 seats.

### COMRDY Cloud — Team

Working price: **$399/month**.

- 5,000 case executions/month baseline;
- parallel workers;
- differential agent/protocol runs;
- 90-day evidence;
- advanced chaos profiles;
- shareable reports;
- audit log;
- 10 seats.

### Enterprise

Custom.

- dedicated/private workers;
- custom retention;
- SSO/SCIM;
- higher concurrency;
- production runtime gate;
- custom provider adapters;
- SLA/support;
- data residency where supported.

Do not publish final prices until browser-agent execution cost is measured. Price should ultimately be based on **case executions + retained evidence + concurrency**, not arbitrary seats alone.

---

## 5. Free-to-paid conversion

The best conversion moment is not a generic usage limit.

Trigger:

> COMRDY found a reproducible false success that the customer's existing tests missed.

Paid value:

- run it on every build;
- retain evidence;
- compare versions;
- use more concurrency;
- add team workflows;
- protect production later.

---

## 6. Design-partner acquisition

First 10 targets:

- agentic shopping startups;
- merchants publicly experimenting with agent checkout;
- ecommerce infrastructure companies;
- payment/checkout developer teams.

Offer:

> Give us 10 real purchase intents and a staging merchant. We'll return a reliability report showing exactly where agent intent drifts.

No long deck. The report is the sales artifact.

---

## 7. Core moat

No software feature is literally uncopyable. COMRDY's defensibility must compound.

### 7.1 Failure corpus

A normalized corpus of real transaction failures:

```text
agent/model
protocol/surface
merchant stack
intent shape
first divergence point
violation taxonomy
payment outcome
remediation
```

### 7.2 Reliability graph

Over time, COMRDY can answer questions competitors cannot answer from one merchant:

- which agent/model versions most often violate hard spend caps?
- where do browser agents produce more variant drift than structured tools?
- which merchant/platform upgrades increase false-success rate?
- which retry patterns correlate with duplicate economic action?

### 7.3 Regression library

Thousands of commerce-specific metamorphic/chaos cases become difficult to reproduce quickly.

### 7.4 Integrations and historical baselines

A customer with months of runs, protocols, evidence, CI history, and reliability baselines has high switching value.

### 7.5 Standard language

Publish useful neutral terminology:

- False Success Rate;
- Authority Drift;
- Selection Drift;
- Value Drift;
- State Drift;
- Protocol Drift;
- Retry Drift;
- Refund Drift.

If teams use COMRDY's language even before they buy COMRDY, category leadership strengthens.

---

## 8. Roadmap

### Phase 0 — Hackathon proof

- one demo merchant;
- one browser agent;
- PayPal Sandbox;
- invariant engine;
- six faults;
- evidence and replay;
- Intent Lineage.

### Phase 1 — Developer beta

- CLI;
- SDK;
- GitHub Action;
- hosted staging targets;
- mission suites;
- API keys;
- shareable reports;
- baseline comparison.

### Phase 2 — Differential assurance

- multiple agent profiles/models;
- browser vs structured commerce adapter;
- protocol adapters as public access allows;
- metamorphic prompt generation;
- version comparison;
- cost/latency metrics.

### Phase 3 — Post-purchase assurance

- fulfillment state;
- cancellations;
- full/partial refund verification;
- subscription lifecycle;
- disputes/evidence links where appropriate.

### Phase 4 — Runtime Gate

Customer calls COMRDY before capture/high-risk action:

```text
ALLOW
REVIEW
DENY
```

Requirements before production launch:

- very high availability;
- strict latency budget;
- signed/verifiable inputs;
- provider abstraction;
- fail-open/fail-closed policy controls;
- external security review.

### Phase 5 — Reliability Network

- anonymous benchmark data;
- industry reports;
- model/protocol regression alerts;
- merchant-stack reliability index;
- compatibility certification.

---

## 9. What COMRDY should not become

- an autonomous agent marketplace;
- consumer shopping app;
- affiliate discovery engine;
- generic LLM evaluation suite;
- generic RPA testing tool;
- payment processor;
- broad fraud/AML product;
- SEO/AI discoverability scanner.

Those directions dilute the category.

---

## 10. Marketing language

### Use

- `transaction assurance`
- `false success`
- `intent integrity`
- `deterministic verification`
- `first divergence`
- `authorized economic outcome`
- `synthetic commerce mission`
- `capture gate`

### Avoid

- `AI-powered ecommerce testing`
- `revolutionary`
- `seamless`
- `agentic ecosystem`
- `next-gen payment security`
- `trust layer` without explaining exactly what is verified.

---

## 11. Launch content

### Technical launch post

Title:

> **Your AI shopper completed payment. It still failed.**

Contents:

1. define false success;
2. show wrong-size example;
3. show PayPal authorization vs capture distinction;
4. explain deterministic Intent Contract;
5. open-source schema/engine;
6. provide reproducible demo.

### Benchmark report

After enough beta data:

> State of Agentic Commerce Reliability — Q1 2027

Do not publish weak benchmark claims from tiny sample sizes. Report methodology and confidence limits.

---

## 12. Success milestones

### First 30 days after hackathon

- 5 design partners;
- 3 external staging integrations;
- >100 reproducible failure cases;
- 1 public technical case study;
- first external CI run.

### 90 days

- 10-20 active teams;
- repeat weekly test use;
- at least one customer paying for hosted evidence/concurrency;
- failure taxonomy stable enough for public v1;
- provider abstraction beyond PayPal Sandbox ready for controlled beta.

### 12 months

Success is not number of generated tests. It is:

> How many wrong economic outcomes did COMRDY reproduce or prevent before customers encountered them?
