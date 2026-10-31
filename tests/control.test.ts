import test from "node:test";
import assert from "node:assert/strict";
import {
  approveControl,
  claimControlCommand,
  controlCreatePayload,
  createControlRecord,
  exportControlReceipt,
  assertCleanControlExecution,
  mutateControlCheckout,
  observeControlAuthorization,
  observeControlOrder,
  recordControlCommand,
  settleControl,
  validateControlRecord,
  type ControlRecord,
} from "../src/core/control";
import { readPath } from "../src/core/invariants";
import { sha256, stableRequestId } from "../src/core/hash";
import type {
  PayPalAuthorization,
  PayPalCapture,
  PayPalOrder,
} from "../src/providers/paypal";

const now = "2026-11-01T12:00:00Z";
const later = "2026-11-01T12:01:00Z";
const order = (overrides: Partial<PayPalOrder> = {}): PayPalOrder => ({
  id: "ORDER123",
  status: "APPROVED",
  intent: "AUTHORIZE",
  amount: { amountMinor: 14800, currency: "USD" },
  payeeId: "MERCHANT123",
  customId: "control-1",
  referenceId: "1",
  authorizationIds: [],
  captureIds: [],
  approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER123",
  ...overrides,
});
const authorization = (
  overrides: Partial<PayPalAuthorization> = {},
): PayPalAuthorization => ({
  id: "AUTH123",
  status: "CREATED",
  amount: { amountMinor: 14800, currency: "USD" },
  orderId: "ORDER123",
  payeeId: "MERCHANT123",
  expiresAt: "2026-11-02T12:00:00Z",
  ...overrides,
});
const capture = (overrides: Partial<PayPalCapture> = {}): PayPalCapture => ({
  id: "CAPTURE123",
  status: "COMPLETED",
  amount: { amountMinor: 14800, currency: "USD" },
  orderId: "ORDER123",
  authorizationId: "AUTH123",
  finalCapture: true,
  ...overrides,
});
const capturedOrder = () =>
  order({
    status: "COMPLETED",
    authorizationIds: ["AUTH123"],
    captureIds: ["CAPTURE123"],
  });
function approved(): ControlRecord {
  let record = createControlRecord("control-1", "MERCHANT123", now);
  record = claimControlCommand(
    record,
    "create",
    controlCreatePayload(record, "http://localhost:3000"),
    now,
  );
  record = recordControlCommand(record, "create", order(), "completed");
  record = observeControlOrder(record, order());
  return approveControl(record, order(), now);
}
function mutated(): ControlRecord {
  let record = approved();
  record = claimControlCommand(
    record,
    "authorize",
    { orderId: "ORDER123" },
    now,
  );
  record = recordControlCommand(
    record,
    "authorize",
    order({ authorizationIds: ["AUTH123"] }),
    "completed",
  );
  record = observeControlAuthorization(
    record,
    order({ authorizationIds: ["AUTH123"] }),
    authorization(),
  );
  return mutateControlCheckout(record, later);
}
function dispatched(): ControlRecord {
  const record = mutated();
  return claimControlCommand(
    record,
    "capture",
    {
      authorizationId: "AUTH123",
      amount: { amountMinor: 14800, currency: "USD" },
    },
    later,
  );
}

test("isolated control creates one wrong-size merchant order only after exact completed capture readback", () => {
  let record = dispatched();
  assert.equal(record.merchantOrder, undefined);
  assert.equal(
    readPath(record.originalCheckout.state, "variant.attributes.size"),
    "M",
  );
  assert.equal(readPath(record.checkout.state, "variant.attributes.size"), "S");
  assert.equal(record.counterfactual?.decision, "DENY");
  const originalHash = record.contract.hash;
  record = recordControlCommand(record, "capture", capture(), "completed");
  record = settleControl(
    record,
    capturedOrder(),
    authorization({ status: "CAPTURED" }),
    capture(),
    later,
  );
  assert.equal(record.status, "control_completed");
  assert.equal(record.contract.hash, originalHash);
  assert.equal(record.merchantOrder?.item.size, "S");
  assert.equal(record.merchantOrder?.captureId, "CAPTURE123");
  assert.equal(record.merchantOrder?.checkoutHash, record.checkout.hash);
  assert.equal(record.merchantOrder?.contractHash, originalHash);
  assert.equal(record.merchantOrder?.providerOrderId, "ORDER123");
  const repeated = settleControl(
    record,
    capturedOrder(),
    authorization({ status: "CAPTURED" }),
    capture(),
    "2026-11-01T12:02:00Z",
  );
  assert.deepEqual(repeated.merchantOrder, record.merchantOrder);
  assert.throws(
    () =>
      claimControlCommand(
        record,
        "capture",
        record.commands.capture!.payload,
        later,
      ),
    /already dispatched/,
  );
});

