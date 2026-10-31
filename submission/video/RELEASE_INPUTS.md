# Final production inputs

The local rehearsal completes the editable production path. These inputs deliberately remain pending until provider/hosting qualification; no credential is needed to review this checklist.

| Input | Prepared destination / action | Acceptance |
|---|---|---|
| Clean source | Commit, build, deploy the same SHA to web and worker | Provenance receipt matches executable source |
| AI corpus | `artifacts/intent-qualification.json` | 20 actual calls, all expected preservation/clarification checks, human output review |
| Payment samples | `artifacts/payment-qualification.json` | Latest three per scenario, 9/9 actual readback on same SHA |
| Protected evidence | `public/release/evidence.json` | Reviewed export, same revision, terminal provider states |
| Control evidence | `public/release/control.json` | Explicit reviewed offline export of completed isolated control; no approval URL |
| Actual footage | `public/media/release/01.mp4` through `07.mp4` | Seven scenes 12/23/25/30/35/20/20 seconds; readable actual UI/provider observations |
| Narration | `public/media/narration/final.wav` | 165 seconds, synthetic voice disclosed; actual final claims only |
| Captions | Reviewed JSON cues and matching VTT/SRT | Full narration, listening review, no caption overlap |
| Six images | `public/media/release/01.png` through `06.png` | Redaction review, readable desktop capture |
| Public URLs | Final manifest demo/source fields | Signed-out access; source carries MIT license |
| Render | `npm run video:render -- final-manifest.json` | 165-second 1920×1080 H.264 + audio; inspect scene transitions and closing links |
| Publication | Existing authorized user accounts at final stage | Public YouTube visibility; Devpost authenticated finalization receipt |

Never relabel rehearsal clips as provider footage. The rehearsed opening uses the homepage and explains the evidence boundary; the final opening uses the real control receipt. Render verification checks metadata and consistency, while the operator reviews actual content and link access.

The provider-run list must include the original variant-denied/voided attempt and its completed medium recovery. Their confirmed contract hash must match, with different order and authorization IDs and a merchant order bound to the recovery capture. Complete the live duplicate/restart/webhook checks in `docs/RELEASE_CHECKLIST.md` and retain their exact request/resource receipts; the film validator cannot establish that those external interactions occurred just from a rendered clip or a declared flag.
