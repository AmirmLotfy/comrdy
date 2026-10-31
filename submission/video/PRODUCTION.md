# COMRDY film production

Target: 165 seconds, 1920×1080, 30 fps, H.264. Editable composition: `video/index.tsx`. Script: `narration.json`. Each claim is conditional on release evidence; this script is not a validation report.

1. Qualify protected Sandbox runs, recovery, retries, and the isolated ungated control. Export reviewed redacted evidence and record source commit. Do not film fixture runs as provider proof.
   The current control makes real Sandbox payment calls but mutates only a local fixture: it creates no Northpath cart or merchant order. Show that limitation on screen and retain the revised opening narration. Its capture readback qualifies payment only; do not call it a demonstrated wrong-size purchase.
2. Record seven clips using the storyboard and actual browser UI. Hide credentials, buyer identities, browser control URLs, approval tokens, and unrelated tabs. Keep the deliberate fault label visible. Capture approval only after login and exclude personal account data.
3. Generate narration with `npx tsx scripts/generate-narration.ts --qualified`. This one-time production path uses the current Speech API before its documented January 6, 2027 retirement. The film visibly discloses AI-generated narration. It uses a built-in voice, not a cloned person.
4. Review each segment. Measure with `ffprobe`. Edit pauses and clip timing; never speed up actual approval footage without labeling the edit. Assemble narration to 165 seconds. Generate sentence-level captions from the final audio, review timing and spelling, and deliver both SRT and VTT. The composition's short scene labels are not a substitute for full captions.
5. Put reviewed clips/narration beneath `public/media`. Copy `manifest.example.json`, replace paths/release/run IDs, set `qualified` only after checking every claim, then `npm run video:render -- path/to/manifest.json`.
6. Review the master at normal size and on a phone. Confirm readable evidence, no secrets, caption coverage, audio clarity, 165-second duration, and source/deployment correspondence. Upload the final master once to YouTube with public visibility. Verify it while signed out, then use that exact URL in Devpost.

Keep raw footage, source project, narration, captions, thumbnail, attribution and master. Do not commit public/media raw footage until privacy review. Budget: no more than the approved $10 media allocation without revisiting the total $100 cap.

`npx tsx scripts/assemble-narration.ts` measures each segment, rejects narration that would need more than 15% acceleration, normalizes audio and assembles the exact scene durations. It also creates explicitly draft SRT/VTT timing estimates. Review those against the actual voice before exporting the final captions; estimates are not forced alignment.

The installed Remotion CLI currently pins Zod 4.5.4. The root override uses patched Zod 4.6.7 to resolve GHSA-mrhx-c7xc-m3w5. A still render succeeds, but the CLI prints its strict-version compatibility warning. Recheck the final full render and retain the patched dependency unless Remotion publishes a compatible upgrade.
