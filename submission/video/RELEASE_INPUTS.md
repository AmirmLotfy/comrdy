# Final production inputs

The local rehearsal establishes the editable production path. This is an input checklist, not evidence that release requirements passed. The supplied 165-second mix is approved for narration clarity and music level only. Provider qualification, footage, caption review and final-master acceptance remain pending; no credential is needed to review this checklist.

| Input | Prepared destination / action | Acceptance |
|---|---|---|
| Clean source | Commit, build, deploy the same SHA to web and worker | Provenance receipt matches executable source |
| AI corpus | `artifacts/intent-qualification.json` | 20 actual calls, all expected preservation/clarification checks, human output review |
| Payment samples | `artifacts/payment-qualification.json` | Latest three per scenario, 9/9 actual readback on same SHA |
| Protected evidence | `public/release/evidence.json` | Reviewed export, same revision, terminal provider states |
| Control evidence | `public/release/control.json` | Explicit reviewed offline export of completed isolated control; no approval URL |
| Actual footage | Seven named chapter paths in `submission/video/manifest.example.json` beneath `public/media/release/` | Starts 0/12/37/59/87/119/142; durations 12/25/22/28/32/23/23 seconds; readable actual UI/provider observations, with chapter six explicitly synthetic |
| Narration | Copy approved `artifacts/supplied-audio-v1/mix.wav` to `public/media/narration/final.wav` | Exact approved 165-second mix; preserve its hash and speed, disclose synthetic voice; every release claim must have actual evidence |
| Captions | Reviewed JSON cues and matching VTT/SRT | Full narration, listening review, no caption overlap |
| Six images | `public/media/release/01.png` through `06.png` | Redaction review, readable desktop capture |
| Public URLs | Final manifest demo/source fields | Signed-out access; source carries MIT license |
| Render | `npm run video:render -- final-manifest.json --check-only`, then omit `--check-only` | 165-second 1920×1080/30 fps H.264 + audio; inspect desktop/phone playback, transitions and closing links; measure encoded loudness/true peak separately |
| Publication | Existing authorized user accounts at final stage | Public YouTube visibility; Devpost authenticated finalization receipt |

Never relabel rehearsal clips as provider footage. The rehearsed opening uses the homepage and explains the evidence boundary; the final opening uses the real control receipt. Render verification checks metadata and consistency, while the operator reviews actual content and link access.

`manifest.example.json` is deliberately incomplete: replace the source-commit placeholder, supply qualified run IDs, real public links and full reviewed caption cues, and resolve every asset path. Keep review flags false until the corresponding review occurs. Example captions describe intended qualified outcomes, not observed results. Follow `PRODUCTION.md` for the supplied-audio timeline; copy the reviewed JSON cue array into `captions` and use its matching public-relative VTT as `captionFile`. Retain SRT separately. The renderer starts each chapter file at source time zero, so assemble the seven edited clips before rendering.

The provider-run list needs at least three distinct qualified runs, including the original variant-denied/voided attempt and its completed medium recovery. Their confirmed contract hash must match, with different order and authorization IDs and a merchant order bound to the recovery capture. Complete the live duplicate/restart/webhook checks in `docs/RELEASE_CHECKLIST.md` and retain their exact request/resource receipts; the film validator cannot establish that those external interactions occurred just from a rendered clip or a declared flag.
