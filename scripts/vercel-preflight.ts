import nextEnv from "@next/env";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { sourceDigest } from "./lib/source-digest";
nextEnv.loadEnvConfig(process.cwd());
const revision = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const dirty = !!execFileSync(
  "git",
  ["status", "--porcelain", "--untracked-files=normal"],
  { encoding: "utf8" },
).trim();
let project: {
  projectId?: string;
  orgId?: string;
  projectName?: string;
} | null = null;
try {
  project = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
} catch {}
const missing = ["DATABASE_URL", "APP_URL"].filter((key) => !process.env[key]);
const origin = process.env.APP_URL;
if (origin && !origin.startsWith("https://"))
  missing.push("APP_URL must be the canonical HTTPS origin");
if (process.env.APP_MODE === "sandbox") {
  for (const key of [
    "OPENAI_API_KEY",
    "PAYPAL_CLIENT_ID",
    "PAYPAL_CLIENT_SECRET",
    "PAYPAL_MERCHANT_ID",
    "PAYPAL_WEBHOOK_ID",
    "KERNEL_API_KEY",
    "RUN_ACCESS_CODE",
  ])
    if (!process.env[key]) missing.push(key);
  if (process.env.PAYPAL_ENV !== "sandbox") missing.push("PAYPAL_ENV=sandbox");
}
const digest = sourceDigest();
const ready =
  !dirty &&
  !!project?.projectId &&
  project.projectName === "comrdy" &&
  !missing.length;
const report = {
  checkedAt: new Date().toISOString(),
  revision,
  sourceDigest: digest,
  dirty,
  project: project
    ? {
        projectId: project.projectId,
        orgId: project.orgId,
        projectName: project.projectName,
      }
    : null,
  localConfigurationMissing: missing,
  ready,
  limits:
    "Checks local metadata/configuration presence only; Vercel environment values, worker availability, database connectivity, provider behavior and hosted acceptance remain separate checks.",
  next: ready
    ? [
        "Verify the linked project and environment with the Vercel CLI.",
        "Verify companion worker and database use the same clean release commit.",
        "Deploy a staged production build, smoke-test it, then promote.",
      ]
    : [
        "Commit the final source, link the COMRDY project, and configure the documented private environment before deployment.",
      ],
};
mkdirSync("artifacts", { recursive: true });
writeFileSync(
  "artifacts/vercel-preflight.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (ready)
  console.log(
    `vercel deploy --prod --skip-domain --scope mellardoos-projects --build-env COMRDY_SOURCE_REVISION=${revision} --build-env COMRDY_SOURCE_DIGEST=${digest}`,
  );
if (!ready) process.exitCode = 1;
