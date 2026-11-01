# COMRDY film production

Current production: seven authentic 1920×872 chapters have been assembled for the 165-second timeline. The approved mix is unchanged. `mode: "review"` runs the same financial, provenance and asset checks as release, visibly marks the preview **REVIEW COPY — NOT APPROVED**, and writes only `artifacts/comrdy-review.mp4`. It does not assert human approval or publish. Release still requires the separate human review flags. Use `npm run video:render -- artifacts/review-manifest.json` for the local review copy.


Target: 165 seconds, 1920×1080, 30 fps, H.264. Editable composition: `video/index.tsx`. Script wording: `narration.json`. The supplied single voice recording and the timing table below supersede that file's old scene durations. Each claim is conditional on release evidence; the script is not a validation report.

1. Qualify protected Sandbox runs, recovery, retries, and the isolated ungated control. Export reviewed redacted evidence and record source commit. Do not film fixture runs as provider proof.
   The operator control persists an isolated merchant checkout and wrong-size order, gated on actual completed capture readback. It has no shopper or shipment. Film its redacted completed receipt only after live execution; source code and mocked tests are not provider proof.
2. Record seven clips using the storyboard and actual browser UI. Hide credentials, buyer identities, browser control URLs, approval tokens, and unrelated tabs. Keep the deliberate fault label visible. Capture approval only after login and exclude personal account data.
3. Use the supplied `/Users/frameless/Desktop/vo.wav` and `/Users/frameless/Desktop/music.mp3` through the single-recording assembly workflow below. No new voice generation or external audio calls are needed. The film visibly discloses synthetic narration throughout.
4. Listen to the source cuts and review all captions against the assembled voice. Preserve the supplied voice speed. Edit footage to the matching scene boundaries; never speed up actual approval footage without labeling the edit. Deliver both SRT and VTT. The composition's short scene labels are not a substitute for full captions.
5. Put reviewed clips/narration beneath `public/media`. Copy `manifest.example.json`, replace paths/release/run IDs, complete the explicit review fields only after checking every claim, then `npm run video:render -- path/to/manifest.json`.
6. Review the master at normal size and on a phone. Confirm readable evidence, no secrets, caption coverage, audio clarity, 165-second duration, and source/deployment correspondence. Upload the final master once to YouTube with public visibility. Verify it while signed out, then use that exact URL in Devpost.

Keep raw footage, source project, narration, captions, thumbnail, attribution and master. Do not commit public/media raw footage until privacy review. Budget: no more than the approved $10 media allocation without revisiting the total $100 cap.

The older `generate-narration.ts` and `assemble-narration.ts` workflow is retained as history for separate generated segments. Do not use it for the supplied single recording: it uses the old timing and permits acceleration.

## Supplied single-recording assembly

Run from `/Users/frameless/Desktop/Comrdy`, with the coordinator's heavy media slot available. `submission/video/supplied-audio.example.json` contains explicit paths to the supplied originals and the proposed local alignment. Copy it to an ignored working manifest and adjust paths only if files have moved. The output directory must not already exist; use a new versioned directory for each approved revision. The command never overwrites source audio or an earlier assembly.

```sh
cp submission/video/supplied-audio.example.json artifacts/supplied-audio.json
npx tsx scripts/assemble-supplied-audio.ts artifacts/supplied-audio.json --check-only
npx tsx scripts/assemble-supplied-audio.ts artifacts/supplied-audio.json
```

`--check-only` hashes and probes inputs and validates the complete sample-contiguous voice mapping, scene placements, captions and bounded settings. It writes no audio and does not assert listening review. Assembly makes no external calls; FFmpeg runs sequentially with one thread and bounded process time. Allow at least 300 MiB free for this audio step, plus separate space for footage and the eventual video render.

The 147.32-second voice remains at speed 1.0. All source samples are retained in order, with silence inserted between chapters. The alignment's candidate cuts came from acoustic silence and local ASR, so they still require listening. The default music begins at 12.9 seconds, leaving the opening control statement dry, and uses 152 seconds of the 152.215-second supplied score. It fades in over two seconds and out over four, ending at 164.9 seconds; no loop or tempo change is used. The quiet bed ducks beneath narration. Three short, quiet locally synthesized tones mark chapter transitions; they do not represent merchant or payment sounds. The script rejects more than five tones and refuses an unducked music configuration.

