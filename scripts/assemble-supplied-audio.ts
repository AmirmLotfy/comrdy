import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile,
  realpath,
  rm,
  stat,
  statfs,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { captionLines } from "./lib/film-presentation";

const RATE = 48_000;
const SECONDS = 165;
const SAMPLES = RATE * SECONDS;
const SCENE_SECONDS = [12, 25, 22, 28, 32, 23, 23];
const MIB = 1024 * 1024;
const MAX_INPUT = 256 * MIB;
const MAX_CHILD_MS = 180_000;
const FINAL_TARGET = { i: -16, tp: -1.7, lra: 11 };
const VO_TARGET = { i: -16, tp: -2, lra: 11 };
type Cue = { start: number; end: number; text: string };
type Scene = {
  scene: number;
  sourceStart: number;
  sourceEnd: number;
  filmStart: number;
  filmSeconds: number;
  voiceFilmStart: number;
  speed: number;
};
type Tone = {
  at: number;
  frequency: number;
  seconds: number;
  peakDb: number;
  label: string;
};
type Config = {
  kind: "comrdy-supplied-audio/v1";
  voice: string;
  music: string;
  alignment: string;
  sourceCaptions: string;
  outputDir: string;
  musicSettings: {
    start: number;
    sourceStart: number;
    seconds: number;
    gainDb: number;
    fadeIn: number;
    fadeOut: number;
    duck: boolean;
  };
  cues: Tone[];
};
type Probe = {
  format: { duration: string };
  streams: {
    codec_type: string;
    codec_name: string;
    sample_rate?: string;
    channels?: number;
    duration_ts?: number;
    time_base?: string;
  }[];
};
type Loudness = {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
  output_i: string;
  output_tp: string;
  normalization_type: string;
};
const number = (value: unknown, label: string, min: number, max: number) => {
  assert.ok(
    typeof value === "number" &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max,
    `${label} must be in ${min}..${max}`,
  );
  return value;
};
const sample = (seconds: number) => Math.round(seconds * RATE);
const exactTail = `apad,atrim=end_sample=${SAMPLES},asetpts=PTS-STARTPTS`;
const rounds = (n: number) => Math.round(n * 1000) / 1000;
const commands: { program: string; args: string[]; milliseconds: number }[] =
  [];

/** Spawn arguments directly, never a shell. Bound process time and diagnostic memory. */
async function command(
  program: string,
  args: string[],
  timeout = MAX_CHILD_MS,
) {
  const started = Date.now();
  return await new Promise<{ stdout: string; stderr: string }>(
    (done, reject) => {
      const child = spawn(program, args, {
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "",
        stderr = "",
        timedOut = false;
      let force: ReturnType<typeof setTimeout> | undefined;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        force = setTimeout(() => child.kill("SIGKILL"), 3000);
      }, timeout);
      child.stdout.on("data", (data: Buffer) => {
        stdout = (stdout + data.toString()).slice(-1024 * 1024);
      });
      child.stderr.on("data", (data: Buffer) => {
        stderr = (stderr + data.toString()).slice(-128 * 1024);
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        if (force) clearTimeout(force);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (force) clearTimeout(force);
        commands.push({ program, args, milliseconds: Date.now() - started });
        if (timedOut || code !== 0)
          reject(
            new Error(
              `${program} ${timedOut ? "timed out" : `exited ${code}`}\n${stderr.slice(-5000)}`,
            ),
          );
        else done({ stdout, stderr });
      });
    },
  );
}
const ffmpeg = (args: string[]) =>
  command("ffmpeg", [
    "-nostdin",
    "-hide_banner",
    "-nostats",
    "-n",
    "-threads",
    "1",
    "-filter_threads",
    "1",
    "-filter_complex_threads",
    "1",
    ...args,
  ]);