test("unapproved and mismatched provider orders cannot authorize the control", () => {
  const record = createControlRecord("control-1", "MERCHANT123", now);
  for (const observed of [
    order({ status: "CREATED" }),
    order({ payeeId: "OTHER" }),
    order({ customId: "other-case" }),
    order({ amount: { amountMinor: 100, currency: "USD" } }),
  ]) {
    assert.throws(() => approveControl(record, observed, now));
  }
  assert.throws(() =>
    claimControlCommand(record, "authorize", { orderId: "ORDER123" }, now),
  );
  assert.throws(() => mutateControlCheckout(record, now));
  assert.throws(
    () => approveControl(mutated(), order(), now),
    /Previously dispatched/,
  );
});

test("uncertain capture retains its persisted identity and readback can settle without another dispatch", () => {
  let record = dispatched();
  const command = record.commands.capture!;
  assert.equal(command.state, "sent");
  assert.equal(
    command.requestId,
    stableRequestId("capture", "control-1-capture"),
  );
  // Represents storage round trip after dispatch, before a provider response arrives.
  record = JSON.parse(JSON.stringify(record)) as ControlRecord;
  validateControlRecord(record);
  record = recordControlCommand(record, "capture", null, "unknown");
  assert.equal(record.status, "needs_reconciliation");
  assert.equal(record.merchantOrder, undefined);
  assert.throws(
    () => claimControlCommand(record, "capture", command.payload, later),
    /already dispatched/,
  );
  const settled = settleControl(
    record,
    capturedOrder(),
    authorization({ status: "CAPTURED" }),
    capture(),
    later,
  );
  assert.equal(settled.status, "control_completed");
  assert.equal(settled.commands.capture!.requestId, command.requestId);
  assert.equal(settled.commands.capture!.state, "unknown");
});

test("pending, declined, wrong amount, nonfinal and foreign captures never create a merchant order", () => {
  const record = dispatched();
  for (const status of ["PENDING", "DECLINED", "FAILED"] as const) {
    const pending = settleControl(
      record,
      capturedOrder(),
      authorization(),
      capture({ status }),
      later,
    );
    assert.equal(pending.status, "needs_reconciliation");
    assert.equal(pending.merchantOrder, undefined);
  }
  for (const observed of [
    capture({ amount: { amountMinor: 14700, currency: "USD" } }),
    capture({ finalCapture: false }),
    capture({ orderId: "OTHER" }),
    capture({ authorizationId: "OTHER" }),
  ]) {
    assert.throws(() =>
      settleControl(
        record,
        capturedOrder(),
        authorization({ status: "CAPTURED" }),
        observed,
        later,
      ),
    );
  }
  assert.throws(() =>
    settleControl(
      record,
      order({ authorizationIds: ["AUTH123"], captureIds: ["OTHER"] }),
      authorization({ status: "CAPTURED" }),
      capture(),
      later,
    ),
  );
  assert.throws(() =>
    settleControl(record, capturedOrder(), authorization(), capture(), later),
  );
  assert.equal(record.merchantOrder, undefined);
});

