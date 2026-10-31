# COMRDY film production

Target: 165 seconds, 1920×1080, 30 fps, H.264. Editable composition: `video/index.tsx`. Script: `narration.json`. Each claim is conditional on release evidence; this script is not a validation report.

1. Qualify protected Sandbox runs, recovery, retries, and the isolated ungated control. Export reviewed redacted evidence and record source commit. Do not film fixture runs as provider proof.
   The operator control persists an isolated merchant checkout and wrong-size order, gated on actual completed capture readback. It has no shopper or shipment. Film its redacted completed receipt only after live execution; source code and mocked tests are not provider proof.
2. Record seven clips using the storyboard and actual browser UI. Hide credentials, buyer identities, browser control URLs, approval tokens, and unrelated tabs. Keep the deliberate fault label visible. Capture approval only after login and exclude personal account data.
3. Generate narration with `npx tsx scripts/generate-narration.ts --qualified`. This one-time production path uses the current Speech API before its documented January 6, 2027 retirement. The film visibly discloses AI-generated narration. It uses a built-in voice, not a cloned person.
4. Review each segment. Measure with `ffprobe`. Edit pauses and clip timing; never speed up actual approval footage without labeling the edit. Assemble narration to 165 seconds. Generate sentence-level captions from the final audio, review timing and spelling, and deliver both SRT and VTT. The composition's short scene labels are not a substitute for full captions.
5. Put reviewed clips/narration beneath `public/media`. Copy `manifest.example.json`, replace paths/release/run IDs, complete the explicit review fields only after checking every claim, then `npm run video:render -- path/to/manifest.json`.
6. Review the master at normal size and on a phone. Confirm readable evidence, no secrets, caption coverage, audio clarity, 165-second duration, and source/deployment correspondence. Upload the final master once to YouTube with public visibility. Verify it while signed out, then use that exact URL in Devpost.

Keep raw footage, source project, narration, captions, thumbnail, attribution and master. Do not commit public/media raw footage until privacy review. Budget: no more than the approved $10 media allocation without revisiting the total $100 cap.

`npx tsx scripts/assemble-narration.ts` measures each segment, rejects narration that would need more than 15% acceleration, normalizes audio and assembles the exact scene durations. It also creates explicitly draft SRT/VTT timing estimates. Review those against the actual voice before exporting the final captions; estimates are not forced alignment.

The installed Remotion CLI currently pins Zod 4.5.4. The root override uses patched Zod 4.6.7 to resolve GHSA-mrhx-c7xc-m3w5. A still render succeeds, but the CLI prints its strict-version compatibility warning. Recheck the final full render and retain the patched dependency unless Remotion publishes a compatible upgrade.

## Local rehearsal pipeline (no accounts or spending)

The rehearsal is a separate deliverable, visibly labeled throughout. It uses actual local UI recordings, simulated outcomes, and the macOS Samantha draft voice. It is not the final submission film and cannot be promoted merely by changing a flag.

1. Start the local simulation production preview on port3000.
2. `npx tsx scripts/prepare-rehearsal-audio.ts` creates sentence-timed draft audio, SRT/VTT/JSON under ignored `public/media/rehearsal/`.
3. `npx tsx scripts/qa/record-rehearsal.ts` records seven clips and six local screenshots. It refuses remote origins and Sandbox mode. It creates `artifacts/rehearsal-manifest.json`.
4. `npm run video:render -- artifacts/rehearsal-manifest.json --check-only` validates assets.
5. `npm run video:render -- artifacts/rehearsal-manifest.json` renders `artifacts/comrdy-local-rehearsal.mp4`. The composition includes full captions, chapter numbers, a progress line, logo and persistent simulation disclosure.

The release manifest now requires `mode: "release"`, full source SHA, reviewed captions/redaction/intent outputs, six distinct reviewed screenshot entries, real public demo/source links and provider run IDs. Seven continuous clips must total165 seconds; ffprobe checks actual lengths, resolution, audio and the final1080p H.264 master. Captions must match the supplied VTT text. The release evidence hash/revision, clean web/worker execution receipts, live20-request corpus and nine consecutive payment qualification results must agree. These are consistency checks, not an independent attestation of merchant truth or a replacement for human review.

The opening control scene must use the actual operator-only control merchant-order receipt after real execution. Until that exists, keep rehearsal wording and do not claim a wrong-size merchant order was paid. The source implementation alone is not a receipt. Preserve the final original footage/audio/caption edits and asset attribution alongside the master.


Local production check: the complete 165-second rehearsal rendered successfully in Remotion at1920×1080/30fps with H.264 video and AAC audio. The patched dependency warning did not prevent this full render. The actual final provider footage still requires its own full render and listening/legibility review. `artifacts/rehearsal-master-metadata.json` records the local master specifications; `artifacts/comrdy-local-rehearsal-validation.json` hashes its source assets. No final-video publication is implied.
