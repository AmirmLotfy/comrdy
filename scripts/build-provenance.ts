import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sourceDigest } from "./lib/source-digest";

type GitState = { revision: string; dirty: boolean } | null;

/** A claimed clean upload must match its bytes, even when Git is available. */
export function resolveBuildProvenance(
  digest: string,
  git: GitState,
  env: NodeJS.ProcessEnv,
) {
  const declaredRevision = env.COMRDY_SOURCE_REVISION;
  const declaredDigest = env.COMRDY_SOURCE_DIGEST;
  if (declaredRevision !== undefined || declaredDigest !== undefined) {
    if (
      !/^[a-f0-9]{40}$/.test(declaredRevision ?? "") ||
      !/^[a-f0-9]{64}$/.test(declaredDigest ?? "")
    )
      throw new Error(
        "Release provenance requires a valid revision and source digest together.",
      );
    if (declaredDigest !== digest)
      throw new Error(
        "Release provenance source digest does not match the build inputs.",
      );
    if (git && (git.dirty || git.revision !== declaredRevision))
      throw new Error(
        "Release provenance does not match the clean Git checkout.",
      );
    return { revision: declaredRevision!, dirty: false };
  }
  if (env.VERCEL === "1" && (!git || git.dirty))
    throw new Error("Vercel build requires verified clean source provenance.");
  return git ?? { revision: null, dirty: true };
}

function main() {
  const digest = sourceDigest();
  let git: GitState = null;
  try {
    const revision = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const dirty = !!execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=normal"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    git = { revision, dirty };
  } catch {
    // CLI uploads do not include .git; validate the clean local preflight claim.
  }
  // Only public metadata, never arbitrary environment values or file contents.
  console.log(
    "COMRDY provenance inputs",
    JSON.stringify({
      actualSourceDigest: digest,
      declaredSourceDigest: /^[a-f0-9]{64}$/.test(
        process.env.COMRDY_SOURCE_DIGEST ?? "",
      )
        ? process.env.COMRDY_SOURCE_DIGEST
        : null,
      declaredRevision: /^[a-f0-9]{40}$/.test(
        process.env.COMRDY_SOURCE_REVISION ?? "",
      )
        ? process.env.COMRDY_SOURCE_REVISION
        : null,
      gitAvailable: git !== null,
    }),
  );
  const value = {
    ...resolveBuildProvenance(digest, git, process.env),
    builtAt: new Date().toISOString(),
    sourceDigest: digest,
  };
  writeFileSync(".build-provenance.json", JSON.stringify(value));
  console.log("COMRDY verified build provenance", JSON.stringify(value));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
