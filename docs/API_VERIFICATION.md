# Reproducible API verification

Import [`public/verification/comrdy.postman_collection.json`](../public/verification/comrdy.postman_collection.json) into Postman, or run the same collection with the included Newman CLI:

```sh
npx newman run public/verification/comrdy.postman_collection.json --env-var baseUrl=http://127.0.0.1:3000
```

For a hosted check, replace `baseUrl` with the verified COMRDY origin. No credential, API key, buyer login or access code is needed. The collection contains 15 bounded requests; it does not call compile, start, approval, recovery, PayPal or an AI provider. Its POSTs deliberately send invalid confirmation data, an untrusted origin, and nonexistent public capture/void commands. These must be rejected.

Checks cover all 12 deterministic suite expectations, repeatable report hashes, exact budget boundaries, missing and stale evidence, quantity drift, unknown/duplicate/out-of-range input rejection, origin enforcement and private financial-command boundaries. Results establish these specific HTTP behaviors only. Owner isolation, worker concurrency and provider orchestration are covered separately by repository tests; actual PayPal qualification remains separate.

The public route `/readiness/run` accepts only versioned finite input fields. Its report includes exact synthetic inputs, constraints, observations, gate reasons and hashes, with zero provider calls and zero financial actions. It uses the same engine as the payment path but cannot authorize a payment. It is intentionally outside the session-backed `/api/v1` workflow.

In Postman, set the collection variable `baseUrl`. Newman `--env-var` overrides it for command-line use. The downloadable kit is served at `/verification/comrdy.postman_collection.json`. Execution receipts belong in ignored `artifacts/`; do not replace pending live-provider results with this report.
