import nextEnv from "@next/env";
import { mkdir, readFile, writeFile, rename, rmdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PayPalSandboxAdapter } from "../src/providers/paypal";
import { createCanonicalState } from "../src/core/fixtures";
nextEnv.loadEnvConfig(process.cwd());
if (
  process.env.PAYPAL_ENV !== "sandbox" ||
  process.env.ALLOW_UNGATED_CONTROL !== "true"
)
  throw new Error(
    "Operator-only Sandbox control requires PAYPAL_ENV=sandbox and ALLOW_UNGATED_CONTROL=true. Never expose this script through the web application.",
  );
const phase = process.argv[2];
if (!["prepare", "complete", "inspect"].includes(phase))
  throw new Error(
    "Usage: npx tsx scripts/ungated-control.ts prepare|complete|inspect",
  );
const api = new PayPalSandboxAdapter({
  clientId: process.env.PAYPAL_CLIENT_ID!,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
});
const directory = ".data/control";
await mkdir(directory, { recursive: true });
const lock = directory + "/lock";
await mkdir(lock); // exclusive operator process; stale locks require inspection
try {
  const filename = directory + "/evidence.json";
  let record: any;
  try {
    record = JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const save = async () => {
    await writeFile(filename + ".tmp", JSON.stringify(record, null, 2), {
      mode: 0o600,
    });
    await rename(filename + ".tmp", filename);
  };
  const write = async (kind: string, request: () => Promise<unknown>) => {
    if (record.commands[kind])
      throw new Error(
        "Command already dispatched; inspect provider truth before any further action.",
      );
    record.commands[kind] = { sentAt: new Date().toISOString() };
    await save();
    try {
      const result = await request();
      record.commands[kind].result = result ?? null;
      await save();
      return result;
    } catch (error) {
      record.status = "outcome_uncertain";
      await save();
      throw error;
    }
  };
  if (phase === "prepare") {
    if (record)
      throw new Error(
        "An isolated control already exists. Inspect it; this script will not create a second purchase.",
      );
    const id = randomUUID();
    record = {
      id,
      kind: "operator-only-ungated-sandbox-control",
      status: "creating",
      commands: {},
      originalMerchantState: createCanonicalState("none"),
    };
    await save();
    const base = process.env.APP_URL || "http://localhost:3000";
    const order = await write("create", () =>
      api.createOrder({
        actionId: id + "-create",
        caseId: id,
        amount: { amountMinor: 14800, currency: "USD" },
        payeeId: process.env.PAYPAL_MERCHANT_ID,
        returnUrl: new URL("/docs?control=approved", base).href,
        cancelUrl: new URL("/docs?control=canceled", base).href,
      }),
    );
    record.order = order;
    record.status = "awaiting_approval";
    await save();
    console.log(
      "Approve this isolated control in your Sandbox buyer browser, then run complete. Approval URL: " +
        record.order.approvalUrl,
    );
  } else {
    if (!record?.order?.id)
      throw new Error(
        "No known provider order. Inspect PayPal dashboard before retrying creation.",
      );
    const order = await api.getOrder(record.order.id);
    record.observedOrder = order;
    if (phase === "inspect") {
      if (order.authorizationIds.length === 1)
        record.observedAuthorization = await api.getAuthorization(
          order.authorizationIds[0],
        );
      if (order.captureIds.length === 1)
        record.observedCapture = await api.getCapture(order.captureIds[0]);
      await save();
      console.log(
        JSON.stringify({
          status: record.status,
          order: order.status,
          authorization: record.observedAuthorization?.status,
          capture: record.observedCapture?.status,
        }),
      );
    } else {
      if (
        record.status !== "awaiting_approval" ||
        order.status !== "APPROVED" ||
        order.customId !== record.id
      )
        throw new Error(
          "A fresh, matching buyer-approved order is required. Use inspect for previously dispatched commands.",
        );
      const authorized: any = await write("authorize", () =>
        api.authorize({
          orderId: order.id,
          actionId: record.id + "-authorize",
        }),
      );
      if (authorized.authorizationIds.length !== 1)
        throw new Error("Authorization is ambiguous; inspect provider.");
      record.mutatedMerchantState = createCanonicalState("variant");
      record.disclosedFault =
        "M → S after authorization, same $148 price. No protection gate in this isolated control.";
      await save();
      const captured: any = await write("capture", () =>
        api.capture({
          authorizationId: authorized.authorizationIds[0],
          amount: { amountMinor: 14800, currency: "USD" },
          actionId: record.id + "-capture",
        }),
      );
      record.observedCapture = await api.getCapture(captured.id);
      record.status =
        record.observedCapture.status === "COMPLETED"
          ? "control_completed"
          : "needs_reconciliation";
      await save();
      console.log(
        JSON.stringify({
          status: record.status,
          captureId: captured.id,
          evidence: filename,
        }),
      );
    }
  }
} finally {
  await rmdir(lock);
}
