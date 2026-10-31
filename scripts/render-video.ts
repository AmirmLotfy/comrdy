import { readFile, realpath, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sha256 } from "../src/core/hash";
import { assertQualifiedCapture } from "./lib/qualification";
import {
  validateFilmManifest,
  validateCaptionFile,
  type FilmManifest,
} from "./lib/film-manifest";
const filename = process.argv[2];
if (!filename)
  throw new Error(
    "Usage: npm run video:render -- manifest.json [--check-only]",
  );
const m: FilmManifest = JSON.parse(await readFile(filename, "utf8"));
validateFilmManifest(m);
const root = await realpath("public");
const assets: Record<string, unknown> = {};
async function asset(file: string) {
  assert.ok(!isAbsolute(file), "Use public-relative assets");
  const path = await realpath(resolve(root, file));
  const rel = relative(root, path);
  assert.ok(
    rel && !rel.startsWith("..") && !isAbsolute(rel),
    "Asset escapes public directory",
  );
  return path;
}
function probe(path: string) {
  const result = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_format", "-show_streams", "-of", "json", path],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, "Media must be readable by ffprobe");
  return JSON.parse(result.stdout);
}
for (const clip of m.clips) {
  const path = await asset(clip.file),
    meta = probe(path);
  const stream = meta.streams.find((s: any) => s.codec_type === "video");
  assert.ok(
    stream && stream.width >= 1280 && stream.height >= 720,
    "Footage must be at least 720p",
  );
  assert.ok(
    Number(meta.format.duration) >= clip.seconds - 0.05,
    `Clip too short: ${clip.file}`,
  );
  assets[clip.file] = {
    sha256: createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
    duration: Number(meta.format.duration),
    width: stream.width,
    height: stream.height,
  };
}
const audio = probe(await asset(m.narration));
assert.ok(audio.streams.some((s: any) => s.codec_type === "audio"));
assert.ok(
  Math.abs(Number(audio.format.duration) - 165) < 0.1,
  "Narration must be assembled to 165 seconds",
);
const captions = await readFile(await asset(m.captionFile), "utf8");
validateCaptionFile(captions, m.captions);
for (const file of [m.narration, m.captionFile]) {
  assets[file] = {
    sha256: createHash("sha256")
      .update(await readFile(await asset(file)))
      .digest("hex"),
  };
}
for (const shot of m.screenshots) {
  const path = await asset(shot.file),
    meta = probe(path);
  assert.ok(
    meta.streams[0]?.width >= 1280,
    "Release screenshots need readable desktop resolution",
  );
  assets[shot.file] = {
    sha256: createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
    reviewed: shot.reviewed,
  };
}
if (m.mode === "release") {
  const library = JSON.parse(
    await readFile("public/release/evidence.json", "utf8"),
  );
  const { hash, ...payload } = library;
  assert.equal(
    hash,
    sha256(payload),
    "Evidence export consistency hash mismatch",
  );
  assert.equal(
    library.executionRevision,
    m.release,
    "Footage and evidence release mismatch",
  );
  for (const id of m.providerRunIds) {
    const run = library.runs.find((r: any) => r.id === id);
    assert.ok(
      run &&
        run.mode === "sandbox" &&
        ["completed", "blocked"].includes(run.status),
    );
    assert.ok(
      run.execution?.revision === m.release && run.execution.dirty === false,
    );
    assert.ok(
      run.workerExecutions?.length &&
        run.workerExecutions.every(
          (w: any) => w.revision === m.release && w.dirty === false,
        ),
    );
    assert.equal(
      run.payment.approvalUrl,
      undefined,
      "Public evidence must omit approval links",
    );
    assert.ok(
      run.payment.authorizationId &&
        ["COMPLETED", "VOIDED"].includes(run.payment.status),
    );
  }
  const recovery = library.runs.find(
    (r: any) =>
      m.providerRunIds.includes(r.id) &&
      r.parentId &&
      r.payment.status === "COMPLETED" &&
      r.decision.verdict === "ALLOW",
  );
  assert.ok(
    recovery,
    "Film requires a completed bounded recovery in the reviewed evidence",
  );
  const original = library.runs.find(
    (r: any) => r.id === recovery.parentId && m.providerRunIds.includes(r.id),
  );
  assert.ok(
    original &&
      original.fault === "variant" &&
      original.payment.status === "VOIDED" &&
      original.decision.verdict === "DENY",
  );
  assert.equal(
    recovery.contract.hash,
    original.contract.hash,
    "Recovery must preserve the original confirmed contract",
  );
  assert.notEqual(recovery.payment.orderId, original.payment.orderId);
  assert.notEqual(
    recovery.payment.authorizationId,
    original.payment.authorizationId,
  );
  assert.equal(recovery.merchantOrder?.captureId, recovery.payment.captureId);
  assert.equal(recovery.merchantOrder?.size, "M");
  const control = JSON.parse(
    await readFile("public/release/control.json", "utf8"),
  );
  const { hash: controlHash, ...controlPayload } = control;
  assert.equal(
    controlHash,
    sha256(controlPayload),
    "Control receipt consistency mismatch",
  );
  assert.ok(
    control.kind === "reviewed-ungated-control-receipt" &&
      control.status === "control_completed" &&
      control.environment === "sandbox",
  );
  assert.ok(
    control.executionRevision === m.release &&
      control.execution.dirty === false,
  );
  assertQualifiedCapture({
    ...control.provider,
    caseId: control.id,
    payeeId: control.provider.order.payeeId,
  });
  assert.equal(control.merchantOrder.captureId, control.provider.capture.id);
  assert.equal(control.merchantOrder.item.size, "S");
  assert.equal(control.originalCheckout.item.size, "M");
  assert.equal(control.mutation.gateApplied, false);
  assert.equal(control.counterfactual.decision, "DENY");
  const payment = JSON.parse(
    await readFile("artifacts/payment-qualification.json", "utf8"),
  );
  assert.ok(
    payment.passed === 9 &&
      payment.total === 9 &&
      payment.execution.revision === m.release &&
      payment.consecutive === true,
    "Nine consecutive qualified payments on this release required",
  );
  const intent = JSON.parse(
    await readFile("artifacts/intent-qualification.json", "utf8"),
  );
  assert.ok(
    intent.kind === "live-openai-intent-corpus" &&
      intent.passed === 20 &&
      intent.total === 20 &&
      intent.execution?.revision === m.release &&
      intent.execution.dirty === false,
    "Live 20-request corpus required",
  );
}
await mkdir("artifacts", { recursive: true });
const stem =
  m.mode === "release" ? "comrdy-submission" : "comrdy-local-rehearsal";
await writeFile(
  `artifacts/${stem}-validation.json`,
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      mode: m.mode,
      release: m.release,
      assets,
      limitation:
        "Consistency and media checks; human reviews and provider retrieval receipts remain separate evidence.",
    },
    null,
    2,
  ),
);
if (!process.argv.includes("--check-only")) {
  const result = spawnSync(
    "npx",
    [
      "remotion",
      "render",
      "video/index.tsx",
      "COMRDY",
      `artifacts/${stem}.mp4`,
      "--props",
      resolve(filename),
      "--codec",
      "h264",
      "--concurrency",
      "2",
    ],
    { stdio: "inherit" },
  );
  assert.equal(result.status, 0, "Render failed");
  const master = probe(`artifacts/${stem}.mp4`);
  assert.ok(
    master.streams.some((s: any) => s.codec_type === "audio"),
    "Master requires narration audio",
  );
  const stream = master.streams.find((s: any) => s.codec_type === "video");
  assert.ok(
    stream.width === 1920 &&
      stream.height === 1080 &&
      stream.codec_name === "h264" &&
      Math.abs(Number(master.format.duration) - 165) < 0.1,
    "Master failed delivery specifications",
  );
}
console.log(`${m.mode}: media validation complete; no publication performed.`);
