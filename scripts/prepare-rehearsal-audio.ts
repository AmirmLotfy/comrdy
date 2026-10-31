/** Zero-cost local draft voice. Never calls a remote provider. */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const scenes = JSON.parse(
  await readFile("submission/video/rehearsal-narration.json", "utf8"),
);
const dir = "public/media/rehearsal";
await mkdir(dir, { recursive: true });
const captions: { start: number; end: number; text: string }[] = [];
const entries: string[] = [];
let serial = 0;
for (const [i, scene] of scenes.entries()) {
  let cursor = scene.start;
  const sentenceFiles: string[] = [];
  for (const sentence of scene.text.match(/[^.!?]+[.!?]+/g) ?? [scene.text]) {
    const stem = `sentence-${serial++}`;
    await writeFile(`${dir}/${stem}.txt`, sentence.trim());
    execFileSync("say", [
      "-v",
      "Samantha",
      "-r",
      "158",
      "-f",
      `${dir}/${stem}.txt`,
      "-o",
      `${dir}/${stem}.aiff`,
    ]);
    const seconds = Number(
      execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=nw=1:nk=1",
          `${dir}/${stem}.aiff`,
        ],
        { encoding: "utf8" },
      ),
    );
    execFileSync("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      `${dir}/${stem}.aiff`,
      "-ar",
      "48000",
      "-ac",
      "2",
      `${dir}/${stem}.wav`,
    ]);
    captions.push({
      start: cursor,
      end: cursor + seconds,
      text: sentence.trim(),
    });
    cursor += seconds;
    sentenceFiles.push(`file '${stem}.wav'`);
  }
  if (cursor > scene.start + scene.seconds - 0.1)
    throw new Error(
      `Shorten scene ${i + 1}: ${cursor - scene.start}s exceeds slot ${scene.seconds}s`,
    );
  await writeFile(`${dir}/scene-${i}.txt`, sentenceFiles.join("\n"));
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    `${dir}/scene-${i}.txt`,
    "-af",
    `loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad,atrim=end_sample=${scene.seconds * 48000},asetpts=PTS-STARTPTS`,
    "-ar",
    "48000",
    "-ac",
    "2",
    `${dir}/scene-${i}.wav`,
  ]);
  entries.push(`file 'scene-${i}.wav'`);
}
await writeFile(`${dir}/concat.txt`, entries.join("\n"));
execFileSync("ffmpeg", [
  "-y",
  "-v",
  "error",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  `${dir}/concat.txt`,
  "-c",
  "copy",
  `${dir}/narration.wav`,
]);
const stamp = (s: number, sep = ".") => {
  const ms = Math.round(s * 1000);
  return `00:${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`;
};
await writeFile(`${dir}/captions.json`, JSON.stringify(captions, null, 2));
await writeFile(
  `${dir}/captions.vtt`,
  "WEBVTT\n\n" +
    captions
      .map((c) => `${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`)
      .join("\n"),
);
await writeFile(
  `${dir}/captions.srt`,
  captions
    .map(
      (c, i) =>
        `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${c.text}\n`,
    )
    .join("\n"),
);
console.log(
  "Draft local narration and sentence-timed captions prepared; human listen-through still required.",
);
