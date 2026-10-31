import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { sourceDigest } from "./lib/source-digest";
const digest = sourceDigest();
let revision: string | null = null;
let dirty = true;
try {
  revision = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  dirty = !!execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=normal"],
    { encoding: "utf8" },
  ).trim();
} catch {
  // CLI uploads do not include .git. A clean local preflight passes the exact
  // revision and digest as non-secret build metadata; verify uploaded bytes.
  if (
    /^[a-f0-9]{40}$/.test(process.env.COMRDY_SOURCE_REVISION ?? "") &&
    process.env.COMRDY_SOURCE_DIGEST === digest
  ) {
    revision = process.env.COMRDY_SOURCE_REVISION!;
    dirty = false;
  }
}
writeFileSync(
  ".build-provenance.json",
  JSON.stringify({
    revision,
    dirty,
    builtAt: new Date().toISOString(),
    sourceDigest: digest,
  }),
);