test("capture cannot precede mutation, change amount or substitute a second completed resource", () => {
  const record = mutated();
  assert.throws(() =>
    claimControlCommand(
      record,
      "capture",
      {
        authorizationId: "AUTH123",
        amount: { amountMinor: 14900, currency: "USD" },
      },
      later,
    ),
  );
  const noMutation = structuredClone(record);
  delete noMutation.mutation;
  assert.throws(() =>
    claimControlCommand(
      noMutation,
      "capture",
      {
        authorizationId: "AUTH123",
        amount: { amountMinor: 14800, currency: "USD" },
      },
      later,
    ),
  );
  const completed = recordControlCommand(
    dispatched(),
    "capture",
    capture(),
    "completed",
  );
  assert.throws(() =>
    settleControl(
      completed,
      order({ authorizationIds: ["AUTH123"], captureIds: ["OTHER"] }),
      authorization({ status: "CAPTURED" }),
      capture({ id: "OTHER" }),
      later,
    ),
  );
});

test("legacy evidence and modified checkout/command identities fail closed", () => {
  assert.throws(
    () =>
      validateControlRecord({
        kind: "operator-only-fixture-mutation-sandbox-payment-control",
      }),
    /Legacy/,
  );
  const changedCheckout = structuredClone(dispatched());
  changedCheckout.checkout.revision = "3";
  assert.throws(() => validateControlRecord(changedCheckout), /integrity/);
  const changedCommand = structuredClone(dispatched());
  changedCommand.commands.capture!.actionId = "new-purchase";
  assert.throws(() => validateControlRecord(changedCommand));
});

// Synthetic build metadata for pure local validation; no report is published by these tests.
const cleanExecution = {
  revision: "a".repeat(40),
  dirty: false,
  builtAt: now,
  sourceDigest: "b".repeat(64),
};
function exportableControl() {
  const record = { ...dispatched(), execution: cleanExecution };
  return settleControl(
    record,
    capturedOrder(),
    authorization({ status: "CAPTURED" }),
    capture(),
    later,
  );
}
test("control export requires clean recorded execution and a settled merchant order", () => {
  assert.throws(() => assertCleanControlExecution(undefined));
  assert.throws(() =>
    assertCleanControlExecution({ ...cleanExecution, revision: "short" }),
  );
  assert.throws(() =>
    assertCleanControlExecution({ ...cleanExecution, dirty: true }),
  );
  assert.throws(() => exportControlReceipt(dispatched(), later));
  assert.throws(() =>
    exportControlReceipt(
      { ...exportableControl(), execution: { ...cleanExecution, dirty: true } },
      later,
    ),
  );
  const receipt = exportControlReceipt(exportableControl(), later);
  assert.equal(receipt.executionRevision, cleanExecution.revision);
  assert.equal(receipt.merchantOrder.captureId, receipt.provider.capture.id);
  assert.equal(receipt.merchantOrder.checkoutHash, receipt.checkout.hash);
  assert.equal(receipt.contract.hash, receipt.merchantOrder.contractHash);
  const { hash, ...payload } = receipt;
  assert.equal(hash, sha256(payload));
});
test("control receipt omits approval URLs, raw command results and unexpected buyer fields", () => {
  const record = structuredClone(exportableControl());
  Object.assign(record.providerOrder!, {
    payer: { email_address: "private-buyer@example.invalid" },
    unexpectedSecret: "private-provider-data",
  });
  Object.assign(record.authorization!, { payer: { name: "Private Buyer" } });
  Object.assign(record.capture!, {
    payer: { email_address: "private-buyer@example.invalid" },
  });
  record.commands.capture!.result = {
    ...capture(),
    rawBuyer: "private-command-data",
  };
  const receipt = exportControlReceipt(record, later);
  const json = JSON.stringify(receipt);
  for (const forbidden of [
    "approvalUrl",
    "checkoutnow",
    "private-buyer",
    "Private Buyer",
    "private-provider-data",
    "private-command-data",
    "commands",
    "rawBuyer",
  ])
    assert.equal(json.includes(forbidden), false, forbidden);
  assert.equal(receipt.provider.capture.status, "COMPLETED");
  assert.equal(receipt.merchantOrder.item.size, "S");
});
