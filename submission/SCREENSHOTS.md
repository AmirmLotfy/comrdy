# Six release screenshots

Capture from the qualified hosted release at 1440×1000 (or a legible crop), with no credentials, buyer identity, approval URL tokens, or browser control URLs.

1. Homepage: product purpose and signature lineage graphic.
2. Confirmed intent: customer instruction, source phrases, exact constraints and immutable contract hash.
3. Fault: disclosed M → S mutation, first divergence and DENY verdict.
4. Payment resolution: actual authorization ID with provider-confirmed VOIDED status, clearly separate from verdict.
5. Recovery comparison: original blocked attempt alongside fresh approved $148 capture under the same contract.
6. Evidence/results: redacted provider resources and measured scenario denominators, with simulation and Sandbox results separated.

Local UI captures belong in artifacts and are not provider proof. Do not use fixture screenshots for items 3–6 in the final submission unless they are visibly labeled as illustrations and the narrative explicitly says so.

## Prepared capture and packaging

`scripts/qa/record-rehearsal.ts` creates six **local rehearsal** images under ignored `public/media/rehearsal/`: homepage, confirmed contract, storefront, denied case, recovery comparison and recorded playback. Their mode is simulation and they are not the six qualified provider-release shots above.

For release, capture the six original shot-list states from the actual hosted build after qualification. Review each image for buyer names, credentials, approval tokens and browser-control URLs before placing it in `public/media/release/`. Add its public-relative path, descriptive label and `reviewed: true` to the film manifest. The renderer verifies six distinct readable images and records SHA256 values in the media-validation receipt. Never copy raw worker screenshots into public assets automatically.
