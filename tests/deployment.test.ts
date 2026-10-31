import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sourceDigest } from "../scripts/lib/source-digest";
import { transaction } from "../src/server/store";

test("deployment checksum detects source changes without incorporating secrets or run evidence", () => {
  const root = mkdtempSync(join(tmpdir(), "comrdy-release-test-"));
  try {
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src/example.ts"), "export const revision = 1;");
    const before = sourceDigest(root);
    writeFileSync(join(root, ".env.local"), "TEST_VALUE=private-placeholder");
    mkdirSync(join(root, "artifacts"));
    writeFileSync(join(root, "artifacts/local.json"), "{}");
    assert.equal(sourceDigest(root), before);
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
