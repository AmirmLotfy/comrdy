# COMRDY

A transaction test lab for engineers building AI checkout.

**A payment can succeed and still be the wrong purchase.**

## Local development

Requires Node 22.13+ and npm. Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`. Local simulation uses explicitly labeled fixtures and does not contact payment or model providers. It is not evidence of real provider integration.

Run `npm test`, `npm run typecheck`, and `npm run build` for local checks.

## Sandbox configuration

Use only PayPal Sandbox credentials. Set APP_MODE=sandbox, PAYPAL_ENV=sandbox, DATABASE_URL, OPENAI_API_KEY, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_MERCHANT_ID, RUN_ACCESS_CODE and KERNEL_API_KEY in the ignored environment file. Run `npm run db:migrate` before starting. Run `npm run worker` alongside the development server, or `npm run serve` after building. [Full setup and qualification](docs/SETUP.md) covers account setup, local browser execution, webhooks, and deployment. Missing configuration fails closed; it never silently switches to simulated provider results.

Buyer approval is a separate human step. Captures must reference confirmed intent and the verified checkout revision. A blocked authorization must be voided and its provider state reconciled. Saved playback must never initiate a payment.

## Source and evidence

The original product blueprint remains in `comrdy_blueprint/`. `docs/IMPLEMENTATION_SCOPE.md` is the current release scope. `CURRENT_HANDOFF.md` records actual acceptance and unfinished work. Submission files are drafts until backed by qualified live evidence.

OpenAI and PayPal API keys stay on the server. Never put real payment credentials or personal buyer information into recordings. Fictional Northpath prices are test fixtures, not commercial offers.

MIT licensed. This is an independent hackathon project, with no claimed PayPal endorsement.
