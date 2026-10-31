# COMRDY Source & Research Index

Version: 0.1  
Checked during product blueprint preparation: October 2026.

This file separates external facts/references from COMRDY product decisions.

---

## 1. PayPal developer documentation

### REST authentication

https://developer.paypal.com/api/rest/authentication/

Used for OAuth access-token architecture and server-side credentials.

### Webhooks overview

https://developer.paypal.com/api/rest/webhooks/

Used for asynchronous payment state reconciliation design.

### Authorize and capture

https://developer.paypal.com/v5/checkout/auth-capture/

Used for the COMRDY Sandbox architecture in which an order is authorized, deterministically verified, then captured only when invariants pass.

### Orders API integration

https://developer.paypal.com/api/rest/integration/orders-api/

Used for Orders v2 integration structure.

### Advanced Orders API use cases / idempotency

https://developer.paypal.com/api/rest/integration/orders-api/api-use-cases/advanced/

Used for retry/idempotency design guidance.

### Agent Ready overview

https://developer.paypal.com/agent-ready/overview/

Used only as strategic context for agentic commerce and protocol support. COMRDY's hackathon P0 does not depend on access to this product.

### Agentic Commerce Services overview

https://developer.paypal.com/agentic-commerce-services/about/

Used to confirm access/onboarding constraints; these services are not a required dependency for COMRDY P0.

### Store Sync overview

https://developer.paypal.com/store-sync/overview/

Used as strategic context only; not required for P0.

### PayPal WebMCP article

https://developer.paypal.com/community/blog/WebMCP_PayPal_Agent_Ready/

Used to understand PayPal's current work on making merchant commerce surfaces easier for agents and the value of comparing browser vs structured interaction paths.

---

## 2. PayPal AI Hackathon

### Main

https://paypalaihackathon.devpost.com/

### Rules

https://paypalaihackathon.devpost.com/rules

Relevant submission constraints used in planning:

- functioning project/demo expectations;
- public source repository/open-source license requirements;
- public YouTube demonstration requirements;
- video duration limit;
- general submission/eligibility constraints.

Always re-check rules immediately before submission because Devpost pages can be updated.

### Resources

https://paypalaihackathon.devpost.com/resources

Used for sponsor/tool context such as KERNEL and AG Grid.

---

## 3. Competitive validation

These products are research references/competitors, not design endorsements.

### ShopperProbe

https://shopperprobe.com/

Important because it validates synthetic AI shopper missions, variant/cart/promotion checks, and a deterministic testing need. Its published positioning states that payment submission is deliberately not part of its production runner, which defines COMRDY's payment-lifecycle wedge.

### AgentProof

https://www.agent-proof.com/

Validated that generic agent-readiness/discoverability scoring is already a category and should not be COMRDY's core product.

### Ora

https://ora.ai/

Validated demand for agent-readiness and agent-journey testing; COMRDY differentiates around economic intent and payment lifecycle assurance.

---

## 4. Refero visual research

Research performed using the Refero design connector.

### Style references

- Brex — `brex.com` — Refero style `7471a4ea-ab61-4281-8f19-2d65352efc44`
- shadcn/ui — `ui.shadcn.com` — Refero style `c14c0a94-1037-449e-bf5b-4cb972656ac7`
- Convex — `convex.dev` — Refero style `d500b995-352a-4a4f-8016-cb00cdb6eb17`
- Attio — `attio.com` — Refero style `9f0c028b-6b11-415e-ab92-f32e4597cbe2`
- Linear — `linear.app` — Refero style `554b801c-3b31-4086-a7e5-ae613cdd618b`

### Screen references

- Stellate metrics dashboard — Refero screen `20fd86b0-d60e-4e06-b9de-911cd2b94280`
- Mercury audit/activity table — Refero screen `da0ff7bb-32ed-4295-a044-4edbcc3b0745`
- GitHub side-by-side diff — Refero screen `4b64c360-ee73-4c4e-91e2-1c7a9b923f8b`

### Flow references

- OpenAI developer onboarding/API key — Refero flow `4178`
- Appwrite dev-key creation — Refero flow `6027`
- PayPal Activity transaction search — Refero flow `7382`

See `15_REFERO_RESEARCH.md` for the design decisions adapted from these references.

---

## 5. Reference-use policy

COMRDY does not clone any source product. References are used to understand:

- information hierarchy;
- density;
- transaction/audit interaction patterns;
- typography discipline;
- product-evidence presentation;
- multi-step flow mechanics.

COMRDY uses its own content, tokens, visual hierarchy, product model, and signature Intent Lineage component.
