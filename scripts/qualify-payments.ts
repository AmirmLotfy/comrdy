import nextEnv from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { transaction } from "../src/server/store";
import { PayPalSandboxAdapter } from "../src/providers/paypal";
nextEnv.loadEnvConfig(process.cwd());
const ids = process.argv.slice(2);
if (ids.length !== 9)
  throw new Error(
    "Pass exactly nine release-run IDs: three per scenario. This script retrieves real Sandbox resources but creates no financial action.",
  );
assert.equal(new Set(ids).size, 9, "Run IDs must be distinct");
assert.equal(process.env.PAYPAL_ENV, "sandbox");
const api = new PayPalSandboxAdapter({
  clientId: process.env.PAYPAL_CLIENT_ID!,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
});
const runs = await transaction((db) =>
  ids.map((id) => {
    const run = db.runs[id];
    assert.ok(
      run && run.mode === "sandbox" && !run.parentId,
      "Original Sandbox run required",
    );
    return structuredClone(run);
  }),
);
const results = [];
for (const fault of ["none", "variant", "shipping"])
  assert.equal(
    runs.filter((r) => r.fault === fault).length,
    3,
    "Three runs per scenario required",
  );
for (const run of runs) {
  try {
    assert.ok(run.payment.orderId && run.payment.authorizationId);
    const order = await api.getOrder(run.payment.orderId);
    const authorization = await api.getAuthorization(
      run.payment.authorizationId,
    );
    assert.equal(order.customId, run.id);
    assert.equal(order.payeeId, process.env.PAYPAL_MERCHANT_ID);
    assert.ok(order.authorizationIds.includes(authorization.id));
    if (run.fault === "none") {
      assert.equal(run.decision.verdict, "ALLOW");
      assert.ok(run.payment.captureId);
      const capture = await api.getCapture(run.payment.captureId);
      assert.equal(capture.status, "COMPLETED");
      assert.deepEqual(capture.amount, { amountMinor: 14800, currency: "USD" });
      assert.equal(capture.finalCapture, true);
      assert.equal((run.merchantOrder as any)?.captureId, capture.id);
      assert.equal(new Set(order.captureIds).size, 1);
      results.push({
        id: run.id,
        fault: run.fault,
        passed: true,
        authorization,
        capture,
      });
    } else {
      assert.notEqual(run.decision.verdict, "ALLOW");
      assert.equal(run.payment.captureId, null);
      assert.equal(authorization.status, "VOIDED");
      assert.equal(order.captureIds.length, 0);
      assert.equal(run.merchantOrder, undefined);
      results.push({
        id: run.id,
        fault: run.fault,
        passed: true,
        authorization,
      });
    }
  } catch (error) {
    results.push({
      id: run.id,
      fault: run.fault,
      passed: false,
      error: error instanceof Error ? error.message : "Verification failed",
    });
  }
}
const report = {
  kind: "provider-retrieved-release-scenarios",
  generatedAt: new Date().toISOString(),
  passed: results.filter((r) => r.passed).length,
  total: 9,
  results,
};
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/payment-qualification.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ passed: report.passed, total: 9 }));
const state = globalThis as typeof globalThis & {
  comrdySql?: { end: () => Promise<void> };
};
await state.comrdySql?.end();
if (report.passed !== 9) process.exitCode = 1;
