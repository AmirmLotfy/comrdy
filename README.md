# COMRDY — Commerce Ready

A transaction test lab for engineers building AI checkout.

**A payment can succeed and still be the wrong purchase.**

[Watch the 2:45 film](https://www.youtube.com/watch?v=Or9gooJFwSo) · [Submitted Devpost entry](https://devpost.com/software/comrdy) · [Judge workbench](https://comrdy.vercel.app/judges)

Submitted November 1, 2026; authenticated Devpost finalization confirms **SUBMITTED, 5/5 steps done**. [Publication receipt](submission/receipt.json) records the verification and its limits.

## Recorded Sandbox qualification

The hosted [demo](https://comrdy.vercel.app) is deployed at evidence-package revision `d9a3d4c`, with the same executable source digest as qualified revision `03c145157878602971c7f4bbd30555c512fade35`. The [public MIT repository](https://github.com/AmirmLotfy/comrdy) also contains later documentation and film-production work; those changes do not relabel the recorded payment runs. On that frozen source, independent provider retrieval qualified the latest three original attempts per scenario: **3 valid captures, 3 variant denials with confirmed voids and 3 shipping denials with confirmed voids — 9/9**. One bounded recovery preserved the confirmed contract, obtained fresh approval and completed a $148 capture bound to the correct size-M merchant order.

The live intent corpus met **20/20 automated expectations: 8/8 executable cases and 12/12 expected clarifications**. Assistant review covered all outputs; the project owner reviewed and approved the complete output packet with the disclosed limitation. One blocked subscription request marks requested color/size as soft, so this result is not perfect semantic preservation or general model accuracy.

Five concurrent duplicate approval commands after a completed purchase preserved one capture and one merchant order. A worker restart while awaiting buyer approval resumed successfully. An actual out-of-order webhook pair delivered VOIDED before CREATED and left the authorization VOIDED with no capture. These checks do not qualify lost provider responses or interruptions during capture; duplicate webhook delivery remains mock-tested only.

Reviewed export files are prepared in [`public/release/`](public/release/): [`qualification.json`](public/release/qualification.json), [`evidence.json`](public/release/evidence.json), [`control.json`](public/release/control.json), [`payment-readbacks.json`](public/release/payment-readbacks.json) and [`intent-outputs.json`](public/release/intent-outputs.json). Their hosted publication and anonymous access are verified. Six final screenshots are packaged in [`submission/screenshots/release/`](submission/screenshots/release/) and included in the finalized Devpost submission. A complete 165-second1080p Remotion review film is assembled and technically checked; the project owner approved captions, redaction, all six screenshots and the complete intent-output packet. The 165-second 1080p publication master passed guarded rendering, metadata, sampled visual and encoded-audio checks. It is public on YouTube with English captions and the original thumbnail, and the exact video URL is attached to the finalized Devpost entry. The hosted qualification export preserves its original measurement-time review status; subsequent owner acceptance is recorded in [`submission/RELEASE_REVIEW.json`](submission/RELEASE_REVIEW.json). See [`CURRENT_HANDOFF.md`](CURRENT_HANDOFF.md) for exact receipts and ownership.

## Explore the product

- `/judges`: a guided review and searchable AG Grid workbench of actual accessible evidence. Test verdict, authorization, capture and merchant order remain separate.
- `/readiness`: execute 12 synthetic scenarios using the real verification engine. Inspect failed rules, change bounded checkout facts, compare against the baseline, and export reproducible JSON/CSV.
- `/demo`: compile and confirm intent, introduce a controlled variant or shipping fault, and inspect one bounded recovery.
- `/store`: Northpath's controlled storefront with product views, size guide, editable cart and checkout observation. Store links open separately from the lab.
- `/compare`: original/recovery comparison under the unchanged contract.

The [Postman verification kit](docs/API_VERIFICATION.md) runs without provider credentials. New screens and screenshots explicitly distinguish synthetic engine checks, local simulation and real PayPal Sandbox execution. They do not imply live provider qualification.

## Local development

Requires Node 22.13+ and npm. Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`. Local simulation uses explicitly labeled fixtures and does not contact payment or model providers. It is not evidence of real provider integration.

Run `npm test`, `npm run typecheck`, and `npm run build` for local checks.

## Sandbox configuration

Use only PayPal Sandbox credentials. Set APP_MODE=sandbox, PAYPAL_ENV=sandbox, DATABASE_URL, OPENAI_API_KEY, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_MERCHANT_ID, RUN_ACCESS_CODE and KERNEL_API_KEY in the ignored environment file. Run `npm run db:migrate` before starting. Run `npm run worker` alongside the development server, or `npm run serve` after building. [Full setup and qualification](docs/SETUP.md) covers account setup, local browser execution, webhooks, and deployment. Missing configuration fails closed; it never silently switches to simulated provider results.

Buyer approval is a separate human step. Captures must reference confirmed intent and the verified checkout revision. A blocked authorization must be voided and its provider state reconciled. Saved playback must never initiate a payment.

## Deployment

Vercel hosts the website/API; a persistent Render worker and managed PostgreSQL provide durable execution. Qualified web and worker provenance match the frozen executable revision above. Run `npm run deploy:check` for a secret-free local preflight before later deployments. [Deployment guide](docs/VERCEL_DEPLOYMENT.md) documents configuration, staged deployment and revision checks. The public evidence endpoints and source were checked with anonymous HTTP; YouTube visibility, playback and the Devpost finalization were checked in the authenticated browser.

## Source and evidence

The original product blueprint remains in `comrdy_blueprint/`. `docs/IMPLEMENTATION_SCOPE.md` is the current release scope. `CURRENT_HANDOFF.md` records actual acceptance and unfinished work. Submission files are drafts until backed by qualified live evidence.

OpenAI and PayPal API keys stay on the server. Never put real payment credentials or personal buyer information into recordings. Fictional Northpath prices are test fixtures, not commercial offers.

MIT licensed. This is an independent hackathon project, with no claimed PayPal endorsement.

## Review the complete build

The requirement-by-requirement audit is in [`docs/PLAN_COMPLETENESS.md`](docs/PLAN_COMPLETENESS.md). The original blueprint is historical; [`docs/IMPLEMENTATION_SCOPE.md`](docs/IMPLEMENTATION_SCOPE.md) defines the focused release. Exact current checks and external gates are in [`CURRENT_HANDOFF.md`](CURRENT_HANDOFF.md).

The hero presents the contract, shopper, verification gate and evidence workflow. The lab retains the deliberate variant and shipping failures. Edited contracts keep their original compilation receipt and changed paths. An isolated operator-only control records a deliberately wrong-size merchant order only after exact Sandbox capture readback; it cannot be invoked from the public API.

The editable 165-second film, narration and final input checklist live in [`submission/video/`](submission/video/). The supplied audio mix and complete caption/redaction/screenshot/intent review packet were approved by the project owner. The final film uses authentic product recordings and disclosed control-receipt graphics, with the review watermark removed. The public film, English SRT/VTT, seven chapter clips, thumbnails and source are retained; the simulated local rehearsal remains historical. Release rendering validates media and matching execution evidence, while the receipt preserves the distinct human and technical review boundaries. Earlier 103/103 automated tests used mocked financial responses at `7df484fd56c97bbefd9972b2ab24be4952298296`; final-source type checking/build do not turn that earlier suite into a final-revision rerun.
