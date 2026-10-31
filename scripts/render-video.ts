import { readFile, access } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { spawnSync } from "node:child_process";
const filename = process.argv[2];
if (!filename)
  throw new Error("Usage: npm run video:render -- qualified-manifest.json");
const manifest = JSON.parse(await readFile(filename, "utf8"));
if (
  manifest.qualified !== true ||
  !manifest.release ||
  !manifest.providerRunIds?.length ||
  !manifest.narration ||
  manifest.clips?.length !== 7
)
  throw new Error(
    "Qualified release evidence and seven actual clips required.",
  );
let end = 0;
for (const clip of manifest.clips) {
  if (clip.start !== end || clip.seconds <= 0 || !clip.caption)
    throw new Error("Clips must form a continuous, captioned sequence");
  end += clip.seconds;
}
if (end !== 165) throw new Error("Film must be 165 seconds");
for (const asset of [
  ...manifest.clips.map((c: { file: string }) => c.file),
  manifest.narration,
]) {
  const path = resolve("public", asset);
  if (relative(resolve("public"), path).startsWith(".."))
    throw new Error("Asset path escapes public directory");
  await access(path);
}
const result = spawnSync(
  "npx",
  [
    "remotion",
    "render",
    "video/index.tsx",
    "COMRDY",
    "artifacts/comrdy-submission.mp4",
    "--props",
    resolve(filename),
    "--codec",
    "h264",
  ],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
