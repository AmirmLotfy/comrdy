import nextEnv from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { transaction, publicRun } from "../src/server/store";
import { sha256 } from "../src/core/hash";
nextEnv.loadEnvConfig(process.cwd());
const ids = process.argv.slice(2);
if (!ids.length)
  throw new Error("Pass reviewed run IDs to export as public evidence.");
const runs = await transaction((db) =>
  ids.map((id) => {
    const run = db.runs[id];
    if (
      !run ||
      run.mode !== "sandbox" ||
      !["completed", "blocked"].includes(run.status)
    )
      throw new Error("Only terminal, reviewed Sandbox runs may be exported.");
    if (!run.payment.authorizationId)
      throw new Error("Actual authorization evidence required.");
    return publicRun(run);
  }),
);
let revision = "uncommitted";
try {
  revision = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
} catch {}
const payload = { exportedAt: new Date().toISOString(), revision, runs };
await mkdir("public/release", { recursive: true });
await writeFile(
  "public/release/evidence.json",
  JSON.stringify({ ...payload, hash: sha256(payload) }, null, 2),
);
console.log(
  `Exported ${runs.length} reviewed Sandbox runs to public/release/evidence.json. Inspect before publishing.`,
);
process.exit(0);
