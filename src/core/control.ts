import assert from "node:assert/strict";
import { createCanonicalContract, createCanonicalState } from "./fixtures";
import { immutableCopy, sha256, stableRequestId } from "./hash";
import {
  evaluateContract,
  isTimestamp,
  readPath,
  sealSnapshot,
  verifyContractHash,
  verifySnapshotHash,
} from "./invariants";
import type {
  CommerceSnapshot,
  IntentContract,
  JsonObject,
  Money,
  VerificationResult,
} from "./types";
import type {
  CreateOrderInput,
  PayPalAuthorization,
  PayPalCapture,
  PayPalOrder,
} from "../providers/paypal";

export type ControlOperation = "create" | "authorize" | "capture";
/** Structural only: core helpers never read the process environment or Git. */
export interface ControlExecution {
  revision: string | null;
  dirty: boolean;
  builtAt: string | null;
  sourceDigest?: string;
}
export function assertCleanControlExecution(
  value: ControlExecution | undefined,
): asserts value is ControlExecution & {
  revision: string;
  dirty: false;
  builtAt: string;
  sourceDigest: string;
} {
  assert.ok(
    value &&
      typeof value.revision === "string" &&
      /^[a-f0-9]{40}$/.test(value.revision),
    "Control requires its full clean execution revision",
  );
  assert.equal(value.dirty, false, "Control execution must use a clean build");
  assert.ok(
    isTimestamp(value.builtAt),
    "Control requires a valid build timestamp",
  );
  assert.ok(
    typeof value.sourceDigest === "string" &&
      /^[a-f0-9]{64}$/.test(value.sourceDigest),
    "Control requires its executable-source digest",
  );
}
export interface ControlCommand {
  actionId: string;
  requestId: string;
  payload: unknown;
  payloadHash: string;
  state: "sent" | "completed" | "unknown";
  sentAt: string;
  result: unknown;
}
export interface ControlMerchantOrder {
  id: string;
  merchantId: string;
  caseId: string;
  checkoutHash: string;
  checkoutRevision: string;
  contractHash: string;
  providerOrderId: string;
  authorizationId: string;
  captureId: string;
  item: {
    productId: string;
    sku: string;
    color: string;
    size: string;
    quantity: number;
  };
  amount: Money;
  createdAt: string;
  environment: "sandbox";
}
export interface ControlRecord {
  schemaVersion: "2.0";
  id: string;
  kind: "operator-only-ungated-controlled-merchant";
  evidenceLimit: string;
  payeeId: string;
  status:
    | "prepared"
    | "awaiting_approval"
    | "approved"
    | "authorized"
    | "needs_reconciliation"
    | "control_completed";
  createdAt: string;
  execution?: ControlExecution;
  settlementObservedAt?: string;
  contract: IntentContract;
  originalCheckout: CommerceSnapshot;
  checkout: CommerceSnapshot;
  commands: Partial<Record<ControlOperation, ControlCommand>>;
  approvalObservedAt?: string;
  providerOrder?: PayPalOrder;
  authorization?: PayPalAuthorization;
  capture?: PayPalCapture;
  mutation?: {
    fromHash: string;
    toHash: string;
    appliedAt: string;
    disclosure: string;
  };
  counterfactual?: VerificationResult;
  merchantOrder?: ControlMerchantOrder;
}
const total: Money = { amountMinor: 14800, currency: "USD" };

