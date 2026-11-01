# YouTube publication copy

Status: **Published publicly November 1, 2026.** [Watch COMRDY](https://www.youtube.com/watch?v=Or9gooJFwSo). Uploaded once, with the approved thumbnail and English captions. Hosted playback verified at 1920×1080 and 165.021 seconds; YouTube initial copyright/Community Guidelines checks reported no issues. See `../receipt.json`.

Title: **COMRDY — Commerce Ready | PayPal AI Hackathon**

Description:

```text
A payment can succeed and still be the wrong purchase.

COMRDY means Commerce Ready: a transaction test lab for engineers building AI checkout. Follow a confirmed buyer contract, a disclosed checkout fault, a blocked capture and provider-confirmed void, then one bounded recovery under the same instructions.

Try the demo: https://comrdy.vercel.app
Judge workbench: https://comrdy.vercel.app/judges
Public MIT source: https://github.com/AmirmLotfy/comrdy
Measured results: https://comrdy.vercel.app/release/qualification.json

00:00 Payment success, wrong purchase
00:12 Confirm the buyer's intent
00:37 Shopper and disclosed checkout fault
00:59 Block capture and confirm void
01:27 Bounded recovery and duplicate commands
01:59 Synthetic readiness bench
02:22 Inspectable evidence — Commerce Ready

All payments use PayPal Sandbox and one fictional merchant. The opening is a documentary visualization of an isolated ungated control receipt, not a physical shipment. Saved evidence views are labeled. The readiness bench uses synthetic cases and makes no provider calls.

Finite release samples: 9/9 original payment runs (three valid captures, three variant denials/voids, three shipping denials/voids), plus one completed same-contract recovery. The 20-request intent corpus met automated expectations: eight executable and twelve requiring clarification. These results are not general model accuracy or production guarantees. See the linked report for semantic caveats and live-versus-mocked test boundaries.

Built with PayPal, OpenAI, KERNEL, Render, Vercel, PostgreSQL, Next.js, AG Grid Community and Postman. OpenAI Codex assisted development and production. Narration is synthetic and supplied by the author; the author also supplied the music. Thumbnail artwork uses OpenAI image generation with COMRDY's original logo. Film assembled in Remotion and FFmpeg from actual product recordings and disclosed receipt graphics.
```

Publication recipe (completed): upload the accepted 165-second 1080p H264 master once. Use `submission/assets/youtube-thumbnail.png` and the matching `public/media/release/captions.srt` (resolve actual final path from the release manifest). Audience: engineering product demo, not made for children. Public visibility is required by the chosen submission plan. Verify processing, duration, captions, visibility and the exact watch URL before inserting it into the existing Devpost entry. Preserve a receipt; an upload dialog alone is not proof of publication.
