import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sourceDigest, sourceManifest } from "../scripts/lib/source-digest";
import { transaction } from "../src/server/store";
import nextConfig from "../next.config";

test("deployment checksum detects source changes without incorporating secrets or run evidence", () => {
  const root = mkdtempSync(join(tmpdir(), "comrdy-release-test-"));
  try {
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src/example.ts"), "export const revision = 1;");
    const before = sourceDigest(root);
    const manifest = sourceManifest(root);
    assert.equal(manifest.digest, before);
    assert.deepEqual(
      manifest.files.map((file) => file.path),
      ["src/example.ts"],
    );
    assert.equal(
      manifest.files[0].bytes,
      Buffer.byteLength("export const revision = 1;"),
    );
    assert.match(manifest.files[0].sha256, /^[a-f0-9]{64}$/);
    writeFileSync(join(root, ".env.local"), "TEST_VALUE=private-placeholder");
    mkdirSync(join(root, "artifacts"));
    writeFileSync(join(root, "artifacts/local.json"), "{}");
    assert.equal(sourceDigest(root), before);
    assert.deepEqual(sourceManifest(root), manifest);
    writeFileSync(join(root, "src/example.ts"), "export const revision = 2;");
    assert.notEqual(sourceDigest(root), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Vercel cannot silently fall back to ephemeral file-backed simulation", async () => {
  const previous = {
    VERCEL: process.env.VERCEL,
    DATABASE_URL: process.env.DATABASE_URL,
    APP_MODE: process.env.APP_MODE,
  };
  try {
    process.env.VERCEL = "1";
    process.env.APP_MODE = "simulation";
    delete process.env.DATABASE_URL;
    await assert.rejects(
      transaction(() => true),
      /PostgreSQL durability/,
    );
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

// These checks qualify the provenance gate only; no deployment/provider calls.
import { resolveBuildProvenance } from "../scripts/build-provenance";

const revision = "a".repeat(40);
const digest = "b".repeat(64);
const declared = {
  VERCEL: "1",
  COMRDY_SOURCE_REVISION: revision,
  COMRDY_SOURCE_DIGEST: digest,
};

test("clean CLI upload requires matching revision metadata and source bytes", () => {
  assert.deepEqual(resolveBuildProvenance(digest, null, declared), {
    revision,
    dirty: false,
  });
  assert.throws(
    () => resolveBuildProvenance("c".repeat(64), null, declared),
    /digest does not match/,
  );
  assert.throws(
    () => resolveBuildProvenance(digest, null, { VERCEL: "1" }),
    /requires verified/,
  );
  assert.throws(
    () =>
      resolveBuildProvenance(digest, null, {
        COMRDY_SOURCE_REVISION: revision,
      }),
    /together/,
  );
  assert.throws(
    () =>
      resolveBuildProvenance(digest, null, {
        ...declared,
        COMRDY_SOURCE_REVISION: "invalid",
      }),
    /together/,
  );
});

test("declared provenance cannot override dirty or different Git source", () => {
  assert.throws(
    () => resolveBuildProvenance(digest, { revision, dirty: true }, declared),
    /clean Git checkout/,
  );
  assert.throws(
    () =>
      resolveBuildProvenance(
        digest,
        { revision: "c".repeat(40), dirty: false },
        declared,
      ),
    /clean Git checkout/,
  );
  assert.deepEqual(
    resolveBuildProvenance(digest, { revision, dirty: false }, {}),
    { revision, dirty: false },
  );
  assert.deepEqual(
    resolveBuildProvenance(digest, { revision, dirty: true }, {}),
    { revision, dirty: true },
  );
});

test("Next config reads the current receipt at build phase and rejects unknown provenance", () => {
  const root = mkdtempSync(join(tmpdir(), "comrdy-config-test-"));
  const previousDirectory = process.cwd();
  try {
    process.chdir(root);
    assert.throws(
      () => nextConfig("phase-production-build"),
      /requires valid build provenance/,
    );
    const receipt = {
      revision,
      dirty: false,
      builtAt: "2026-11-01T00:00:00.000Z",
      sourceDigest: digest,
    };
    writeFileSync(".build-provenance.json", JSON.stringify(receipt));
    assert.equal(
      nextConfig("phase-production-build").env?.COMRDY_BUILD_PROVENANCE,
      JSON.stringify(receipt),
    );
    writeFileSync(
      ".build-provenance.json",
      JSON.stringify({ revision: null, dirty: true, builtAt: null }),
    );
    assert.throws(
      () => nextConfig("phase-production-build"),
      /requires valid build provenance/,
    );
  } finally {
    process.chdir(previousDirectory);
    rmSync(root, { recursive: true, force: true });
  }
});
