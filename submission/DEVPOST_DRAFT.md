# COMRDY

Draft only. Replace all acceptance-dependent statements with verified release facts before publication.

## Inspiration
A checkout can finish even when the order no longer matches the buyer's instructions. Engineers shipping AI shopping experiences need to see where the transaction changed and whether payment handling respected those instructions.

## What it does
COMRDY is a transaction test lab for AI checkout. The target release compiles a confirmed buyer request, observes a shopper in a controlled store, evaluates deterministic invariants, and captures or voids a PayPal Sandbox authorization. Its Intent Lineage links each changed value to evidence.

## How it is built
TypeScript, Next.js, PostgreSQL, Drizzle, deterministic rules, PayPal Orders/Payments APIs, OpenAI Responses, and isolated browser tooling. Only list deployed, verified integrations in Built With.

## Original work
The October 2026 product blueprint predates implementation. Source implementation began November 1, 2026. Cite related AP2 research; do not claim to invent intent validation or the failure class.

## Evidence required before submission
- Live demo URL, public repository and MIT license
- Actual PayPal authorization/capture/void receipts and verified webhooks
- Real compiler/browser trace, bounded recovery and retry results
- Public YouTube film under three minutes
- Six truthful screenshots and architecture diagram
- Buyer access instructions, release commit and setup verification
- Authenticated Devpost submitted timestamp and finalization UI receipt

No customer adoption, measured savings, production certification, or full protocol coverage is claimed.
