import { execFileSync } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const scenes = JSON.parse(
  await readFile("submission/video/narration.json", "utf8"),
);
await mkdir("artifacts/audio", { recursive: true });
const entries: string[] = [];
const captions: { start: number; end: number; text: string }[] = [];
for (const [index, scene] of scenes.entries()) {
  const source = `public/media/narration/${String(index + 1).padStart(2, "0")}.wav`;
  const seconds = Number(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        source,
      ],
      { encoding: "utf8" },
    ),
  );
  if (!Number.isFinite(seconds) || seconds <= 0)
    throw new Error("Invalid narration duration");
  const speed = Math.max(1, seconds / (scene.seconds - 0.5));
  if (speed > 1.15)
    throw new Error(
      `Scene ${index + 1} is too long. Rewrite or regenerate it rather than rushing the narration.`,
    );
  const output = `artifacts/audio/${index}.wav`;
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    source,
    "-af",
    `atempo=${speed},loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=duration=${scene.seconds}`,
    "-ar",
    "48000",
    "-ac",
    "2",
    output,
  ]);
  entries.push(`file '${index}.wav'`);
  const sentences = scene.text.match(/[^.!?]+[.!?]+/g) ?? [scene.text];
  const total = sentences.reduce(
    (sum: number, text: string) => sum + text.trim().split(/\s+/).length,
    0,
  );
  let cursor = scene.start;
  for (const sentence of sentences) {
    const end =
      cursor +
      ((seconds / speed) * sentence.trim().split(/\s+/).length) / total;
    captions.push({ start: cursor, end, text: sentence.trim() });
    cursor = end;
  }
}
await writeFile("artifacts/audio/concat.txt", entries.join("\n"));
execFileSync("ffmpeg", [
  "-y",
  "-v",
  "error",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  "artifacts/audio/concat.txt",
  "-c",
  "copy",
  "public/media/narration/final.wav",
]);
const time = (n: number, sep: string) => {
  const ms = Math.round(n * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`;
};
await writeFile(
  "artifacts/narration-DRAFT.srt",
  captions
    .map(
      (c, i) =>
        `${i + 1}\n${time(c.start, ",")} --> ${time(c.end, ",")}\n${c.text}\n`,
    )
    .join("\n"),
);
await writeFile(
  "artifacts/narration-DRAFT.vtt",
  "WEBVTT\n\n" +
    captions
      .map((c) => `${time(c.start, ".")} --> ${time(c.end, ".")}\n${c.text}\n`)
      .join("\n"),
);
console.log(
  "165-second narration assembled. Draft caption timings are word-weighted estimates: review against the actual audio before release.",
);
