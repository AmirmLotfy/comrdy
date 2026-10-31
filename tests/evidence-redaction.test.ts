import test from "node:test";
import assert from "node:assert/strict";
import { publicRun, type StoredRun } from "../src/server/store";
import { createCanonicalContract } from "../src/core/fixtures";
test("terminal evidence never retains the buyer approval link or unexpected payment fields", () => {
  const run: StoredRun = {
    id: "test",
    owner: "private-owner",
    mode: "sandbox",
    fault: "none",
    status: "awaiting_approval",
    contract: createCanonicalContract(),
    snapshots: [],
    events: [],
    decision: { verdict: "REVIEW", reason: "Waiting" },
    payment: {
      authorizationId: null,
      captureId: null,
      status: "CREATED",
      orderId: "ORDER123",
      approvalUrl:
        "https://www.sandbox.paypal.com/checkoutnow?token=private-approval",
    },
    operations: {},
    createdAt: new Date().toISOString(),
  };
  Object.assign(run.payment, { buyerEmail: "private-buyer@example.invalid" });
  assert.equal(
    publicRun(run).payment.approvalUrl,
    run.payment.approvalUrl,
    "Owned active flow still receives its approval destination",
  );
  for (const state of [
    "completed",
    "blocked",
    "reconciling",
    "inconclusive",
    "canceled",
  ]) {
    run.status = state;
    const result = publicRun(run);
    assert.equal(result.payment.orderId, "ORDER123");
    assert.doesNotMatch(
      JSON.stringify(result),
      /private-approval|approvalUrl|private-owner|private-buyer|buyerEmail/,
    );
  }
});
