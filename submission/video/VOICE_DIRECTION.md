# COMRDY voiceover handoff

Use `VOICEOVER.txt` as the verbatim transcript and `narration.json` for the seven scene timings. Target film: **2:45**; target spoken delivery: about **145–155 words per minute**, leaving room for the interface. Pronounce COMRDY **“com-ready”**, one word; AI **“A-I”**; PayPal as usual. The name means **Commerce Ready**.

This is the intended final Sandbox film script. Its opening capture, denial/void, recovery and retry claims require the authentic release receipts and corresponding footage before publication. The current local rehearsal is explicitly a simulation. Do not relabel that footage or publish this narration over it as provider proof. If any live outcome differs, revise the affected passage before the final recording.

## Google AI Studio

Open Google AI Studio's speech-generation interface. Choose a supported **single-speaker TTS** model and one clear adult English voice; audition a short passage first. Google's current guide lists Gemini 3.8 Flash TTS and describes separate voice/style controls. Use whichever supported TTS option your account actually exposes. [Official speech-generation guide](https://ai.google.dev/gemini-api/docs/speech-generation).

Put the following in the **style / direction** field, separate from the transcript:

> Narrate an elegant product film for an engineering audience. Calm, confident, curious and precise. Natural international English; one consistent adult voice. Speak around 150 words per minute, with clear consonants and relaxed sentence endings. No sales pitch, exaggerated excitement, whispering, theatrical suspense, or robotic cadence. Pronounce “COMRDY” as “com-ready”. Read “AI” as the letters A-I. Give slight emphasis to “wrong purchase”, “every hard constraint”, “blocks capture”, and “Commerce Ready”. Use short pauses at paragraph breaks and a brief beat after the opening sentence. Read the transcript exactly. Do not read directions, add introductions, summarize, or add music. Keep the same microphone distance and room tone throughout.

Paste only `VOICEOVER.txt` into the transcript field. For more reliable timing, generate seven separate clips using each `text` value from `narration.json`, keeping the same voice and style. Save as `01.wav` through `07.wav`. Keep the native lossless WAV output; 24 kHz is usable. Do not convert to MP3 or artificially upsample to claim higher quality. We will normalize and resample once during assembly.

Listen for incorrect pronunciation, invented words, harsh sibilance and clipped endings. Keep 0.3–0.5 seconds of clean room tone at clip boundaries. The scene windows are 12, 23, 25, 30, 35, 20 and 20 seconds. Do not rush to force a clip into its window; send the original files and timing will be adjusted within the sub-three-minute film. Preserve the generation/model/voice details for attribution.

Save your audio to the ignored `public/media/release/voiceover/` directory, or provide the files in the chat. No API key is needed in chat. Final production will disclose synthetic narration in the video description/credits.

## Background music prompt

> Compose an original 165-second instrumental underscore for a precise, premium software product film about verifying AI commerce. Restrained contemporary electronic score at about 96 BPM. Warm muted analog pulse, very light tactile percussion, sparse soft marimba-like notes and a clean low synth foundation. Professional, thoughtful, quietly confident. Leave the center and speech-frequency range open for continuous narration. No vocals, spoken words, choir, recognizable melodies, dramatic trailer impacts, risers, EDM drops, busy arpeggios, or alarm sounds. Begin with two seconds of space. Introduce a subtle pulse from 0:12, slightly tighten the rhythm at 0:55, ease the tension at 1:30, and arrive at a calm resolved ending between 2:35 and 2:45. Gentle transitions, no sudden volume changes. Deliver a clean stereo WAV without mastering for maximum loudness, plus stems if available. Do not imitate any named artist or copyrighted song.

Keep music optional until its usage rights are recorded. Mix quietly beneath the voice, automate dips around key verdicts, and use a short clean fade. Final loudness and intelligibility need a listening pass; a waveform measurement alone is insufficient.

## Film cues

| Time | Footage |
| --- | --- |
| 0:00–0:12 | Authentic isolated ungated Sandbox control; completed capture and wrong merchant order together. |
| 0:12–0:35 | Mandate, source phrases, editable constraints and explicit confirmation. |
| 0:35–1:00 | Northpath shopping, actual agent observations, buyer approval, disclosed mutation. |
| 1:00–1:30 | Intent Lineage, failing hard rule, capture denial, independently retrieved void status. |
| 1:30–2:05 | Unchanged contract, fresh recovery/approval, exact capture and merchant order, retry evidence. |
| 2:05–2:25 | Execute readiness suite, inspect missing evidence, compose a counterfactual and export. Clearly label synthetic. |
| 2:25–2:45 | Judge evidence workbench, original/recovery comparison, final verified demo/source links. |

No claim of universal repair, merchant certification, prompt-injection immunity, or customer savings.