function validTime(now: string) {
  assert.ok(isTimestamp(now), "Explicit timestamp required");
}
export function validateControlRecord(
  value: unknown,
): asserts value is ControlRecord {
  const record = value as ControlRecord;
  assert.ok(
    record &&
      record.schemaVersion === "2.0" &&
      record.kind === "operator-only-ungated-controlled-merchant",
    "Legacy or invalid control evidence: preserve and inspect manually; never replace it with a new purchase",
  );
  assert.ok(
    verifyContractHash(record.contract),
    "Control contract integrity failed",
  );
  assert.ok(
    verifySnapshotHash(record.originalCheckout) &&
      verifySnapshotHash(record.checkout),
    "Control checkout integrity failed",
  );
  assert.equal(record.originalCheckout.caseId, record.id);
  assert.equal(record.checkout.caseId, record.id);
  assert.ok(record.commands && record.payeeId);
  for (const [kind, command] of Object.entries(record.commands)) {
    assert.ok(["create", "authorize", "capture"].includes(kind));
    assert.equal(command.actionId, `${record.id}-${kind}`);
    assert.equal(command.requestId, stableRequestId(kind, command.actionId));
    assert.equal(command.payloadHash, sha256(command.payload));
  }
}
export function createControlRecord(
  id: string,
  payeeId: string,
  now: string,
  execution: ControlExecution = { revision: null, dirty: true, builtAt: null },
): ControlRecord {
  assert.match(id, /^[a-zA-Z0-9_-]{1,80}$/);
  assert.match(payeeId, /^[a-zA-Z0-9]{1,128}$/);
  validTime(now);
  const state = structuredClone(createCanonicalState());
  state.merchant = { id: "northpath-isolated-control" };
  const checkout = sealSnapshot({
    id: `${id}-checkout-1`,
    caseId: id,
    revision: "1",
    checkpoint: "CHECKOUT",
    observedAt: now,
    state,
  });
  return immutableCopy({
    schemaVersion: "2.0",
    id,
    kind: "operator-only-ungated-controlled-merchant",
    evidenceLimit:
      "Operator-only fictional merchant checkout and order, with disclosed M-to-S mutation and PayPal Sandbox payment. No AI shopper, public storefront checkout, shipment or real-world fulfillment is claimed. Provider execution is unqualified until actual readback exists; mocked tests are local only.",
    payeeId,
    status: "prepared",
    createdAt: now,
    execution,
    contract: createCanonicalContract(now, `${id}-contract`),
    originalCheckout: checkout,
    checkout,
    commands: {},
  });
}
export function controlCreatePayload(
  record: ControlRecord,
  baseUrl: string,
): Omit<CreateOrderInput, "actionId"> {
  validateControlRecord(record);
  return {
    caseId: record.id,
    payeeId: record.payeeId,
    referenceId: record.originalCheckout.revision,
    amount: total,
    returnUrl: new URL("/docs?control=approved", baseUrl).href,
    cancelUrl: new URL("/docs?control=canceled", baseUrl).href,
    item: {
      name: "Ocean Shell",
      sku: "NP-OS-BLU-M",
      quantity: 1,
      unitAmount: { amountMinor: 12900, currency: "USD" },
      tax: { amountMinor: 900, currency: "USD" },
    },
    breakdown: {
      itemTotal: { amountMinor: 12900, currency: "USD" },
      shipping: { amountMinor: 1000, currency: "USD" },
      taxTotal: { amountMinor: 900, currency: "USD" },
    },
  };
}
function assertOrder(record: ControlRecord, order: PayPalOrder) {
  assert.equal(order.customId, record.id, "Provider order case mismatch");
  assert.equal(order.payeeId, record.payeeId, "Provider payee mismatch");
  assert.equal(order.intent, "AUTHORIZE");
  assert.equal(order.referenceId, record.originalCheckout.revision);
  assert.deepEqual(order.amount, total);
  if (record.providerOrder) assert.equal(order.id, record.providerOrder.id);
}
export function observeControlOrder(
  record: ControlRecord,
  order: PayPalOrder,
): ControlRecord {
  validateControlRecord(record);
  assertOrder(record, order);
  const next = structuredClone(record);
  next.providerOrder = order;
  if (!next.commands.authorize) next.status = "awaiting_approval";
  return immutableCopy(next);
}
export function approveControl(
  record: ControlRecord,
  order: PayPalOrder,
  now: string,
): ControlRecord {
  validTime(now);
  assertOrder(record, order);
  assert.equal(order.status, "APPROVED", "Fresh buyer-approved order required");
  assert.equal(
    order.authorizationIds.length,
    0,
    "Authorization already exists; inspect only",
  );
  assert.equal(
    order.captureIds.length,
    0,
    "Capture already exists; inspect only",
  );
  assert.ok(
    !record.commands.authorize && !record.commands.capture,
    "Previously dispatched control: inspect only",
  );
  const next = structuredClone(observeControlOrder(record, order));
  next.approvalObservedAt = now;
  next.status = "approved";
  return immutableCopy(next);
}
function assertAuthorization(
  record: ControlRecord,
  order: PayPalOrder,
  authorization: PayPalAuthorization,
) {
  assertOrder(record, order);
  assert.deepEqual(
    order.authorizationIds,
    [authorization.id],
    "Exactly one linked authorization required",
  );
  assert.deepEqual(authorization.amount, total);
  if (authorization.orderId) assert.equal(authorization.orderId, order.id);
  if (authorization.payeeId)
    assert.equal(authorization.payeeId, record.payeeId);
  if (record.authorization)
    assert.equal(authorization.id, record.authorization.id);
}
export function observeControlAuthorization(
  record: ControlRecord,
  order: PayPalOrder,
  authorization: PayPalAuthorization,
): ControlRecord {
  validateControlRecord(record);
  assert.ok(
    record.commands.authorize && record.approvalObservedAt,
    "No persisted approved authorization command",
  );
  assertAuthorization(record, order, authorization);
  const next = structuredClone(record);
  next.providerOrder = order;
  next.authorization = authorization;
  next.status =
    authorization.status === "CREATED" && !record.commands.capture
      ? "authorized"
      : "needs_reconciliation";
  return immutableCopy(next);
}
/** Deliberately bypasses the intent gate, never the financial binding checks. */
export function mutateControlCheckout(
  record: ControlRecord,
  now: string,
): ControlRecord {
  validateControlRecord(record);
  validTime(now);
  assert.equal(
    record.authorization?.status,
    "CREATED",
    "Confirmed authorization required before mutation",
  );
  assert.ok(!record.commands.capture, "Checkout frozen after capture dispatch");
  if (record.mutation) return record;
  const next = structuredClone(record),
    state = structuredClone(record.checkout.state);
  (state.variant as JsonObject).id = "ocean-shell-blue-s";
  (state.variant as JsonObject).sku = "NP-OS-BLU-S";
  ((state.variant as JsonObject).attributes as JsonObject).size = "S";
  (state.policy as JsonObject).substitutionOccurred = true;
  next.checkout = sealSnapshot({
    id: `${record.id}-checkout-2`,
    caseId: record.id,
    revision: "2",
    checkpoint: "AUTHORIZED",
    observedAt: now,
    state,
  });
  next.mutation = {
    fromHash: record.checkout.hash,
    toHash: next.checkout.hash,
    appliedAt: now,
    disclosure:
      "Operator changed this isolated merchant checkout from M to S after authorization at the same $148 total. The control deliberately does not enforce the intent gate.",
  };
  next.counterfactual = evaluateContract(record.contract, next.checkout);
  assert.equal(next.counterfactual.decision, "DENY");
  return immutableCopy(next);
}
export function claimControlCommand(
  record: ControlRecord,
  kind: ControlOperation,
  payload: unknown,
  now: string,
): ControlRecord {
  validateControlRecord(record);
  validTime(now);
  assert.ok(
    !record.commands[kind],
    "Command already dispatched; inspect provider truth, never dispatch again",
  );
  assert.ok(!record.merchantOrder, "Control already has its merchant order");
  if (kind === "create") assert.equal(record.status, "prepared");
  if (kind === "authorize") {
    assert.equal(record.status, "approved");
    assert.ok(record.approvalObservedAt);
    assert.deepEqual(payload, { orderId: record.providerOrder?.id });
  }
  if (kind === "capture") {
    assert.equal(record.authorization?.status, "CREATED");
    assert.ok(
      record.authorization &&
        record.mutation &&
        record.checkout.hash === record.mutation.toHash,
    );
    assert.deepEqual(payload, {
      authorizationId: record.authorization.id,
      amount: total,
    });
  }
  const next = structuredClone(record),
    actionId = `${record.id}-${kind}`;
  next.commands[kind] = {
    actionId,
    requestId: stableRequestId(kind, actionId),
    payload: structuredClone(payload),
    payloadHash: sha256(payload),
    state: "sent",
    sentAt: now,
    result: null,
  };
  next.status = "needs_reconciliation";
  return immutableCopy(next);
}
export function recordControlCommand(
  record: ControlRecord,
  kind: ControlOperation,
  result: unknown,
  outcome: "completed" | "unknown",
): ControlRecord {
  validateControlRecord(record);
  const next = structuredClone(record),
    command = next.commands[kind];
  assert.ok(
    command && command.state === "sent",
    "Command is not awaiting its result",
  );
  command.result = result;
  command.state = outcome;
  return immutableCopy(next);
}
export function settleControl(
  record: ControlRecord,
  order: PayPalOrder,
  authorization: PayPalAuthorization,
  capture: PayPalCapture,
  now: string,
): ControlRecord {
  validateControlRecord(record);
  validTime(now);
  assert.ok(
    record.commands.capture && record.mutation,
    "No persisted capture command for this mutated checkout",
  );
  assertAuthorization(record, order, authorization);
  assert.deepEqual(
    order.captureIds,
    [capture.id],
    "Capture must be the order's sole capture",
  );
  const returned = record.commands.capture.result as PayPalCapture | null;
  if (returned?.id) assert.equal(capture.id, returned.id);
  if (record.capture) assert.equal(capture.id, record.capture.id);
  if (capture.orderId) assert.equal(capture.orderId, order.id);
  if (capture.authorizationId)
    assert.equal(capture.authorizationId, authorization.id);
  assert.deepEqual(capture.amount, total);
  assert.equal(capture.finalCapture, true);
  assert.equal(record.checkout.hash, record.mutation.toHash);
  const next = structuredClone(record);
  next.providerOrder = order;
  next.authorization = authorization;
  next.capture = capture;
  next.settlementObservedAt = now;
  next.status = "needs_reconciliation";
  if (capture.status !== "COMPLETED") return immutableCopy(next);
  assert.equal(
    authorization.status,
    "CAPTURED",
    "Authorization readback must confirm capture",
  );
  const merchantOrder: ControlMerchantOrder = {
    id: `northpath-control-${record.id}`,
    merchantId: "northpath-isolated-control",
    caseId: record.id,
    checkoutHash: record.checkout.hash,
    checkoutRevision: record.checkout.revision,
    contractHash: record.contract.hash,
    providerOrderId: order.id,
    authorizationId: authorization.id,
    captureId: capture.id,
    item: {
      productId: String(readPath(record.checkout.state, "product.id")),
      sku: String(readPath(record.checkout.state, "variant.sku")),
      color: String(
        readPath(record.checkout.state, "variant.attributes.color"),
      ),
      size: String(readPath(record.checkout.state, "variant.attributes.size")),
      quantity: Number(readPath(record.checkout.state, "quantity")),
    },
    amount: capture.amount,
    createdAt: record.merchantOrder?.createdAt ?? now,
    environment: "sandbox",
  };
  if (record.merchantOrder)
    assert.deepEqual(
      record.merchantOrder,
      merchantOrder,
      "A different merchant order already exists",
    );
  next.merchantOrder = merchantOrder;
  next.status = "control_completed";
  return immutableCopy(next);
}

