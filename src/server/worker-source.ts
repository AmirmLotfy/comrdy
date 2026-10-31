import { execFileSync } from "node:child_process";
import { executionProvenance } from "./provenance";
import { sourceDigest } from "../../scripts/lib/source-digest";

/** The worker executes TypeScript source, so a production receipt alone is insufficient. */
export function assertWorkerSource() {
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.APP_MODE !== "sandbox"
  )
    return;
  const execution = executionProvenance();
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const changed = execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=normal"],
    { encoding: "utf8" },
  ).trim();
  if (
    !execution.revision ||
    execution.dirty ||
    changed ||
    revision !== execution.revision ||
    sourceDigest() !== execution.sourceDigest
  )
    throw new Error(
      "Production worker source does not match a clean build receipt. Commit and rebuild before Sandbox execution.",
    );
}
