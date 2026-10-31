# COMRDY implementation scope — 2026-11-01

This document supersedes the original blueprint's five-week implementation schedule and broad SaaS P0. Preserve the original blueprint as design history.

Canonical mission: one Ocean Shell, blue, M, USD 160 delivered cap, no substitutions or subscriptions. Item 12900, shipping 1000, tax 900; total 14800 minor units. Shipping fault: 3500 shipping, total 17300.

All hard constraints must pass; unknown is not permission. Authorize only after preflight; recheck merchant revision and provider resources before capture. DENY/REVIEW requires void/reconciliation. Replay is read-only; recovery is one fresh attempt under the unchanged contract with fresh buyer approval.

Hosted target (updated by the user on November 1): Vercel hosts the Next.js website, controlled merchant and API; a single persistent companion worker retains managed PostgreSQL jobs and private evidence storage. `render.worker.yaml` prepares that worker/database; `render.yaml` remains the all-in-one alternative. No Redis, multi-tenancy, billing, arbitrary merchant onboarding, refund/subscription claims or protocol certification. KERNEL browser stays on the controlled merchant. OpenAI gpt-6-luna is advisory/agent execution only. No model controls capture.

Budget: USD 100 additional total, existing credits first. No costs incurred during initial implementation. Preserve evidence through December 21. Credentials requested only after code/local verification, per user's instruction.

Local simulation is not PayPal/AI/provider acceptance. Never present fixtures as observed provider results. Current acceptance receipts belong in CURRENT_HANDOFF.md.