async function probe(path: string): Promise<Probe> {
  return JSON.parse(
    (
      await command(
        "ffprobe",
        ["-v", "error", "-show_format", "-show_streams", "-of", "json", path],
        15_000,
      )
    ).stdout,
  );
}
async function hash(path: string) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest("hex");
}
async function input(path: unknown) {
  assert.ok(
    typeof path === "string" && path.trim(),
    "Every input needs an explicit local path",
  );
  const full = await realpath(resolve(path));
  const info = await stat(full);
  assert.ok(
    info.isFile() && info.size > 0 && info.size <= MAX_INPUT,
    "Input must be a nonempty local file <=256MiB",
  );
  return { path: full, bytes: info.size, sha256: await hash(full) };
}
function parseLoudness(stderr: string): Loudness {
  const matches = stderr.match(/\{\s*"input_i"[\s\S]*?\}/g);
  assert.ok(matches?.length, "FFmpeg did not return loudness measurements");
  const result = JSON.parse(matches.at(-1)!) as Loudness;
  for (const key of [
    "input_i",
    "input_tp",
    "input_lra",
    "input_thresh",
    "target_offset",
  ] as const)
    assert.ok(Number.isFinite(Number(result[key])), `Invalid loudness ${key}`);
  return result;
}
async function measure(file: string, target = FINAL_TARGET) {
  const result = await ffmpeg([
    "-i",
    file,
    "-af",
    `loudnorm=I=${target.i}:TP=${target.tp}:LRA=${target.lra}:print_format=json`,
    "-f",
    "null",
    "-",
  ]);
  return parseLoudness(result.stderr);
}
async function normalize(
  file: string,
  output: string,
  target: typeof FINAL_TARGET,
) {
  const first = await measure(file, target);
  const filter = `loudnorm=I=${target.i}:TP=${target.tp}:LRA=${target.lra}:measured_I=${first.input_i}:measured_TP=${first.input_tp}:measured_LRA=${first.input_lra}:measured_thresh=${first.input_thresh}:offset=${first.target_offset}:linear=true:print_format=json,aresample=${RATE},${exactTail}`;
  const result = await ffmpeg([
    "-i",
    file,
    "-af",
    filter,
    "-ar",
    String(RATE),
    "-ac",
    "2",
    "-c:a",
    "pcm_s16le",
    "-t",
    String(SECONDS),
    "-fs",
    String(80 * MIB),
    output,
  ]);
  return { firstPass: first, secondPass: parseLoudness(result.stderr) };
}
function timestamp(value: number, separator = ".") {
  const ms = Math.round(value * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${separator}${String(ms % 1000).padStart(3, "0")}`;
}
function validateCaptions(captions: Cue[], end: number) {
  assert.ok(
    Array.isArray(captions) && captions.length > 7 && captions.length < 300,
    "Expected 8..299 caption cues",
  );
  let previous = 0;
  for (const cue of captions) {
    number(cue.start, "Caption start", previous, end);
    number(cue.end, "Caption end", cue.start + 0.001, end);
    assert.ok(
      typeof cue.text === "string" &&
        cue.text.trim() &&
        cue.text.trim().length <= 100,
      "Split captions into <=100-character phrases",
    );
    previous = cue.end;
  }
}

const filename = process.argv[2];
assert.ok(
  filename,
  "Usage: npx tsx scripts/assemble-supplied-audio.ts manifest.json [--check-only]",
);
assert.ok(
  process.argv.slice(3).every((arg) => arg === "--check-only"),
  "Unknown argument",
);
const manifestInput = await input(filename);
const config: Config = JSON.parse(await readFile(manifestInput.path, "utf8"));
assert.equal(config.kind, "comrdy-supplied-audio/v1");
const voice = await input(config.voice),
  music = await input(config.music);
const alignmentInput = await input(config.alignment),
  captionInput = await input(config.sourceCaptions);
const alignment = JSON.parse(await readFile(alignmentInput.path, "utf8")) as {
  scenes: Scene[];
  humanListeningReview?: boolean;
};
const sourceCaptions: Cue[] = JSON.parse(
  await readFile(captionInput.path, "utf8"),
);
const scenes = alignment.scenes;
const voiceProbe = await probe(voice.path),
  musicProbe = await probe(music.path);
assert.ok(
  voiceProbe.streams.some((s) => s.codec_type === "audio") &&
    musicProbe.streams.some((s) => s.codec_type === "audio"),
  "Both inputs must contain audio",
);
assert.equal(
  voiceProbe.streams.find((s) => s.codec_type === "audio")?.channels,
  1,
  "This supplied-voice workflow expects a mono recording; do not silently downmix another source",
);
const voiceSeconds = Number(voiceProbe.format.duration),
  musicSeconds = Number(musicProbe.format.duration);
number(voiceSeconds, "Voice duration", 1, SECONDS);
number(musicSeconds, "Music duration", 1, 600);
assert.ok(
  Array.isArray(scenes) && scenes.length === 7,
  "Exactly seven alignment scenes required",
);
let previousSource = 0,
  previousFilm = 0;
for (const [i, scene] of scenes.entries()) {
  assert.equal(scene.scene, i + 1);
  assert.equal(scene.speed, 1, "Voice speed must remain 1.0");
  number(scene.sourceStart, "Source start", 0, voiceSeconds);
  number(
    scene.sourceEnd,
    "Source end",
    scene.sourceStart + 0.1,
    voiceSeconds + 0.001,
  );
  assert.equal(
    sample(scene.sourceStart),
    sample(previousSource),
    "Source cuts must cover every voice sample exactly once",
  );
  assert.equal(scene.filmStart, previousFilm, "Film scenes must be contiguous");
  assert.equal(
    scene.filmSeconds,
    SCENE_SECONDS[i],
    "Use the supplied voice's seven-scene film schedule",
  );
  number(
    scene.voiceFilmStart,
    "Voice placement",
    scene.filmStart,
    scene.filmStart + scene.filmSeconds,
  );
  assert.ok(
    sample(scene.voiceFilmStart) +
      sample(scene.sourceEnd) -
      sample(scene.sourceStart) <=
      sample(scene.filmStart + scene.filmSeconds),
    "Voice segment does not fit its scene",
  );
  previousSource = scene.sourceEnd;
  previousFilm = scene.filmStart + scene.filmSeconds;
}
assert.equal(previousFilm, SECONDS);
assert.ok(
  Math.abs(sample(previousSource) - sample(voiceSeconds)) <= 1,
  "Alignment must retain the complete supplied voice",
);
validateCaptions(sourceCaptions, voiceSeconds);
const captions = sourceCaptions.map((cue) => {
  const scene = scenes.find(
    (s) => cue.start >= s.sourceStart - 0.001 && cue.end <= s.sourceEnd + 0.001,
  );
  assert.ok(
    scene,
    "A source caption crosses a cut; review/split it before assembly",
  );
  const offset = scene.voiceFilmStart - scene.sourceStart;
  return {
    start: rounds(cue.start + offset),
    end: rounds(cue.end + offset),
    text: cue.text.replace(/\s+/g, " ").trim(),
  };
});
validateCaptions(captions, SECONDS);
const ms = config.musicSettings;
assert.ok(ms && typeof ms.duck === "boolean");
assert.equal(ms.duck, true, "The supplied music must duck beneath narration");
number(ms.start, "Music placement", 0, SECONDS - 1);
number(ms.sourceStart, "Music source start", 0, musicSeconds - 1);
number(
  ms.seconds,
  "Music duration",
  1,
  Math.min(SECONDS - ms.start, musicSeconds - ms.sourceStart),
);
number(ms.gainDb, "Music gain", -30, -10);
number(ms.fadeIn, "Music fade in", 0.1, ms.seconds / 2);
number(ms.fadeOut, "Music fade out", 0.1, ms.seconds / 2);
assert.ok(
  Array.isArray(config.cues) && config.cues.length <= 5,
  "Maximum five synthesized editorial cues",
);
for (const cue of config.cues) {
  number(cue.at, "Tone placement", 0, SECONDS - 0.5);
  number(cue.frequency, "Tone frequency", 80, 1800);
  number(cue.seconds, "Tone duration", 0.04, 0.28);
  number(cue.peakDb, "Tone peak", -36, -22);
  assert.ok(
    typeof cue.label === "string" &&
      cue.label.length > 0 &&
      cue.label.length < 100,
  );
}
assert.ok(typeof config.outputDir === "string" && config.outputDir.trim());
const outputDir = resolve(config.outputDir);
const inputs = {
  manifest: manifestInput,
  voice,
  music,
  alignment: alignmentInput,
  sourceCaptions: captionInput,
};
for (const item of Object.values(inputs)) {
  const child = relative(outputDir, item.path);
  assert.ok(
    child === ".." || child.startsWith(`..${sep}`) || isAbsolute(child),
    "Output directory must not contain an original input",
  );
}
const plan = {
  kind: config.kind,
  outputDir,
  scenes,
  captions: captions.length,
  voiceSpeed: 1,
  seconds: SECONDS,
  sampleRate: RATE,
  channels: 2,
  cues: config.cues,
  reviews: { captions: false, listening: false, redaction: false },
  limitation:
    "ASR-derived cuts and captions require listening review; no provider evidence or human review is asserted.",
};
if (process.argv.includes("--check-only")) {
  console.log(
    JSON.stringify(
      {
        ...plan,
        inputs,
        checks:
          "paths, hashes, probes, sample-contiguous cuts, placements, captions and bounded configuration; no audio written",
      },
      null,
      2,
    ),
  );
} else {
  await mkdir(dirname(outputDir), { recursive: true });
  // Exclusive directory creation makes reruns deliberate and prevents overwriting media.
  await mkdir(outputDir, { mode: 0o700 });
  const disk = await statfs(outputDir);
  assert.ok(
    disk.bavail * disk.bsize >= 300 * MIB,
    "Need at least 300 MiB free for bounded audio assembly",
  );
  const file = (name: string) => resolve(outputDir, name);
  const rawVoice = file("voice-timeline-working.wav"),
    isolatedVoice = file("voice.wav"),
    rawMix = file("mix-working.wav"),
    master = file("mix.wav");
  const receipt: Record<string, unknown> = {
    ...plan,
    inputs,
    startedAt: new Date().toISOString(),
    status: "started",
    sourceAudioPreserved: false,
    soundDesign:
      "Local synthesized editorial tones; not recorded provider sound",
    musicSettings: ms,
  };
  try {
    receipt.sourceMeasurements = {
      voice: await measure(voice.path),
      music: await measure(music.path),
      voiceProbe,
      musicProbe,
    };
    console.log(
      "Assembling seven source-contiguous voice segments at speed 1.0.",
    );
    const splitNames = scenes.map((_, i) => `[v${i}]`).join("");
    const voiceGraph = [
      `[0:a:0]aresample=${RATE},aformat=sample_fmts=fltp:channel_layouts=mono,pan=stereo|c0=c0|c1=c0,asplit=7${splitNames}`,
      ...scenes.map(
        (s, i) =>
          `[v${i}]atrim=start_sample=${sample(s.sourceStart)}:end_sample=${sample(s.sourceEnd)},asetpts=PTS-STARTPTS,adelay=${sample(s.voiceFilmStart)}S:all=1[p${i}]`,
      ),
      `${scenes.map((_, i) => `[p${i}]`).join("")}amix=inputs=7:normalize=0:duration=longest,${exactTail}[voice]`,
    ].join(";");
    await ffmpeg([
      "-i",
      voice.path,
      "-filter_complex",
      voiceGraph,
      "-map",
      "[voice]",
      "-ar",
      String(RATE),
      "-ac",
      "2",
      "-c:a",
      "pcm_s16le",
      "-t",
      String(SECONDS),
      "-fs",
      String(80 * MIB),
      rawVoice,
    ]);
    receipt.voiceNormalization = await normalize(
      rawVoice,
      isolatedVoice,
      VO_TARGET,
    );
    console.log(
      "Mixing the quiet score and editorial cues; measuring the final mix.",
    );
    const musicGraph = `[1:a:0]atrim=start=${ms.sourceStart}:duration=${ms.seconds},asetpts=PTS-STARTPTS,aresample=${RATE},aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${ms.gainDb}dB,afade=t=in:st=0:d=${ms.fadeIn},afade=t=out:st=${ms.seconds - ms.fadeOut}:d=${ms.fadeOut},adelay=${sample(ms.start)}S:all=1,${exactTail}[bed]`;
    const graph = [
      ms.duck ? "[0:a:0]asplit=2[vo][side]" : "[0:a:0]anull[vo]",
      musicGraph,
      ms.duck
        ? "[bed][side]sidechaincompress=threshold=0.025:ratio=4:attack=15:release=300:makeup=1[score]"
        : "[bed]anull[score]",
      ...config.cues.map(
        (c, i) =>
          `sine=frequency=${c.frequency}:sample_rate=${RATE}:duration=${c.seconds},volume=${8 * Math.pow(10, c.peakDb / 20)},afade=t=in:st=0:d=0.008,afade=t=out:st=${c.seconds * 0.2}:d=${c.seconds * 0.8},pan=stereo|c0=c0|c1=c0,adelay=${sample(c.at)}S:all=1[tone${i}]`,
      ),
      `[vo][score]${config.cues.map((_, i) => `[tone${i}]`).join("")}amix=inputs=${2 + config.cues.length}:normalize=0:duration=longest,${exactTail}[mix]`,
    ].join(";");
    await ffmpeg([
      "-i",
      isolatedVoice,
      "-i",
      music.path,
      "-filter_complex",
      graph,
      "-map",
      "[mix]",
      "-ar",
      String(RATE),
      "-ac",
      "2",
      "-c:a",
      "pcm_f32le",
      "-t",
      String(SECONDS),
      "-fs",
      String(100 * MIB),
      rawMix,
    ]);
    receipt.mixNormalization = await normalize(rawMix, master, FINAL_TARGET);
    const finalLoudness = await measure(master);
    const finalProbe = await probe(master),
      voiceOutputProbe = await probe(isolatedVoice);
    for (const output of [finalProbe, voiceOutputProbe]) {
      const audio = output.streams.find((s) => s.codec_type === "audio");
      assert.ok(
        audio?.sample_rate === String(RATE) &&
          audio.channels === 2 &&
          audio.codec_name === "pcm_s16le",
      );
      assert.ok(
        Math.abs(Number(output.format.duration) - SECONDS) < 1 / RATE,
        "Output must be exactly 165 seconds",
      );
      assert.ok(
        audio.time_base === `1/${RATE}` && audio.duration_ts === SAMPLES,
        "Output must contain exactly 7,920,000 samples per channel",
      );
    }
    assert.ok(
      Math.abs(Number(finalLoudness.input_i) - FINAL_TARGET.i) <= 1,
      "Final integrated loudness outside -16 ± 1 LUFS",
    );
    assert.ok(
      Number(finalLoudness.input_tp) <= -1.5,
      "Final true peak exceeds -1.5 dBTP",
    );
    await writeFile(
      file("captions.json"),
      JSON.stringify(captions, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
    await writeFile(
      file("captions.vtt"),
      "WEBVTT\n\n" +
        captions
          .map(
            (c) =>
              `${timestamp(c.start)} --> ${timestamp(c.end)}\n${captionLines(c.text).join("\n")}\n`,
          )
          .join("\n"),
      { mode: 0o600, flag: "wx" },
    );
    await writeFile(
      file("captions.srt"),
      captions
        .map(
          (c, i) =>
            `${i + 1}\n${timestamp(c.start, ",")} --> ${timestamp(c.end, ",")}\n${captionLines(c.text).join("\n")}\n`,
        )
        .join("\n"),
      { mode: 0o600, flag: "wx" },
    );
    const outputFiles = [
      "voice.wav",
      "mix.wav",
      "captions.json",
      "captions.vtt",
      "captions.srt",
    ];
    receipt.outputs = Object.fromEntries(
      await Promise.all(
        outputFiles.map(async (name) => [
          name,
          {
            sha256: await hash(file(name)),
            bytes: (await stat(file(name))).size,
          },
        ]),
      ),
    );
    receipt.measurements = { finalLoudness, finalProbe, voiceOutputProbe };
    for (const item of Object.values(inputs))
      assert.equal(
        await hash(item.path),
        item.sha256,
        "Input changed during assembly",
      );
    receipt.sourceAudioPreserved = true;
    receipt.status = "assembled-unreviewed";
    await rm(rawVoice);
    await rm(rawMix);
    console.log(
      `165-second mix and isolated voice written to ${outputDir}. Listening/caption/redaction review remains pending.`,
    );
  } catch (error) {
    receipt.status = "failed";
    receipt.failure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    receipt.finishedAt = new Date().toISOString();
    receipt.commands = commands;
    receipt.limits = {
      maxProcessMilliseconds: MAX_CHILD_MS,
      ffmpegThreads: 1,
      maxInputBytes: MAX_INPUT,
      minimumFreeBytes: 300 * MIB,
      maxTones: 5,
      exactSamplesPerChannel: SAMPLES,
      noTempoChange: true,
      noSourceSamplesIntentionallyDropped: true,
      noExternalAudioCalls: true,
      humanReview: false,
      encodedAACNotMeasured: true,
    };
    await writeFile(
      file("receipt.json"),
      JSON.stringify(receipt, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
  }
}
