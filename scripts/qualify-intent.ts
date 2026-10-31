import nextEnv from "@next/env";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { compileIntent } from "../src/providers/compiler";
import {
  qualifyIntentCandidate,
  type IntentFixture,
} from "./lib/qualification";
nextEnv.loadEnvConfig(process.cwd());
if (!process.argv.includes("--live"))
  throw new Error(
    "Explicit --live required: this calls the paid OpenAI API for 20 requests.",
  );
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY required");
if (process.env.NODE_ENV !== "production" || process.env.APP_MODE !== "sandbox")
  throw new Error(
    "Use NODE_ENV=production APP_MODE=sandbox for release qualification.",
  );
const { assertWorkerSource } = await import("../src/server/worker-source");
assertWorkerSource();
const { executionProvenance } = await import("../src/server/provenance");
const execution = executionProvenance();
if (!execution.revision || execution.dirty)
  throw new Error(
    "Qualify a clean pinned build before making paid corpus requests.",
  );
const corpus: IntentFixture[] = JSON.parse(
  await readFile("tests/fixtures/intent-corpus.json", "utf8"),
);
const results = [];
for (const item of corpus) {
  try {
    const compiled = await compileIntent(item.text, {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
    });
    results.push({
      id: item.id,
      ...qualifyIntentCandidate(item, compiled.candidate),
      ...compiled,
    });
  } catch (error) {
    results.push({
      id: item.id,
      passed: false,
      expected: item.clarification ? "clarification" : "executable",
      observed: "error",
      error: error instanceof Error ? error.message : "Compilation failed",
    });
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  kind: "live-openai-intent-corpus",
  execution,
  passed: results.filter((r) => r.passed).length,
  total: corpus.length,
  executable: {
    passed: results.filter((r) => r.expected === "executable" && r.passed)
      .length,
    total: corpus.filter((item) => !item.clarification).length,
  },
  expectedClarification: {
    passed: results.filter((r) => r.expected === "clarification" && r.passed)
      .length,
    total: corpus.filter((item) => item.clarification).length,
  },
  unexpectedClarifications: results.filter(
    (r) => r.expected === "executable" && r.observed === "clarification",
  ).length,
  evidenceLimit:
    "Automated required-constraint checks and clarification presence only. Review every output for unsupported additions and relevant clarification; this is not payment or browser qualification.",
  results,
};
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/intent-qualification.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    passed: report.passed,
    total: report.total,
    executable: report.executable,
    expectedClarification: report.expectedClarification,
    unexpectedClarifications: report.unexpectedClarifications,
    report: "artifacts/intent-qualification.json",
  }),
);
if (report.passed !== report.total) process.exitCode = 1;