| Scene | Film interval | Length | Intended actual footage                                           |
| ----- | ------------- | ------ | ----------------------------------------------------------------- |
| 1     | 0–12 s        | 12 s   | Qualified isolated control receipt and disclosed size fault       |
| 2     | 12–37 s       | 25 s   | Instruction, compiled source phrases, buyer confirmation          |
| 3     | 37–59 s       | 22 s   | Original shopper recording, cart and redacted approval/fault      |
| 4     | 59–87 s       | 28 s   | Original denial, lineage and provider-confirmed void              |
| 5     | 87–119 s      | 32 s   | Original same-contract recovery and completed capture/order       |
| 6     | 119–142 s     | 23 s   | Actual synthetic readiness bench, visibly identified as synthetic |
| 7     | 142–165 s     | 23 s   | Actual judge workbench and read-only saved evidence               |

The first voice segment begins at 0.35 seconds and each later segment at its scene start plus 0.35 seconds. Copy these exact scene starts and lengths into the working film manifest. The `manifest.example.json` timing now matches this approved mix; its footage and review fields remain placeholders. Chapter six must retain the distinction between synthetic verification cases and provider qualification. If the required real receipts or footage are missing, the matching narration remains an unsupported release claim: stop release production at that gate.

Successful assembly creates:

- `mix.wav`: exactly 165 seconds, 48 kHz, stereo 16-bit PCM, target −16 LUFS with a measured acceptance band of ±1 LU and true peak no higher than −1.5 dBTP.
- `voice.wav`: isolated normalized voice on the identical 165-second timeline, 48 kHz stereo, suitable for clarity comparison or remixing.
- `captions.json`, `captions.vtt`, `captions.srt`: full proposed phrases retimed from the source captions; VTT/SRT use the same balanced line breaks as Remotion.
- `receipt.json`: input/output SHA-256 hashes, original preservation check, probes, two-pass voice and mix loudness results, final measurements, command arguments and elapsed times. It explicitly records that human review and post-AAC measurements remain pending.

Two-pass normalization measures each input timeline before applying its measured values. The receipt retains FFmpeg's reported normalization mode; it does not assume linear normalization if FFmpeg falls back to dynamic processing. A failed assembly keeps its diagnostics and working files for inspection, never relabels them a final mix, and must be retried in a fresh directory.

After listening and caption correction, copy only the reviewed `mix.wav` and caption assets to the film's `public/media` directory. Set working film `narration` to that mix and set `captions` to the generated JSON cue array, not a filename. Set `captionFile` to the matching public-relative VTT. Keep the originals and the private receipt under their original/ignored paths. Do not set any film review flag or screenshot `reviewed` field from the assembler's receipt. Every claim, spelling, cut and redaction still needs actual review.

The composition keeps a 60-pixel editorial rail and a separate caption band around the footage; it does not crop product evidence or invent outcome graphics. Footage remains at full opacity and normal speed. Chapter text enters over ten frames and a three-pixel progress line tracks chapter time; the `COMRDYReducedMotion` composition omits those continuous motions. The bundled Geist font loads before rendering, with its SIL Open Font License retained under `video/assets/OFL.txt`. Full subtitles are 40 pixels on the 1080p canvas, with persistent Sandbox/synthetic-narration disclosure above the product.

Run the normal guarded render command only after assembling the release manifest and its required evidence. The new composition and mixer still require coordinator type checking, a still-frame legibility inspection, a full render, listening review and a measurement of the encoded master's loudness/true peak. Earlier rehearsal render success below does not validate these changes or establish live provider acceptance. Check both desktop and phone playback and preserve all measurements with the final master.

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

## Reproducing the release chapter edit

`submission/video/compose-chapters.py` and `edit-plan.json` retain the exact chapter assembly recipe. Run `python3 submission/video/compose-chapters.py --check` before `--encode`. The command requires the privately retained original frame sequences, timestamp receipts, KERNEL recording and documentary plate assets at the recorded workspace-relative paths; it does not download or recreate provider evidence. Sequential FFmpeg assembly preserves source timestamps, normal shopper speed, deliberate static holds and visible disclosure strips. Every crop and source hash is recorded in `artifacts/film-edit-ledger.json`.

The final five seconds of the Remotion composition are an editorial end card with large demo/source links. It sits inside the footage well, preserving captions and Sandbox/synthetic-narration disclosure. It makes no additional product or provider claim.
