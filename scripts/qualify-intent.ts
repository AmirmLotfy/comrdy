import nextEnv from "@next/env";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { compileIntent } from "../src/providers/compiler";
nextEnv.loadEnvConfig(process.cwd());
if (!process.argv.includes("--live"))
  throw new Error(
    "Explicit --live required: this calls the paid OpenAI API for 20 requests.",
  );
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY required");
const corpus = JSON.parse(
  await readFile("tests/fixtures/intent-corpus.json", "utf8"),
);
const results = [];
for (const item of corpus) {
  try {
    const compiled = await compileIntent(item.text, {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
    });
    const candidate = compiled.candidate;
    const has = (path: string, value: unknown, op?: string) =>
      candidate.constraints.some(
        (c) =>
          c.hard &&
          c.path === path &&
          (!op || c.op === op) &&
          JSON.stringify(c.value) === JSON.stringify(value),
      );
    let passed = !!candidate.needsResolution.length;
    if (item.clarification) passed = candidate.needsResolution.length > 0;
    else if (!passed) {
      const e = item.expect;
      passed =
        has("variant.attributes.size", e.size) &&
        has(
          "pricing.total",
          { amountMinor: e.cap, currency: "USD" },
          "money_lte",
        ) &&
        has("subscription.enabled", false) &&
        has("policy.substitutionOccurred", false) &&
        has("quantity", 1);
    }
    results.push({ id: item.id, passed, ...compiled });
  } catch (error) {
    results.push({
      id: item.id,
      passed: false,
      error: error instanceof Error ? error.message : "Compilation failed",
    });
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  kind: "live-openai-intent-corpus",
  passed: results.filter((r) => r.passed).length,
  total: corpus.length,
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
    report: "artifacts/intent-qualification.json",
  }),
);
if (report.passed !== report.total) process.exitCode = 1;
