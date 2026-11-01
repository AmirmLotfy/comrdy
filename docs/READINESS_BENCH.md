# Commerce readiness bench

`/readiness` executes twelve bounded synthetic scenarios through the existing `evaluateContract` and `evaluatePaymentGate` functions. The page is a deterministic behavior check, not a merchant certification, a browser benchmark, or PayPal qualification.

The page initially reports **0/12 executed**. A deliberate Run action makes a read-only GET to `/readiness/run`; the server creates synthetic inputs and calls both real core engines. There is no pre-filled successful result. Filtering never changes the execution denominator. What-if comparisons remain separate from the predefined suite.

## Scenarios

| ID                       | Expected contract | Expected payment gate | Boundary                                              |
| ------------------------ | ----------------- | --------------------- | ----------------------------------------------------- |
| `baseline`               | ALLOW             | ALLOW                 | Complete matching facts, USD 148 total                |
| `budget-boundary`        | ALLOW             | ALLOW                 | Exactly USD 160                                       |
| `budget-one-cent`        | DENY              | DENY                  | USD 160.01                                            |
| `variant`                | DENY              | DENY                  | S replaces approved M                                 |
| `quantity`               | DENY              | DENY                  | Two items replace one; quote held fixed               |
| `currency`               | DENY              | DENY                  | Merchant/provider agree on EUR, mandate requires USD  |
| `subscription`           | DENY              | DENY                  | Forbidden flag enabled; no subscription API           |
| `inventory`              | DENY              | DENY                  | Explicitly unavailable                                |
| `missing-total`          | REVIEW            | REVIEW                | Omitted evidence is unknown, not observed absence     |
| `stale-evidence`         | ALLOW             | REVIEW                | Matching facts exceed the five-minute evidence window |
| `stale-revision`         | ALLOW             | DENY                  | Merchant revision differs from expected binding       |
| `authorization-mismatch` | ALLOW             | DENY                  | Authorization ID differs from expected binding        |

ALLOW only means the gate permits these synthetic inputs. No capture is attempted. DENY and REVIEW both block capture. No real authorization is created, voided or resolved by this bench.

## Reproduce

Start the app using the repository's normal setup. The endpoint uses schema `1.0`, rejects unknown/duplicate fields and returns `Cache-Control: no-store`.

```sh
curl --fail-with-body 'http://127.0.0.1:3000/readiness/run?schema=1.0&mode=suite'
```

The bounded composer keeps the confirmed contract unchanged:

```sh
curl --fail-with-body 'http://127.0.0.1:3000/readiness/run?schema=1.0&mode=compare&totalMinor=16001&size=S&quantity=2&evidence=complete'
```

Compare mode requires all four fields: `totalMinor` integer cents from 13800 through 25000, `size` M/S, `quantity` 1/2, and `evidence` complete/missing-total/stale. Shipping supplies the difference between total and the fixed USD 129 item plus USD 9 tax. Quantity changes are isolated while the quote remains fixed. This is a constructed input, not a merchant price calculation. No arbitrary contract, provider resource, URL, model, file or library input is accepted.

The response includes:

- `evidenceKind: deterministic-synthetic`, fixed test clock and explicit zero provider/payment actions.
- `summary` with defined/executed cases, checked/matched expectations, and actual gate counts.
- Each case's declared expectation, both actual decisions, every constraint's source phrase/expected/observed value, gate reasons, changes, complete synthetic `input`, and `inputHash`.
- A schema-versioned reproduction request, relative endpoint, local curl command and `reportHash`.

The report uses a fixed 1 November 2026 test clock so repeated execution with the same code and inputs is reproducible. These timestamps are fixtures, not fresh merchant/provider observations. Input/report hashes detect changes to the exported data; they do not attest provider truth or identify a deployed code revision. Reproduce against the same reviewed source revision.

## UI and export boundaries

AG Grid Community supplies sortable columns, quick filtering and CSV export. The current APIs use `AllCommunityModule`, `ModuleRegistry` and the native Quartz theme API; no Enterprise license or hosted AG service is involved. Mobile uses scenario rows and the same selection/detail workflow.

Visible CSV exports an explicit list of case/decision columns, carries `deterministic-synthetic` and zero payment actions in every row, and neutralizes spreadsheet formula prefixes. Full JSON includes the whole completed report regardless of table filtering. Neither export includes account credentials or buyer records: this endpoint has no provider, state-store or session imports. The report's synthetic provider IDs are deliberately prefixed `SYNTHETIC-`.

The client imports only readiness **types**. Node's hashing implementation remains in the server module graph. The transport is a stateless GET handler under `/readiness/run`; it neither invokes payment machinery nor adds a payment execution endpoint. Unsupported HTTP methods receive Next.js's method rejection.

The what-if composer exposes four finite inputs, evaluates a matching baseline plus the edited checkout, and retains all hard failures/unknowns. Editing controls marks the displayed comparison as previous until explicitly evaluated again. Comparison cases do not count as additional suite qualification.

## Validation ownership

`tests/readiness.test.ts` covers cap boundaries, currency identity, missing evidence, stale inputs and payment bindings, compound failures, unchanged contract identity, strict query rejection, reproducible export hashes, CSV formula defense and integer money input. This specialist authored tests but did not execute tests, typecheck, build or browser automation; the coordinator owns the integrated validation pass.

Required integration checks: execute the readiness tests and normal typecheck/build; verify 0/12 before clicking and 12/12 after actual execution; inspect REVIEW versus DENY, compound composer output and stale comparison notice; verify filtering/CSV/JSON at desktop and 320px; keyboard selection/focus; confirm no provider or financial calls during suite/compare/export; run the prepared Postman/Newman kit separately. A local pass cannot qualify the live provider workflow.

Current references checked on 1 November 2026: [AG Grid modules](https://www.ag-grid.com/react-data-grid/modules/), [theming](https://www.ag-grid.com/react-data-grid/theming/), [CSV export/security](https://www.ag-grid.com/react-data-grid/csv-export/). Next.js server/client, CSS Modules and route-handler behavior were read from the installed `node_modules/next/dist/docs/` guides before implementation.
