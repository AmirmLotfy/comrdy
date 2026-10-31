import nextEnv from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { transaction } from "../src/server/store";
import { PayPalSandboxAdapter } from "../src/providers/paypal";
import { assertQualifiedCapture } from "./lib/qualification";
import { verifyContractHash } from "../src/core/invariants";
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
const executions = runs.map((run) => {
  const execution = run.execution as
    | { revision: string | null; dirty: boolean; builtAt: string | null }
    | undefined;
  assert.ok(
    execution &&
      typeof execution.revision === "string" &&
      /^[a-f0-9]{40}$/.test(execution.revision),
    "Run must record its execution commit",
  );
  assert.equal(
    execution.dirty,
    false,
    "Release runs must execute a clean build",
  );
  const workers = run.workerExecutions as (typeof execution)[] | undefined;
  assert.ok(workers?.length, "Worker execution provenance is required");
  assert.ok(
    workers.every(
      (worker) =>
        worker.revision === execution.revision && worker.dirty === false,
    ),
    "Every worker must execute the same clean revision as the run",
  );
  return execution;
});
assert.equal(
  new Set(executions.map((execution) => execution.revision)).size,
  1,
  "All release runs must execute the same commit",
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
    assert.deepEqual(order.amount, { amountMinor: 14800, currency: "USD" });
    assert.deepEqual(authorization.amount, {
      amountMinor: 14800,
      currency: "USD",
    });
    if (authorization.orderId) assert.equal(authorization.orderId, order.id);
    if (authorization.payeeId)
      assert.equal(authorization.payeeId, order.payeeId);
    assert.ok(order.authorizationIds.includes(authorization.id));
    assert.ok(verifyContractHash(run.contract));
    if (run.fault === "none") {
      assert.equal(run.decision.verdict, "ALLOW");
      assert.ok(run.payment.captureId);
      const capture = await api.getCapture(run.payment.captureId);
      assertQualifiedCapture({
        order,
        authorization,
        capture,
        caseId: run.id,
        payeeId: process.env.PAYPAL_MERCHANT_ID!,
      });
      assert.equal((run.merchantOrder as any)?.captureId, capture.id);
      assert.equal((run.merchantOrder as any)?.caseId, run.id);
      assert.equal((run.merchantOrder as any)?.size, "M");
      assert.deepEqual((run.merchantOrder as any)?.amount, capture.amount);
      results.push({
        id: run.id,
        fault: run.fault,
        passed: true,
        order: { ...order, approvalUrl: null },
        contractHash: run.contract.hash,
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
        order: { ...order, approvalUrl: null },
        contractHash: run.contract.hash,
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
  execution: executions[0],
  selection:
    "Nine operator-selected original runs from one recorded clean revision; consecutive execution requires a separate release receipt.",
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
