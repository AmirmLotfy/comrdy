# Setup and provider qualification

Local fixture mode works without credentials: `npm ci`, `npm run dev`, open `http://127.0.0.1:3000`. Keep `.env.local` ignored. Run `npm run build` then `npm start` for a production browser check. Local fixtures never become real AI or payment evidence.

## Configure when implementation review is complete

Copy `.env.example` to `.env.local` and fill values privately. Never send secrets in chat.

- `APP_MODE=sandbox`, `PAYPAL_ENV=sandbox`, `APP_URL` equal to the actual origin. Keep the same host during an approval round trip so the session cookie is retained.
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`: a REST application under PayPal Developer **Sandbox**, belonging to the controlled business account. `PAYPAL_MERCHANT_ID`: that business account's merchant ID, independently configured for binding checks.
- `PAYPAL_WEBHOOK_ID`: register `https://YOUR_APP/api/v1/webhooks/paypal` for `PAYMENT.AUTHORIZATION.CREATED`, `PAYMENT.AUTHORIZATION.VOIDED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.COMPLETED`, and `PAYMENT.CAPTURE.DECLINED`. Use actual Sandbox app events to qualify postback verification; simulator mock events cannot use this method. See `docs/PAYPAL_REVIEW.md`. Signature verification uses PayPal's Sandbox verification endpoint. Duplicates are acknowledged without repeating financial actions.
- A separate Sandbox personal buyer account is needed for the normal PayPal approval screen. Its password never belongs in application code, AI prompts, chat, or a video.
- `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-6-luna`: server-only project key with available credits and a dashboard budget alert. Verify model entitlement with the first qualification call.
- `KERNEL_API_KEY`, `BROWSER_DRIVER=kernel`: isolated browser execution; verify sponsor credits/account entitlement. The browser must reach the public `APP_URL`. For local development only, `BROWSER_DRIVER=local` uses installed Chrome through Playwright and does not claim KERNEL execution.
- `DATABASE_URL`: persistent PostgreSQL database. `npm run db:migrate` creates the additive state table. The worker's durable job/lease is part of each stored run, serialized under PostgreSQL transaction locking.
- `RUN_ACCESS_CODE`: a random operator-provided code for metered compile/start/recover calls. Public released evidence remains available without signup. Daily defaults cap 50 compile calls and 20 fresh attempts; each shopper has at most 16 steps and 120 seconds. These are usage limits, not a guaranteed provider billing cap.
- `EVIDENCE_DIR`: writable persistent directory for screenshots. Use `/var/data/evidence` on the prepared Render service.

Run `npm run dev` and `npm run worker` in two terminals locally. For the original all-in-one hosting alternative, `npm run build` then `npm run serve` supervises both processes. The current Vercel target runs the web/API there and `npm run worker` in the persistent companion service; its template migrates on start. Configure the expected origin before running buyer approval. Cancellation before authorization is safe; ambiguous authorizations/captures must be reconciled before another purchase.

## Bounded verification

`npm test` runs pure engine/provider-mock/orchestration checks; it makes no real provider requests. `TEST_DATABASE_URL=... npm test` additionally exercises real PostgreSQL serialization across three processes, adding and removing only a unique test counter. `npx tsx scripts/qa/local-browser.ts` exercises local simulation, session ownership, recovery and responsive layouts using installed Chrome.

With real credentials: `npm run qualify:intent -- --live` runs 20 compiler requests. Run the release scenarios via the UI and approve each actual Sandbox order. After three consecutive runs of each scenario, use `npx tsx scripts/qualify-payments.ts ID1 ... ID9` for independent provider readback. The isolated ungated control is CLI-only: set `ALLOW_UNGATED_CONTROL=true` in the private environment, run `npx tsx scripts/ungated-control.ts prepare`, approve its order, then `complete`. Use `inspect` for uncertain responses; never create another control to hide an unresolved one.

The payment qualifier requires all nine runs to record the same clean execution commit. It verifies retrieved order/authorization/capture bindings; the separate release receipt must establish consecutive execution. The control creates a payment beside a mutated local fixture, not a Northpath merchant order, and its output must retain that limitation.

Export selected, reviewed terminal runs with `npx tsx scripts/export-evidence.ts ID ...`. Inspect `public/release/evidence.json` before publishing. Export is a deliberate public release of the included intent/evidence. The UI library stays empty until genuine runs exist; local session runs are accessible only to that session.

## Hosting and retention

`render.worker.yaml` defines the companion worker, persistent disk and paid PostgreSQL for the current Vercel web target. `render.yaml` remains the original all-in-one web-service alternative. Confirm account credits and the quoted total through December 21 before applying it; the approved additional spend is $100 total, with approximately $45 reserved for hosting. Do not use an expiring free database. No Render resources are created by any local setup command.

Release the source under MIT, record the deployed source revision, and inspect the hosted app in an incognito browser before submission. The exact video production inputs and qualification gates are in `submission/video/PRODUCTION.md` and `docs/RELEASE_CHECKLIST.md`.

### Execution provenance

`npm run build` records the source revision and dirty status in ignored `.build-provenance.json`. Production Sandbox workers require an unchanged clean checkout matching that receipt because the worker executes TypeScript source. Commit and build before live release runs. Each run records its creation build plus each worker build that handled it; export and qualification reject mixed or dirty revisions. Local simulation can use an uncommitted build and remains explicitly unqualified.

### Vercel deployment target

The website and API now target Vercel, with the existing persistent worker and PostgreSQL as companion services. See `docs/VERCEL_DEPLOYMENT.md` and `render.worker.yaml`. `render.yaml` remains the original all-in-one alternative. Never start both worker configurations against the same production release unintentionally.
