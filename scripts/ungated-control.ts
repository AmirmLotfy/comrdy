import nextEnv from "@next/env";
import { mkdir, readFile, rename, rmdir, open } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PayPalSandboxAdapter } from "../src/providers/paypal";
import type { PayPalOrder } from "../src/providers/paypal";
import {
  approveControl,
  assertCleanControlExecution,
  claimControlCommand,
  controlCreatePayload,
  createControlRecord,
  mutateControlCheckout,
  observeControlAuthorization,
  observeControlOrder,
  recordControlCommand,
  settleControl,
  validateControlRecord,
  type ControlOperation,
  type ControlRecord,
  type ControlExecution,
} from "../src/core/control";

nextEnv.loadEnvConfig(process.cwd());
if (
  process.env.PAYPAL_ENV !== "sandbox" ||
  process.env.ALLOW_UNGATED_CONTROL !== "true" ||
  !process.env.PAYPAL_MERCHANT_ID
)
  throw new Error(
    "Operator-only control requires PAYPAL_ENV=sandbox, ALLOW_UNGATED_CONTROL=true and PAYPAL_MERCHANT_ID. Never expose it through the public application.",
  );
const phase = process.argv[2];
if (!["prepare", "complete", "inspect"].includes(phase))
  throw new Error(
    "Usage: npx tsx scripts/ungated-control.ts prepare|complete|inspect",
  );
let execution: ControlExecution | undefined;
if (phase === "prepare" || phase === "complete") {
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.APP_MODE !== "sandbox"
  )
    throw new Error(
      "Control prepare/complete requires NODE_ENV=production APP_MODE=sandbox and a clean build receipt. inspect remains read-only.",
    );
  const { assertWorkerSource } = await import("../src/server/worker-source");
  const { executionProvenance } = await import("../src/server/provenance");
  assertWorkerSource();
  execution = executionProvenance();
  assertCleanControlExecution(execution);
}
const api = new PayPalSandboxAdapter({
  clientId: process.env.PAYPAL_CLIENT_ID!,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
});
const directory = ".data/control";
await mkdir(directory, { recursive: true });
await mkdir(directory + "/lock"); // exclusive operator process; inspect stale locks manually
try {
  const filename = directory + "/evidence.json";
  let record: ControlRecord | undefined;
  try {
    const value: unknown = JSON.parse(await readFile(filename, "utf8"));
    validateControlRecord(value);
    record = value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const save = async () => {
    const file = await open(filename + ".tmp", "w", 0o600);
    try {
      await file.writeFile(JSON.stringify(record, null, 2));
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(filename + ".tmp", filename);
    const dir = await open(directory, "r");
    try {
      await dir.sync();
    } finally {
      await dir.close();
    }
  };
  const dispatch = async <T>(
    kind: ControlOperation,
    payload: unknown,
    perform: (actionId: string) => Promise<T>,
  ): Promise<T> => {
    record = claimControlCommand(
      record!,
      kind,
      payload,
      new Date().toISOString(),
    );
    await save(); // durable identity and payload precede I/O
    const actionId = record.commands[kind]!.actionId;
    try {
      const result = await perform(actionId);
      record = recordControlCommand(record!, kind, result, "completed");
      await save();
      return result;
    } catch (error) {
      if (record!.commands[kind]!.state === "sent") {
        record = recordControlCommand(record!, kind, null, "unknown");
        await save();
      }
      throw error;
    }
  };
  const readback = async () => {
    const createResult = record!.commands.create?.result as PayPalOrder | null;
    const orderId = record!.providerOrder?.id ?? createResult?.id;
    if (!orderId)
      throw new Error(
        "Creation has no known order ID. Inspect PayPal manually; this control never creates a replacement purchase.",
      );
    const order = await api.getOrder(orderId);
    record = observeControlOrder(record!, order);
    await save();
    if (record.commands.authorize && order.authorizationIds.length === 1) {
      const authorization = await api.getAuthorization(
        order.authorizationIds[0]!,
      );
      record = observeControlAuthorization(record, order, authorization);
      await save();
      if (record.commands.capture && order.captureIds.length === 1) {
        const capture = await api.getCapture(order.captureIds[0]!);
        record = settleControl(
          record,
          order,
          authorization,
          capture,
          new Date().toISOString(),
        );
        await save();
      }
    }
    return order;
  };
  if (phase === "prepare") {
    if (record)
      throw new Error(
        "An isolated control already exists. Preserve it and inspect; a second purchase is not permitted.",
      );
    record = createControlRecord(
      randomUUID(),
      process.env.PAYPAL_MERCHANT_ID!,
      new Date().toISOString(),
      execution!,
    );
    await save();
    const payload = controlCreatePayload(
      record,
      process.env.APP_URL || "http://localhost:3000",
    );
    const order = await dispatch("create", payload, (actionId) =>
      api.createOrder({ ...payload, actionId }),
    );
    record = observeControlOrder(record!, await api.getOrder(order.id));
    await save();
    if (!record.providerOrder!.approvalUrl)
      throw new Error(
        "No Sandbox approval URL was returned. Inspect this existing control.",
      );
    console.log(
      "Approve this isolated control in the Sandbox buyer browser, then run complete. Approval URL: " +
        record.providerOrder!.approvalUrl,
    );
  } else {
    if (!record)
      throw new Error("No isolated control exists. Use prepare once.");
    if (record.payeeId !== process.env.PAYPAL_MERCHANT_ID)
      throw new Error(
        "Configured merchant changed; preserve and inspect the existing control.",
      );
    if (phase === "complete") {
      assertCleanControlExecution(record.execution);
      if (
        record.execution.revision !== execution!.revision ||
        record.execution.sourceDigest !== execution!.sourceDigest
      )
        throw new Error(
          "Control completion must use the original clean execution revision and source. Preserve this record and use inspect for reconciliation.",
        );
      if (record.commands.authorize || record.commands.capture)
        throw new Error(
          "A financial command was already dispatched. Use inspect; complete never retries a payment.",
        );
      const order = await readback();
      record = approveControl(record!, order, new Date().toISOString());
      await save();
      await dispatch("authorize", { orderId: order.id }, (actionId) =>
        api.authorize({ orderId: order.id, actionId }),
      );
      await readback();
      record = mutateControlCheckout(record!, new Date().toISOString());
      await save();
      const payload = {
        authorizationId: record.authorization!.id,
        amount: { amountMinor: 14800, currency: "USD" },
      };
      await dispatch("capture", payload, (actionId) =>
        api.capture({ ...payload, actionId }),
      );
      await readback();
    } else await readback(); // inspect makes GETs only, even when finalizing the local merchant order
    console.log(
      JSON.stringify({
        status: record!.status,
        providerOrderId: record!.providerOrder?.id,
        authorization: record!.authorization?.status,
        capture: record!.capture?.status,
        merchantOrderId: record!.merchantOrder?.id,
        merchantSize: record!.merchantOrder?.item.size,
        gateApplied: false,
        evidence: filename,
        evidenceLimit: record!.evidenceLimit,
      }),
    );
  }
} finally {
  await rmdir(directory + "/lock");
}
