# COMRDY contributor instructions

Read `CURRENT_HANDOFF.md`, `docs/IMPLEMENTATION_SCOPE.md`, and the relevant source before changing code. The original blueprint is design history; the focused implementation scope supersedes it.

- Keep one coordinator; delegate only independent, disjoint work. Run one heavy install/build/test/browser task at a time. Preserve unrelated work and stop only task-owned processes.
- Use Sandbox payments only. Never expose credentials, browser control URLs, merchant tokens or raw buyer data. Do not silently replace provider failures with simulations.
- Every hard constraint must pass; missing evidence blocks capture regardless of severity. Recheck merchant/provider bindings before atomically claiming capture. Persist operation IDs before I/O; reconcile uncertain outcomes before another financial action.
- Keep test verdict, authorization, capture and merchant order separate. A PayPal order status alone never proves capture. A blocked authorization requires provider-confirmed void or an explicitly unresolved status.
- Recovery has one attempt under the unchanged confirmed contract and fresh approval. Saved playback makes no payment or agent calls.
- Report measured denominators and exact evidence boundaries. Local mocks are not live provider qualification. A public project page is not submission proof.
- The total additional-spend cap is $100. Credentials and personal eligibility declarations belong to the user. Current instruction: complete code first, ask for real credentials at the end.
- At a genuine context boundary, write a self-contained handoff with cwd/branch/HEAD, dirty/untracked work, exact checks, limits, blockers, process ownership and the smallest next action. The user permits one verified successor when needed; do not duplicate ownership or transfer credentials/caches.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
