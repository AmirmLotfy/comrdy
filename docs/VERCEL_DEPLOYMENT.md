# Vercel deployment — COMRDY

Prepared November 1, 2026. The user's latest direction makes Vercel the website and app target. This does not turn local tests into hosted or PayPal acceptance.

## Runtime decision

Vercel hosts the Next.js website, controlled storefront and `/api/v1` handlers. A single persistent Render worker consumes the existing PostgreSQL jobs and owns the KERNEL browser, capture/void reconciliation and private screenshot disk. Both connect to the same database and use the same canonical Vercel `APP_URL` and source commit. No second public API, Redis, scheduled browser polling or payment from page playback is introduced.

`vercel.json` supplies the Next.js build and region. The API declares a 60-second duration; the browser shopper runs in the separate worker. `render.worker.yaml` is the companion blueprint. Keep the original `render.yaml` only as an alternative; do not provision both stacks. Do not rely on Render's expiring free database. Verify the actual retention quote through December 21 inside the existing $100 total cap before provisioning.

Vercel now supports [Daemons in public beta](https://vercel.com/docs/daemons), including on Hobby, but those workers have ephemeral storage and currently run only in production. Adopting them would require moving private evidence off disk and separately qualifying the beta rollout. They are an optional future consolidation, not a prerequisite for this deployment. Normal [Vercel Functions have bounded durations](https://vercel.com/docs/functions/limitations); a forever loop is not an API handler. [Hobby cron runs once daily](https://vercel.com/docs/cron-jobs/usage-and-pricing), so cron cannot replace prompt payment reconciliation.

## Account and target

Read-only CLI inspection confirmed the current user `mellardoo` and team `mellardoos-projects`. The `comrdy` project is created and linked. Its settings were updated and read back: Next.js, Node 22.x, `npm ci`, `npm run build`, default Next.js output. No deployment was published. CLI 65.9.0 was used through `npx` for the settings update; the global CLI 48.4.0 remains installed. The global version uses `vercel whoami` and `vercel project inspect` without the newer `--format`/`--non-interactive` flags. Verify the linked project before every deployment. Never deploy from another project's link or accept an implicit link.

Project setup commands, run from the repository root:

```sh
vercel project add comrdy --scope mellardoos-projects
vercel link --project comrdy --scope mellardoos-projects --yes
vercel project inspect comrdy --scope mellardoos-projects
```

The project link lives in ignored `.vercel/`. `.vercelignore` excludes environment files, local databases, artifacts, test footage, submission drafts and blueprint history from uploads. It never uploads `.env.local`.

## Private configuration

Vercel needs a **reachable external TLS PostgreSQL URL**, not the Render-only internal hostname. Use a connection pooler where supported. Web instances use at most two connections each, release idle connections after 20 seconds, and disable prepared statements for pooler compatibility. Run the additive migration explicitly before first traffic. Keep preview and production databases isolated; do not point preview at the live qualification database.

Set production environment values privately with `vercel env add NAME production --scope mellardoos-projects` (interactive input, no values in command history), or the Vercel dashboard. Configure:

- `APP_MODE=sandbox`, `PAYPAL_ENV=sandbox`, `APP_URL=https://<canonical-host>`.
- `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-6-luna`.
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MERCHANT_ID`, `PAYPAL_WEBHOOK_ID`.
- `KERNEL_API_KEY`, `BROWSER_DRIVER=kernel`, `RUN_ACCESS_CODE`.

The companion worker needs those same values, `NODE_ENV=production`, and `EVIDENCE_DIR=/var/data/evidence`. Its PostgreSQL URL may use the internal hostname for the same database. Run only one worker instance; transaction leases remain the concurrency guard. Stop admission during rollouts and settle existing attempts before changing revisions.

For preview, choose `APP_MODE=simulation` and an isolated durable database. File-backed simulation is explicitly rejected on Vercel; `/tmp` is not durable state. Avoid Sandbox credentials in previews unless performing an explicitly planned isolated qualification. Deployment protection can prevent KERNEL/PayPal from reaching preview URLs, so normal buyer approval and webhooks belong on the canonical public Sandbox demonstration host. Do not weaken protection as a workaround.

Register the five v2 webhook events listed in [PayPal review](PAYPAL_REVIEW.md) at the canonical `/api/v1/webhooks/paypal` endpoint. Use actual app-generated events for postback signature acceptance; simulator events cannot qualify that method. Sandbox buyer approval remains a normal PayPal login step owned by the buyer.

## Release commands and provenance

1. Finish local checks; commit the final code. `npm run deploy:check` reports only configuration presence, linked project and source identity, never secrets. It fails on dirty source or missing configuration.
2. Verify Vercel project/team and production environment names using the CLI. Do not assume locally present values are configured remotely.
3. Build/start the companion worker from the same commit and verify its database connection, lease processing and private disk. Production worker startup rejects source that differs from its clean build receipt.
4. Use the staged deployment command printed by `npm run deploy:check`. It supplies only the public revision and source checksum via `--build-env`; the remote build verifies uploaded executable bytes before recording clean CLI provenance. An unrecognized source stays unqualified. `--skip-domain` prevents automatic public promotion.
5. Inspect build logs, API readiness, static pages, OG image, cookies, storage and owner isolation. Verify the canonical origin and webhook return path. Coordinate canonical-host testing with promotion; a staged URL is not automatically the canonical approved payment origin.
6. Promote the inspected deployment with `vercel promote <deployment-url> --scope mellardoos-projects`. Verify the canonical host in incognito, then execute the release's real Sandbox checks. Record the deployment ID, commit, worker revision, results and costs.

Persisted runs record the web build and all worker revisions that handled them. Export/qualification reject mixed or dirty revisions. A source checksum establishes consistency, not an independent claim about provider truth.

No deployment or provider qualification is implied by this file. Hosted acceptance still requires the real environment and fresh readback. Keep source, demo and evidence available through December 21.
