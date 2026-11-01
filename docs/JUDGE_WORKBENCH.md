# Judge evidence workbench

`/judges` is a read-only index of actual records available to the current browser session and the reviewed public library. The suggested three-minute path is saved evidence → local readiness bench → the real transaction lab. The timing is a suggested review budget, not measured task completion.

## Reference lock

The current COMRDY white/ink/Signal Blue design remains the target. Full Refero styles retrieved before implementation: Vercel `32824f01-0f25-473e-b57f-d8f2121bbcb1` for precise schematic structure and Geist hierarchy; Linear Changelog `11d3e58a-87d7-4a9a-bbf5-720f4fd3ffc6` for weight-500 headlines and compact metadata only. Dark glass, pill navigation, gradients, lift/glow and decorative charts are excluded. User-approved blue, ice and teal distinguish the overview, evidence and local executable-check sections.

Product references: [GitHub table](https://refero.design/pages/1f9aac57-0cd3-4eb4-869f-cf8f9fd52b1d) for explicit filters/counts and scan-friendly rows; [Weights & Biases experiment workspace](https://refero.design/pages/1f1207ae-657c-4d0e-878f-8df4d67e39c3) for grouped evidence panels. The latter screenshot was chart-focused, so no chart or invented measurement is borrowed.

| Decision                                                         | Source and role                           | Reason                                                                |
| ---------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| Prominent Commerce Ready heading and three numbered review steps | User brief + Vercel structure             | Gives judges a short path without inventing a score                   |
| Blue overview, ice source panels, teal local-suite link          | User color direction                      | Separates evidence reading, source availability and executable checks |
| Full-record counters separate from filtered results              | GitHub table + evidence rules             | Searching cannot silently change the measurement denominator          |
| AG Grid desktop and factual mobile cards                         | GitHub table + mobile requirement         | Keeps inspection usable across screen widths                          |
| Thin borders, medium-weight Geist, restrained hover              | Existing brand + bounded Linear borrowing | Adds hierarchy without card lift or decorative motion                 |

## Data and safety boundaries

- The page calls only GET `/api/v1/runs` and GET `/api/v1/library`, independently through `Promise.allSettled`. One failed source does not discard the other. AppShell separately reads configuration status; configuration presence is not live qualification.
- `/runs` already contains owned runs plus published library runs. Deduplication therefore prefers the published payload for IDs present in `/library`. Only IDs absent from a successfully loaded library are labeled session records. If the library is unavailable, non-library rows are labeled session-response records with publication status unknown. Membership in `/runs` alone never grants an ownership claim.
- Source counts use the complete deduplicated set available from successful responses. Filtered result counts are reported separately. Malformed rows without usable IDs are excluded and their count is disclosed.
- Authorization is projected from matching saved authorization/void evidence; capture is projected separately from matching saved capture evidence. Generic run status and PayPal order status cannot establish either. Merchant-order presence and capture linkage are separate facts. These projections are inspection aids, not independent provider attestation or release qualification.
- Evidence links use `/cases/:id?playback=1`. The coordinator owns the shared read-only case guard that suppresses approval/cancellation and recovery controls.
- CSV is generated only from an explicit metadata/fact allowlist. It excludes contracts, events, raw buyer data, approval URLs, credentials and provider resource IDs. Formula prefixes (including leading whitespace/control characters) are escaped. Built-in grid CSV is disabled. Export is a local browser download and makes no API request.
- No invented rows, qualification score, provider acceptance, test verdict or global no-evidence claim is shown. Empty and partial states state the limits of the loaded sources.

AG Grid implementation references: [module registration](https://www.ag-grid.com/react-data-grid/modules/), [theming](https://www.ag-grid.com/react-data-grid/theming/) and [CSV security](https://www.ag-grid.com/react-data-grid/csv-export/). The installed Community package is used; no Enterprise feature or dependency is added.

## Verification ownership

Pure projection tests cover union deduplication, partial-source provenance, full versus filtered denominators, independent payment facts and CSV allowlisting/formula escaping. The specialist prepares source and tests without running build, test or browser work. The coordinator owns execution and rendered checks, including GET-only browsing/export, crafted playback queries, responsive overflow, native filters, keyboard focus and current empty-state accuracy. None of these local checks qualifies the live providers.
