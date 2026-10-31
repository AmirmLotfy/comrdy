# COMRDY Product Strategy

## 1. Category

COMRDY should not position itself as:

- an AI readiness scanner;
- a shopping assistant;
- a fraud engine;
- a generic observability platform;
- a payment protocol;
- an agent wallet;
- a pre-checkout ecommerce QA tool.

The category is:

**Agentic Commerce Transaction Assurance**

The simplest product question is:

> Did the agent buy the right thing, for the right amount, under the right authority?

## 2. Market wedge

Current products cover important upstream pieces:

- discoverability and agent-readiness scoring;
- synthetic shopping missions;
- product/cart/checkout QA;
- protocol conformance;
- agent spend controls;
- payment processing.

COMRDY owns the continuity between those layers.

The product begins where conventional agent-commerce testing becomes weak: the handoff from an apparently successful checkout into a real authorization, capture, order, fulfillment, cancellation, or refund.

## 3. The failure class COMRDY owns

### False success

A false success occurs when:

1. an agent reaches a technically successful state, and
2. the economic outcome violates the shopper mandate.

Examples:

- correct product family, wrong size;
- correct item, final total above hard cap;
- discount removed before payment;
- one-time purchase silently becomes subscription;
- one unit becomes two after retry;
- currency changes;
- shipping route becomes ineligible;
- capture occurs after inventory invalidation;
- retry causes duplicate capture;
- refund amount is lower than expected;
- browser path and structured-agent path produce materially different orders.

## 4. Ideal customers

### Primary ICP: commerce platform and ecommerce engineering teams

Companies exposing purchase flows to AI agents, assistant surfaces, browser agents, or structured commerce protocols.

Typical team:

- VP/Head of Ecommerce;
- Commerce Platform Engineering;
- Payments Engineering;
- QA/SDET;
- AI Platform / Applied AI;
- Risk and Trust;
- Developer Experience.

### Secondary ICP: agencies and system integrators

Agencies managing multiple Shopify, custom commerce, or enterprise storefronts need repeatable evidence for client agent-readiness and transaction correctness.

### Later ICP: payment providers and agent platforms

Protocol providers, payment processors, shopping agents, and commerce networks can use COMRDY as a neutral cross-system conformance and transaction-assurance layer.

## 5. Jobs to be done

### Merchant engineering

> Before we expose our store to AI shoppers, prove the same customer mandate produces the correct order and payment across our agent paths.

### QA

> Turn a natural-language buyer mandate into reproducible commerce tests that fail deterministically when the resulting economic outcome changes.

### Payments engineering

> Prevent capture when the order no longer matches the user's authorized constraints.

### Product / leadership

> Show a transparent reliability metric and evidence trail instead of an opaque “agent-ready” score.

### Incident response

> Reproduce a failed agent purchase, compare paths/models, identify where the transaction drifted, and verify the remediation.

## 6. Core product objects

1. **Merchant Target** - store/domain/environment being tested.
2. **Mission** - natural-language buyer task.
3. **Intent Contract** - deterministic representation of what is allowed.
4. **Invariant** - one rule that must remain true.
5. **Agent Profile** - agent/model/tool configuration.
6. **Execution Path** - Browser, WebMCP, ACP, UCP, direct API, or custom adapter.
7. **Run** - execution of a suite against a target.
8. **Transaction Attempt** - one mission's commerce/payment lifecycle.
9. **Violation** - an invariant failure.
10. **Evidence Chain** - snapshots and events proving what happened.
11. **Chaos Rule** - controlled state mutation introduced during a run.
12. **Replay** - rerun of a failed mission under controlled changed variables.
13. **Gate Decision** - ALLOW, REVIEW, or DENY before capture.

## 7. Product moat

No software feature is literally uncopyable, particularly in an open-source hackathon. COMRDY must build a compounding moat.

### 7.1 Failure corpus

Normalize real agent-commerce failure modes into a versioned taxonomy with reproducible test fixtures.

### 7.2 Transaction Integrity Dataset

Aggregate anonymized outcomes across:

- agent/model;
- store platform;
- execution path;
- invariant type;
- payment lifecycle;
- failure root cause;
- remediation outcome.

The dataset becomes more defensible than the UI.

### 7.3 Intent Contract format

Publish a small, deterministic contract representation that can become a portable interchange format between testing, runtime gates, merchants, and payment systems.

### 7.4 Integrations

Deep adapters for Shopify, Magento/Adobe Commerce, commercetools, custom APIs, PayPal/Braintree, and structured agent protocols create switching cost.

### 7.5 Regression library

Every incident can become a permanent test fixture. Customers accumulate valuable organizational assurance history inside COMRDY.

### 7.6 Reliability benchmark

Build a benchmark based on actual transaction integrity, not generic web readiness.

## 8. Product principles that protect differentiation

1. **Never stop at checkout.** If the product only tests pre-payment, it collapses into existing synthetic shopper products.
2. **Never use LLM output as the final financial decision.** A deterministic gate is the trust primitive.
3. **Never hide the evidence behind a score.** Show the exact drift point.
4. **Protocol-agnostic architecture.** Browser and protocol adapters are interchangeable runners around the same contract and assertion engine.
5. **Reproducible chaos.** Failures must be re-creatable with a seed.
6. **Post-purchase truth.** Refund/cancellation/order state are part of transaction correctness.

## 9. Competitive positioning

### Against readiness scanners

They answer: “Can an agent find/read/use this store?”

COMRDY answers: “Did the economic result remain inside the user's authority?”

### Against synthetic shopper QA

They often stop before payment or focus on journey completion.

COMRDY uses real sandbox authorization/capture behavior and continues through post-purchase states.

### Against spend-control systems

They answer: “Can this agent spend up to X?”

COMRDY evaluates product, variant, price, quantity, currency, delivery, subscription state, substitution permission, tax/shipping bounds, order state, and post-purchase correctness together.

### Against payment processors

Processors know whether a payment succeeded.

COMRDY evaluates whether it should have succeeded under the original mandate.

## 10. Commercial form

### Open-source core

- Intent Contract schema.
- Invariant validator.
- Local demo runner.
- Example PayPal Sandbox integration.

### COMRDY Cloud

- hosted browser execution;
- scheduled regression suites;
- evidence storage;
- protocol adapters;
- chaos orchestration;
- team permissions;
- benchmarks;
- runtime gate;
- enterprise connectors;
- audit retention;
- alerts and CI integration.

## 11. Roadmap boundaries

### Hackathon MVP

One target, one controlled merchant, browser runner, PayPal Sandbox, deterministic contracts, chaos, replay, evidence UI.

### Private beta

Real merchant staging environments, scheduled test suites, CI, webhooks, multi-user workspaces, one structured tool adapter, exportable evidence.

### V1

Shopify/custom integration, runtime verification endpoint, production observability mode, protocol comparison, team policies.

### V2

Cross-merchant benchmarks, risk-based policy packs, AP2/mandate interoperability, enterprise data residency, expanded post-purchase verification.