/** Explicit allowlist; approval links, command payloads and buyer data never enter this receipt. */
export function exportControlReceipt(
  record: ControlRecord,
  exportedAt: string,
) {
  validateControlRecord(record);
  validTime(exportedAt);
  assertCleanControlExecution(record.execution);
  assert.equal(
    record.status,
    "control_completed",
    "Only a completed control may be exported",
  );
  assert.ok(
    record.providerOrder &&
      record.authorization &&
      record.capture &&
      record.merchantOrder &&
      record.mutation,
  );
  assert.ok(
    isTimestamp(record.settlementObservedAt),
    "Provider readback timestamp required",
  );
  const verified = settleControl(
    record,
    record.providerOrder,
    record.authorization,
    record.capture,
    record.settlementObservedAt,
  );
  assert.equal(verified.status, "control_completed");
  assert.equal(verified.merchantOrder!.item.size, "S");
  assert.equal(
    readPath(record.originalCheckout.state, "variant.attributes.size"),
    "M",
  );
  const counterfactual = evaluateContract(record.contract, record.checkout);
  assert.equal(counterfactual.decision, "DENY");
  assert.equal(record.mutation.fromHash, record.originalCheckout.hash);
  const item = (snapshot: CommerceSnapshot) => ({
    productId: readPath(snapshot.state, "product.id"),
    sku: readPath(snapshot.state, "variant.sku"),
    color: readPath(snapshot.state, "variant.attributes.color"),
    size: readPath(snapshot.state, "variant.attributes.size"),
    quantity: readPath(snapshot.state, "quantity"),
  });
  for (const [snapshot, size] of [
    [record.originalCheckout, "M"],
    [record.checkout, "S"],
  ] as const)
    assert.deepEqual(
      item(snapshot),
      {
        productId: "ocean-shell",
        sku: `NP-OS-BLU-${size}`,
        color: "blue",
        size,
        quantity: 1,
      },
      "Export supports only the reviewed synthetic control item",
    );
  const order = record.providerOrder,
    authorization = record.authorization,
    capture = record.capture;
  const payload = {
    schemaVersion: "1.0",
    kind: "reviewed-ungated-control-receipt",
    environment: "sandbox",
    id: record.id,
    status: "control_completed",
    exportedAt,
    settlementObservedAt: record.settlementObservedAt,
    executionRevision: record.execution.revision,
    execution: {
      revision: record.execution.revision,
      dirty: false,
      builtAt: record.execution.builtAt,
      sourceDigest: record.execution.sourceDigest,
    },
    evidenceLimit:
      "Isolated operator-only controlled merchant order after Sandbox capture. No AI browser execution, physical shipment or real-world fulfillment is claimed. A receipt hash is an integrity checksum, not a PayPal signature.",
    contract: { id: record.contract.id, hash: record.contract.hash },
    originalCheckout: {
      id: record.originalCheckout.id,
      hash: record.originalCheckout.hash,
      revision: record.originalCheckout.revision,
      item: item(record.originalCheckout),
      amount: total,
    },
    checkout: {
      id: record.checkout.id,
      hash: record.checkout.hash,
      revision: record.checkout.revision,
      item: item(record.checkout),
      amount: total,
    },
    mutation: {
      fromHash: record.mutation.fromHash,
      toHash: record.mutation.toHash,
      appliedAt: record.mutation.appliedAt,
      kind: "deliberate-medium-to-small",
      gateApplied: false,
    },
    counterfactual: {
      decision: counterfactual.decision,
      contractHash: counterfactual.contractHash,
      snapshotHash: counterfactual.snapshotHash,
    },
    merchantOrder: verified.merchantOrder!,
    provider: {
      order: {
        id: order.id,
        status: order.status,
        intent: order.intent,
        amount: {
          amountMinor: order.amount!.amountMinor,
          currency: order.amount!.currency,
        },
        payeeId: order.payeeId,
        customId: order.customId,
        referenceId: order.referenceId,
        authorizationIds: [...order.authorizationIds],
        captureIds: [...order.captureIds],
      },
      authorization: {
        id: authorization.id,
        status: authorization.status,
        amount: {
          amountMinor: authorization.amount.amountMinor,
          currency: authorization.amount.currency,
        },
        orderId: authorization.orderId,
        payeeId: authorization.payeeId,
      },
      capture: {
        id: capture.id,
        status: capture.status,
        amount: {
          amountMinor: capture.amount.amountMinor,
          currency: capture.amount.currency,
        },
        orderId: capture.orderId,
        authorizationId: capture.authorizationId,
        finalCapture: capture.finalCapture,
      },
    },
  };
  return immutableCopy({ ...payload, hash: sha256(payload) });
}
