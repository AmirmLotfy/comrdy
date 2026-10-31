import { randomUUID } from "node:crypto";
import { executionProvenance } from "./provenance";
import { z } from "zod";
import {
  assertCaptureBinding,
  evaluateContract,
  evaluatePaymentGate,
  readPath,
  sealSnapshot,
  verifyContractHash,
} from "../core/invariants";
import { sha256, stableRequestId } from "../core/hash";
import type {
  CommerceSnapshot,
  IntentContract,
  JsonObject,
  Money,
  PaymentGateResult,
  ProviderCheckpoint,
} from "../core/types";
import { MoneySchema } from "../core/types";
import { compileIntent } from "../providers/compiler";
import { PayPalError, PayPalSandboxAdapter } from "../providers/paypal";
import type {
  CreateOrderInput,
  PayPalCapture,
  PayPalOrder,
} from "../providers/paypal";
import { requireSandbox } from "./config";
import { runShopper } from "./shopper";
import { publicRun, transaction } from "./store";
import type { StoredRun } from "./store";

type Provider = Pick<
  PayPalSandboxAdapter,
  | "createOrder"
  | "getOrder"
  | "authorize"
  | "getAuthorization"
  | "capture"
  | "getCapture"
  | "voidAuthorization"
  | "getCheckpoint"
  | "verifyWebhook"
>;
type OperationKind = "create" | "authorize" | "capture" | "void";
interface Command {
  kind: OperationKind;
  actionId: string;
  requestId: string;
  payload: unknown;
  payloadHash: string;
  state: "sent" | "completed" | "unknown" | "failed";
  attempts: number;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  errorCode?: string;
}
interface LiveState {
  commands: Partial<Record<OperationKind, Command>>;
  checkout?: CommerceSnapshot;
  authorization?: CommerceSnapshot;
  provider?: ProviderCheckpoint;
  gate?: PaymentGateResult;
  faultApplied: boolean;
  reconcileAttempts: number;
  lastReconciledAt?: string;
  pendingWebhook?: boolean;
  lease?: { token: string; until: string };
}
interface MerchantState {
  size: string;
  totalMinor: number;
  revision: number;
  source: string;
  state: JsonObject;
}
export interface SandboxDependencies {
  providerFactory?: () => Provider;
  shopper?: typeof runShopper;
  compiler?: typeof compileIntent;
  transaction?: typeof transaction;
  now?: () => Date;
}

function live(run: StoredRun): LiveState {
  const value = run.live as LiveState | undefined;
  if (!value || !value.commands)
    throw new Error("Run has no durable Sandbox state.");
  return value;
}
function merchant(run: StoredRun): MerchantState {
  const parsed = z
    .object({
      size: z.enum(["S", "M", "L"]),
      totalMinor: z.number().int().positive(),
      revision: z.number().int().positive(),
      source: z.string().min(1),
      state: z.record(z.string(), z.unknown()),
    })
    .parse(run.merchant);
  const state = parsed.state as JsonObject;
  const total = MoneySchema.parse(readPath(state, "pricing.total"));
  if (
    total.currency !== "USD" ||
    total.amountMinor !== parsed.totalMinor ||
    readPath(state, "variant.attributes.size") !== parsed.size
  )
    throw new Error("Merchant checkout state is inconsistent.");
  return { ...parsed, state };
}
function pushEvent(
  run: StoredRun,
  time: string,
  title: string,
  detail: string,
) {
  run.events.push({ time, title, detail });
}
function reasonOf(decision: PaymentGateResult) {
  return (
    decision.reasons.map((reason) => reason.message).join(" ") ||
    "Every hard constraint and payment binding passed."
  );
}
function totalOf(snapshot: CommerceSnapshot): Money {
  return MoneySchema.parse(readPath(snapshot.state, "pricing.total"));
}
function safeError(error: unknown): string {
  return error instanceof PayPalError ? error.code : "SANDBOX_WORKFLOW_FAILED";
}

/** Injectable dependencies are for local tests; all entry points still enforce Sandbox configuration. */
export function createSandboxService(dependencies: SandboxDependencies = {}) {
  const tx = dependencies.transaction ?? transaction;
  const shopper = dependencies.shopper ?? runShopper;
  const compiler = dependencies.compiler ?? compileIntent;
  const clock = dependencies.now ?? (() => new Date());
  const timestamp = () => clock().toISOString();
  const provider = () =>
    dependencies.providerFactory?.() ??
    new PayPalSandboxAdapter({
      clientId: process.env.PAYPAL_CLIENT_ID!,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    });
  function config() {
    requireSandbox();
    const payeeId = process.env.PAYPAL_MERCHANT_ID?.trim();
    if (!payeeId || !/^[A-Za-z0-9]{1,128}$/.test(payeeId))
      throw new Error(
        "Configure the expected PayPal Sandbox merchant ID before running.",
      );
    const appUrl = new URL(process.env.APP_URL ?? "");
    if (
      appUrl.protocol !== "https:" &&
      !(
        appUrl.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(appUrl.hostname)
      )
    )
      throw new Error("APP_URL must be HTTPS or localhost.");
    return { payeeId, appUrl };
  }
  async function owned(id: string, owner: string): Promise<StoredRun> {
    return tx((db) => {
      const run = db.runs[id];
      if (!run || run.owner !== owner || run.mode !== "sandbox")
        throw new Error("Run not found.");
      return structuredClone(run);
    });
  }
  function snapshot(
    run: StoredRun,
    checkpoint: "CHECKOUT" | "AUTHORIZED",
  ): CommerceSnapshot {
    const current = merchant(run);
    return sealSnapshot({
      id: `${run.id}-${checkpoint.toLowerCase()}-${current.revision}`,
      caseId: run.id,
      revision: String(current.revision),
      checkpoint,
      observedAt: timestamp(),
      state: current.state,
    });
  }
  async function command<T>(
    runId: string,
    kind: OperationKind,
    payload: unknown,
    perform: (actionId: string) => Promise<T>,
    replay = false,
    beforeClaim?: (run: StoredRun) => void,
  ): Promise<T> {
    const claimed = await tx((db) => {
      const run = db.runs[runId];
      if (!run || run.mode !== "sandbox") throw new Error("Run not found.");
      const state = live(run);
      const previous = state.commands[kind];
      const payloadHash = sha256(payload);
      if (previous && previous.payloadHash !== payloadHash)
        throw new Error(
          "An economic action cannot change its persisted request.",
        );
      if (previous?.state === "completed")
        return {
          completed: true as const,
          result: previous.result as T,
          actionId: previous.actionId,
        };
      if (
        previous &&
        (!replay ||
          !["unknown", "sent"].includes(previous.state) ||
          previous.attempts >= 2 ||
          clock().getTime() - Date.parse(previous.createdAt) > 60 * 60_000)
      )
        throw new Error(
          "Reconcile this operation; automatic replay is unavailable.",
        );
      beforeClaim?.(run);
      const actionId = previous?.actionId ?? `${runId}-${kind}`;
      state.commands[kind] = {
        kind,
        actionId,
        requestId: stableRequestId(kind, actionId),
        payload: structuredClone(payload),
        payloadHash,
        state: "sent",
        attempts: (previous?.attempts ?? 0) + 1,
        createdAt: previous?.createdAt ?? timestamp(),
        updatedAt: timestamp(),
      };
      run.operations[kind] = stableRequestId(kind, actionId);
      pushEvent(
        run,
        timestamp(),
        replay ? "Retrying persisted command" : "Payment command persisted",
        `${kind}; same economic action and request ID are retained.`,
      );
      return { completed: false as const, actionId };
    });
    if (claimed.completed) return claimed.result;
    try {
      const result = await perform(claimed.actionId);
      await tx((db) => {
        const run = db.runs[runId]!;
        const op = live(run).commands[kind]!;
        op.state = "completed";
        op.result = result === undefined ? null : structuredClone(result);
        op.updatedAt = timestamp();
      });
      return result;
    } catch (error) {
      await tx((db) => {
        const run = db.runs[runId]!;
        const op = live(run).commands[kind]!;
        // Unknown non-provider failures after dispatch are conservatively ambiguous too.
        op.state =
          error instanceof PayPalError && !error.outcomeUnknown
            ? "failed"
            : "unknown";
        op.errorCode = safeError(error);
        op.updatedAt = timestamp();
        const settlementUnresolved = kind === "capture" || kind === "void";
        run.status =
          op.state === "unknown" || settlementUnresolved
            ? "reconciling"
            : "infra_failed";
        // A rejected settlement command does not release its authorization.
        // Preserve provider truth until a fresh readback confirms settlement.
        if (!settlementUnresolved)
          run.payment.status =
            op.state === "unknown"
              ? `${kind.toUpperCase()}_UNKNOWN`
              : "PROVIDER_ERROR";
        pushEvent(
          run,
          timestamp(),
          "Provider action needs attention",
          `${kind}: ${op.errorCode}. No new financial action was created.`,
        );
      });
      throw error;
    }
  }
  async function compile(mandate: string) {
    config();
    const result = await compiler(mandate, {
      apiKey: process.env.OPENAI_API_KEY!,
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
    });
    return {
      contract: result.candidate,
      unresolved: result.candidate.needsResolution,
      mode: "sandbox" as const,
      compiler: {
        execution: executionProvenance(),
        model: result.model,
        responseId: result.responseId,
        usage: result.usage,
      },
    };
  }
  async function start(
    contractInput: { id: string },
    fault: StoredRun["fault"],
    owner: string,
    parentId?: string,
  ) {
    config();
    if (!["none", "variant", "shipping"].includes(fault))
      throw new Error("Unknown demo fault.");
    return tx((db) => {
      const saved = db.contracts[contractInput.id];
      if (
        !saved ||
        saved.owner !== owner ||
        !verifyContractHash(saved.contract as IntentContract)
      )
        throw new Error("Confirm a valid contract before running.");
      if (Object.values(db.runs).filter((r) => r.owner === owner).length >= 100)
        throw new Error("Session run limit reached.");
      if (
        Object.values(db.runs).some(
          (r) =>
            (r.owner === owner &&
              r.mode === "sandbox" &&
              [
                "queued",
                "shopping",
                "creating_order",
                "awaiting_approval",
                "approved",
                "authorizing",
                "verifying",
                "capturing",
                "voiding",
                "reconciling",
                "inconclusive",
              ].includes(r.status)) ||
            (r.owner === owner &&
              r.mode === "sandbox" &&
              !!r.payment.authorizationId &&
              !["VOIDED", "COMPLETED"].includes(r.payment.status)),
        )
      )
        throw new Error(
          "Finish or reconcile the current run before starting another.",
        );
      if (parentId) {
        const original = db.runs[parentId];
        if (
          !original ||
          original.owner !== owner ||
          original.parentId ||
          original.contract.id !== contractInput.id ||
          original.status !== "blocked" ||
          original.decision.verdict === "ALLOW" ||
          !["VOIDED", "NOT_REQUESTED"].includes(original.payment.status)
        )
          throw new Error("Recovery requires a safely blocked original run.");
        if (Object.values(db.runs).some((r) => r.parentId === parentId))
          throw new Error("This case already used its one recovery attempt.");
      }
      const id = randomUUID();
      const run: StoredRun = {
        id,
        owner,
        mode: "sandbox",
        execution: executionProvenance(),
        fault,
        status: "queued",
        contract: structuredClone(saved.contract),
        compiler: saved.compiler ?? null,
        snapshots: [],
        events: [],
        decision: {
          verdict: "REVIEW",
          reason: "Awaiting observed merchant and provider evidence.",
        },
        payment: {
          authorizationId: null,
          captureId: null,
          status: "NOT_REQUESTED",
        },
        operations: {},
        createdAt: timestamp(),
        merchantToken: randomUUID(),
        live: {
          commands: {},
          faultApplied: false,
          reconcileAttempts: 0,
        } satisfies LiveState,
        ...(parentId ? { parentId } : {}),
      };
      pushEvent(
        run,
        timestamp(),
        "Sandbox run queued",
        "A real AI browser must complete the controlled merchant checkout before payment approval is requested.",
      );
      db.runs[id] = run;
      return publicRun(run);
    });
  }
  async function installOrder(runId: string, order: PayPalOrder) {
    await tx((db) => {
      const run = db.runs[runId]!;
      if (order.customId && order.customId !== runId)
        throw new Error("Provider order belongs to another case.");
      run.payment.orderId = order.id;
      if (!order.approvalUrl) {
        run.status = "inconclusive";
        run.payment.status = "APPROVAL_LINK_MISSING";
        return;
      }
      run.payment.approvalUrl = order.approvalUrl;
      run.payment.status = "APPROVAL_REQUIRED";
      run.status = "awaiting_approval";
      pushEvent(
        run,
        timestamp(),
        "Buyer approval required",
        "Continue to PayPal Sandbox to review and approve the order. No authorization or capture is claimed yet.",
      );
    });
  }
  async function shopAndCreate(runId: string) {
    const { payeeId, appUrl } = config();
    const run = await tx((db) => structuredClone(db.runs[runId]!));
    const observation = await shopper({
      runId,
      merchantToken: String(run.merchantToken),
      mandate: (run.contract as IntentContract).mandate,
      baseUrl: appUrl.origin,
      onEvent: async (title, detail) => {
        await tx((db) =>
          pushEvent(db.runs[runId]!, timestamp(), title, detail),
        );
      },
    });
    const prepared = await tx((db) => {
      const current = db.runs[runId]!;
      if (current.status !== "shopping")
        throw new Error("Shopping lease is no longer active.");
      const cart = merchant(current);
      const expectedBrowserTotal = `$${(cart.totalMinor / 100).toFixed(2)}`;
      if (
        observation.size !== cart.size ||
        observation.totalText.replace(/,/g, "").trim() !== expectedBrowserTotal
      )
        throw new Error("Browser and merchant checkout observations disagree.");
      const checkout = snapshot(current, "CHECKOUT");
      const result = evaluateContract(current.contract, checkout);
      live(current).checkout = checkout;
      current.browserEvidence = observation;
      current.merchantToken = null;
      current.snapshots.push({
        checkpoint: "Checkout",
        size: cart.size,
        totalMinor: cart.totalMinor,
        revision: cart.revision,
        source: `${cart.source} + ${observation.source}`,
      });
      current.evidence = {
        contractHash: current.contract.hash,
        snapshotHash: checkout.hash,
        snapshots: [checkout],
        providerEvidence: null,
        compiler: current.compiler,
        browserEvidence: observation,
        agentActions: current.events.filter(
          (entry) => entry.title === "Agent action",
        ),
      };
      if (result.decision !== "ALLOW") {
        current.status = "blocked";
        current.decision = {
          verdict: result.decision,
          reason: "Preflight did not satisfy every confirmed hard constraint.",
        };
        current.evaluations = result.evaluations;
        pushEvent(
          current,
          timestamp(),
          "Preflight stopped",
          "No PayPal order or authorization was requested.",
        );
        return null;
      }
      const pricing = checkout.state.pricing as JsonObject;
      const quantity = readPath(checkout.state, "quantity");
      if (quantity !== 1)
        throw new Error("The controlled merchant supports exactly one item.");
      const payload: Omit<CreateOrderInput, "actionId"> = {
        caseId: runId,
        amount: totalOf(checkout),
        payeeId,
        referenceId: checkout.revision,
        returnUrl: new URL(`/cases/${runId}?paypal=approved`, appUrl).href,
        cancelUrl: new URL(`/cases/${runId}?paypal=canceled`, appUrl).href,
        item: {
          name: String(readPath(checkout.state, "product.name")),
          sku: String(readPath(checkout.state, "variant.sku")),
          quantity: 1,
          unitAmount: MoneySchema.parse(pricing.subtotal),
          tax: MoneySchema.parse(pricing.tax),
        },
        breakdown: {
          itemTotal: MoneySchema.parse(pricing.subtotal),
          shipping: MoneySchema.parse(pricing.shipping),
          taxTotal: MoneySchema.parse(pricing.tax),
          discount: MoneySchema.parse(pricing.discount),
        },
      };
      current.status = "creating_order";
      return payload;
    });
    if (!prepared) return;
    const api = provider();
    const order = await command(runId, "create", prepared, (actionId) =>
      api.createOrder({ ...prepared, actionId }),
    );
    await installOrder(runId, order);
  }
  function applyFault(run: StoredRun) {
    const state = live(run);
    if (state.faultApplied) return;
    const cart = merchant(run);
    if (run.fault === "variant") {
      const variant = cart.state.variant as JsonObject;
      (variant.attributes as JsonObject).size = "S";
      variant.id = "ocean-shell-blue-s";
      variant.sku = "NP-OS-BLU-S";
      (cart.state.policy as JsonObject).substitutionOccurred = true;
      cart.size = "S";
      cart.revision++;
    } else if (run.fault === "shipping") {
      const pricing = cart.state.pricing as JsonObject;
      pricing.shipping = { amountMinor: 3500, currency: "USD" };
      pricing.total = { amountMinor: 17300, currency: "USD" };
      cart.totalMinor = 17300;
      cart.revision++;
    }
    run.merchant = cart;
    state.faultApplied = true;
    if (run.fault !== "none")
      pushEvent(
        run,
        timestamp(),
        "Controlled merchant fault applied",
        `${run.fault}; checkout revision is now ${cart.revision}. This test mutation is recorded, not hidden.`,
      );
  }
  async function recordCapture(runId: string, capture: PayPalCapture) {
    await tx((db) => {
      const run = db.runs[runId]!;
      const state = live(run);
      const expectedAmount = state.gate?.binding.amount;
      run.payment.captureId = capture.id;
      run.payment.status = capture.status;
      run.captureEvidence = capture;
      run.evidence = {
        ...((run.evidence as Record<string, unknown>) ?? {}),
        captureEvidence: capture,
      };
      const amountMatches =
        expectedAmount && sha256(expectedAmount) === sha256(capture.amount);
      if (
        !amountMatches ||
        !capture.finalCapture ||
        (capture.orderId && capture.orderId !== run.payment.orderId) ||
        (capture.authorizationId &&
          capture.authorizationId !== run.payment.authorizationId)
      ) {
        run.status = "inconclusive";
        run.decision = {
          verdict: "REVIEW",
          reason:
            "Capture result does not match the persisted command. Manual reconciliation is required.",
        };
      } else {
        run.status =
          capture.status === "COMPLETED"
            ? "completed"
            : ["PENDING", "DECLINED", "FAILED"].includes(capture.status)
              ? "reconciling"
              : "payment_failed";
        if (capture.status === "COMPLETED") {
          // Reconciliation can resolve provider uncertainty without changing the
          // deterministic gate that authorized this already-persisted command.
          if (state.gate && state.gate.decision === "ALLOW")
            run.decision = {
              verdict: state.gate.decision,
              reason: reasonOf(state.gate),
            };
          const existingOrder = run.merchantOrder as
            { captureId: string } | undefined;
          if (existingOrder && existingOrder.captureId !== capture.id) {
            run.status = "inconclusive";
            run.decision = {
              verdict: "REVIEW",
              reason:
                "A different capture was already assigned to this merchant order.",
            };
          } else if (!existingOrder) {
            const cart = merchant(run);
            run.merchantOrder = {
              id: `northpath-${runId}`,
              caseId: runId,
              captureId: capture.id,
              size: cart.size,
              amount: capture.amount,
              createdAt: timestamp(),
              environment: "sandbox",
            };
          }
          run.evidence = {
            ...(run.evidence as Record<string, unknown>),
            merchantOrder: run.merchantOrder,
          };
        }
      }
      pushEvent(
        run,
        timestamp(),
        "PayPal capture observed",
        `${capture.status}; ${capture.amount.currency} ${(capture.amount.amountMinor / 100).toFixed(2)}. Only COMPLETED is reported as paid.`,
      );
    });
  }
  async function recordVoid(runId: string, api: Provider) {
    const run = await tx((db) => structuredClone(db.runs[runId]!));
    const authorization = await api.getAuthorization(
      run.payment.authorizationId!,
    );
    if (
      authorization.id !== run.payment.authorizationId ||
      (authorization.orderId && authorization.orderId !== run.payment.orderId)
    )
      throw new Error("Authorization binding mismatch during void readback.");
    await tx((db) => {
      const current = db.runs[runId]!;
      current.voidEvidence = authorization;
      current.payment.status = authorization.status;
      current.evidence = {
        ...((current.evidence as Record<string, unknown>) ?? {}),
        voidEvidence: authorization,
      };
      current.status =
        authorization.status === "VOIDED"
          ? current.decision.verdict === "ALLOW"
            ? "payment_failed"
            : "blocked"
          : "reconciling";
      pushEvent(
        current,
        timestamp(),
        "Authorization retrieved",
        authorization.status === "VOIDED"
          ? "PayPal confirms VOIDED. No completed capture is claimed for this case."
          : `Provider status is ${authorization.status}; release of the authorization is not yet confirmed.`,
      );
    });
  }
  async function gateAndSettle(runId: string, api: Provider) {
    const { payeeId } = config();
    const existing = await tx((db) => structuredClone(db.runs[runId]!));
    const checkpoint = await api.getCheckpoint({
      orderId: existing.payment.orderId!,
      authorizationId: existing.payment.authorizationId!,
    });
    const decision = await tx((db) => {
      const run = db.runs[runId]!;
      const state = live(run);
      if (state.commands.capture || state.commands.void)
        throw new Error(
          "Settlement was already dispatched; reconcile instead.",
        );
      applyFault(run);
      const final = snapshot(run, "AUTHORIZED");
      const cart = merchant(run);
      const gate = evaluatePaymentGate({
        contract: run.contract,
        snapshot: final,
        provider: checkpoint,
        expected: {
          caseId: runId,
          revision: final.revision,
          orderId: run.payment.orderId!,
          authorizationId: run.payment.authorizationId!,
          payeeId,
        },
        evaluatedAt: timestamp(),
        alreadyCaptured: !!run.payment.captureId,
      });
      state.authorization = final;
      state.provider = checkpoint;
      state.gate = gate;
      run.snapshots.push({
        checkpoint: "Final check",
        size: cart.size,
        totalMinor: cart.totalMinor,
        revision: cart.revision,
        source: "Northpath merchant server + PayPal Sandbox API",
      });
      run.decision = { verdict: gate.decision, reason: reasonOf(gate) };
      run.evaluations = gate.evaluations;
      run.evidence = {
        ...((run.evidence as Record<string, unknown>) ?? {}),
        contractHash: run.contract.hash,
        snapshotHash: final.hash,
        snapshots: [state.checkout, final].filter(Boolean),
        providerEvidence: checkpoint,
        decisionId: gate.decisionId,
      };
      run.status = gate.decision === "ALLOW" ? "capturing" : "voiding";
      pushEvent(
        run,
        timestamp(),
        "Deterministic transaction gate",
        `${gate.decision}: ${reasonOf(gate)}`,
      );
      return gate;
    });
    if (decision.decision === "ALLOW") {
      const payload = {
        authorizationId: decision.binding.authorizationId,
        amount: decision.binding.amount!,
      };
      const capture = await command(
        runId,
        "capture",
        payload,
        (actionId) => api.capture({ ...payload, actionId }),
        false,
        (run) => {
          const state = live(run);
          const current = merchant(run);
          if (
            String(current.revision) !== state.authorization!.revision ||
            sha256(current.state) !== sha256(state.authorization!.state)
          )
            throw new Error("Checkout changed after verification.");
          if (run.payment.captureId)
            throw new Error("This action is already captured.");
          assertCaptureBinding({
            decision: state.gate!,
            contract: run.contract,
            snapshot: state.authorization!,
            provider: state.provider!,
            expected: state.gate!.binding,
            now: timestamp(),
          });
        },
      );
      await recordCapture(runId, capture);
    } else {
      const payload = { authorizationId: decision.binding.authorizationId };
      if (
        checkpoint.authorizationStatus === "CAPTURED" ||
        checkpoint.authorizationStatus === "PARTIALLY_CAPTURED"
      ) {
        await tx((db) => {
          const run = db.runs[runId]!;
          run.status = "inconclusive";
          run.payment.status = checkpoint.authorizationStatus;
          pushEvent(
            run,
            timestamp(),
            "Unexpected prior capture",
            "The authorization was already captured externally. No prevention or void is claimed.",
          );
        });
        return;
      }
      await command(runId, "void", payload, (actionId) =>
        api.voidAuthorization({ ...payload, actionId }),
      );
      await recordVoid(runId, api);
    }
  }
  async function approve(
    runId: string,
    owner: string,
    returnedOrderId?: string,
  ) {
    config();
    return tx((db) => {
      const run = db.runs[runId];
      if (!run || run.owner !== owner || run.mode !== "sandbox")
        throw new Error("Run not found.");
      if (returnedOrderId && returnedOrderId !== run.payment.orderId)
        throw new Error("Returned PayPal order does not match this run.");
      if (!run.payment.orderId)
        throw new Error("This run has no PayPal order to approve.");
      if (
        [
          "approved",
          "authorizing",
          "verifying",
          "capturing",
          "voiding",
          "reconciling",
          "completed",
          "blocked",
          "payment_failed",
          "inconclusive",
        ].includes(run.status)
      )
        return publicRun(run);
      if (run.status !== "awaiting_approval")
        throw new Error("This run is not awaiting buyer approval.");
      run.status = "approved";
      run.approvalRequestedAt = timestamp();
      pushEvent(
        run,
        timestamp(),
        "Approval check queued",
        "The worker will verify buyer approval with PayPal before requesting authorization.",
      );
      return publicRun(run);
    });
  }
  async function authorizeAndSettle(runId: string) {
    const orderId = await tx((db) => db.runs[runId]!.payment.orderId!);
    const api = provider();
    try {
      const observed = await api.getOrder(orderId);
      if (observed.status !== "APPROVED" || observed.customId !== runId) {
        await tx((db) => {
          db.runs[runId]!.status = "awaiting_approval";
        });
        throw new Error(
          "PayPal has not confirmed buyer approval for this order.",
        );
      }
      const beforeAuthorization = await tx((db) =>
        structuredClone(db.runs[runId]!),
      );
      const freshCheckout = snapshot(beforeAuthorization, "CHECKOUT");
      if (
        evaluateContract(beforeAuthorization.contract, freshCheckout)
          .decision !== "ALLOW" ||
        observed.payeeId !== process.env.PAYPAL_MERCHANT_ID ||
        !observed.amount ||
        sha256(observed.amount) !== sha256(totalOf(freshCheckout))
      ) {
        await tx((db) => {
          const run = db.runs[runId]!;
          run.status = "blocked";
          run.payment.status = "NOT_REQUESTED";
          run.decision = {
            verdict: "DENY",
            reason:
              "Checkout or provider order changed before authorization. No authorization requested.",
          };
        });
        return;
      }
      const authorized = await command(
        runId,
        "authorize",
        { orderId },
        (actionId) => api.authorize({ orderId, actionId }),
      );
      if (authorized.authorizationIds.length !== 1)
        throw new Error("PayPal did not return exactly one authorization.");
      await tx((db) => {
        const run = db.runs[runId]!;
        run.payment.authorizationId = authorized.authorizationIds[0]!;
        run.payment.status = "AUTHORIZED";
        run.status = "verifying";
        pushEvent(
          run,
          timestamp(),
          "Authorization received",
          "Payment is authorized; capture still requires the deterministic gate.",
        );
      });
      await gateAndSettle(runId, api);
    } catch (error) {
      await tx((db) => {
        const run = db.runs[runId]!;
        if (
          ["authorizing", "verifying", "capturing", "voiding"].includes(
            run.status,
          )
        ) {
          run.status = "reconciling";
          pushEvent(
            run,
            timestamp(),
            "Reconciliation required",
            safeError(error),
          );
        }
      });
      throw error;
    }
  }
  async function reconcile(runId: string, allowReplay = false) {
    config();
    const api = provider();
    let run = await tx((db) => structuredClone(db.runs[runId]!));
    if (!run || run.mode !== "sandbox") throw new Error("Run not found.");
    const state = live(run);
    await tx((db) => {
      const current = live(db.runs[runId]!);
      current.reconcileAttempts++;
      current.lastReconciledAt = timestamp();
    });
    if (!run.payment.orderId) {
      const op = state.commands.create;
      if (op?.state === "completed" && op.result) {
        await installOrder(runId, op.result as PayPalOrder);
        return;
      }
      if (op && allowReplay && ["unknown", "sent"].includes(op.state)) {
        const payload = op.payload as Omit<CreateOrderInput, "actionId">;
        const order = await command(
          runId,
          "create",
          payload,
          (actionId) => api.createOrder({ ...payload, actionId }),
          true,
        );
        await installOrder(runId, order);
        return;
      }
      throw new Error("Provider order creation remains unconfirmed.");
    }
    const order = await api.getOrder(run.payment.orderId);
    if (
      order.customId !== runId ||
      order.payeeId !== process.env.PAYPAL_MERCHANT_ID
    )
      throw new Error("Provider order binding mismatch during reconciliation.");
    const captureCommand = state.commands.capture;
    if (captureCommand) {
      const knownCaptureId =
        run.payment.captureId ??
        (captureCommand.result as PayPalCapture | undefined)?.id ??
        order.captureIds[0];
      if (knownCaptureId) {
        if (!order.captureIds.includes(knownCaptureId))
          throw new Error("Capture does not belong to the retrieved order.");
        const observedCapture = await api.getCapture(knownCaptureId);
        await recordCapture(runId, observedCapture);
        if (!["DECLINED", "FAILED"].includes(observedCapture.status)) return;
      }
      if (captureCommand.state === "failed" || knownCaptureId) {
        // A definitively rejected capture may still leave a live authorization.
        // Read it first; cleanup is a distinct persisted void, never a new capture.
        const authorization = await api.getAuthorization(
          run.payment.authorizationId!,
        );
        if (
          authorization.id !== run.payment.authorizationId ||
          (authorization.orderId && authorization.orderId !== order.id)
        )
          throw new Error("Authorization binding mismatch during cleanup.");
        if (authorization.status === "VOIDED") {
          await recordVoid(runId, api);
          return;
        }
        const voidOp = state.commands.void;
        if (
          allowReplay &&
          authorization.status === "CREATED" &&
          (!voidOp || ["unknown", "sent"].includes(voidOp.state))
        ) {
          const payload = { authorizationId: authorization.id };
          await command(
            runId,
            "void",
            payload,
            (actionId) => api.voidAuthorization({ ...payload, actionId }),
            !!voidOp,
          );
        }
        await recordVoid(runId, api);
        return;
      }
      if (allowReplay && ["unknown", "sent"].includes(captureCommand.state)) {
        const payload = captureCommand.payload as {
          authorizationId: string;
          amount: Money;
        };
        const capture = await command(
          runId,
          "capture",
          payload,
          (actionId) => api.capture({ ...payload, actionId }),
          true,
        );
        await recordCapture(runId, capture);
        return;
      }
      throw new Error(
        "Capture outcome is still unknown; no new economic action was issued.",
      );
    }
    if (!run.payment.authorizationId) {
      if (order.authorizationIds.length === 1) {
        await tx((db) => {
          db.runs[runId]!.payment.authorizationId = order.authorizationIds[0]!;
          db.runs[runId]!.status = "verifying";
        });
      } else {
        const op = state.commands.authorize;
        if (
          allowReplay &&
          order.status === "APPROVED" &&
          run.approvalRequestedAt &&
          (!op || ["unknown", "sent"].includes(op.state))
        ) {
          const authorized = await command(
            runId,
            "authorize",
            { orderId: order.id },
            (actionId) => api.authorize({ orderId: order.id, actionId }),
            !!op,
          );
          if (authorized.authorizationIds.length !== 1)
            throw new Error("Authorization remains unconfirmed.");
          await tx((db) => {
            db.runs[runId]!.payment.authorizationId =
              authorized.authorizationIds[0]!;
            db.runs[runId]!.status = "verifying";
          });
        } else return;
      }
      run = await tx((db) => structuredClone(db.runs[runId]!));
    }
    const voidCommand = live(run).commands.void;
    if (voidCommand) {
      const authorization = await api.getAuthorization(
        run.payment.authorizationId!,
      );
      if (authorization.status === "VOIDED") {
        await recordVoid(runId, api);
        return;
      }
      if (
        allowReplay &&
        ["unknown", "sent"].includes(voidCommand.state) &&
        !["CAPTURED", "PARTIALLY_CAPTURED"].includes(authorization.status)
      ) {
        const payload = voidCommand.payload as { authorizationId: string };
        await command(
          runId,
          "void",
          payload,
          (actionId) => api.voidAuthorization({ ...payload, actionId }),
          true,
        );
      }
      await recordVoid(runId, api);
      return;
    }
    // A verified webhook may observe state, but never initiates capture or void.
    if (allowReplay && run.payment.authorizationId)
      await gateAndSettle(runId, api);
  }
  async function processJobs() {
    config();
    const leaseToken = randomUUID();
    const job = await tx((db) => {
      const now = clock().getTime();
      for (const run of Object.values(db.runs).filter(
        (r) => r.mode === "sandbox",
      )) {
        const state = live(run);
        if (state.lease && Date.parse(state.lease.until) > now) return null;
        if (state.lease && Date.parse(state.lease.until) <= now) {
          delete state.lease;
          if (
            [
              "shopping",
              "creating_order",
              "authorizing",
              "verifying",
              "capturing",
              "voiding",
            ].includes(run.status)
          ) {
            run.status = Object.keys(state.commands).length
              ? "reconciling"
              : "infra_failed";
            run.merchantToken = null;
            pushEvent(
              run,
              timestamp(),
              "Worker lease expired",
              "No result was invented. Persisted provider commands require reconciliation.",
            );
          }
        }
      }
      const run = Object.values(db.runs)
        .filter(
          (r) =>
            r.mode === "sandbox" &&
            (["queued", "approved"].includes(r.status) ||
              ((live(r).pendingWebhook ||
                (r.status === "reconciling" &&
                  live(r).reconcileAttempts < 12)) &&
                (!live(r).lastReconciledAt ||
                  now - Date.parse(live(r).lastReconciledAt!) >= 15_000))),
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      if (!run) return null;
      const action =
        run.status === "queued"
          ? "shop"
          : run.status === "approved"
            ? "authorize"
            : "reconcile";
      const allowReplay =
        run.status === "reconciling" &&
        !live(run).pendingWebhook &&
        live(run).reconcileAttempts < 12;
      const workerExecution = executionProvenance();
      const executions = (run.workerExecutions ?? []) as ReturnType<
        typeof executionProvenance
      >[];
      if (
        !executions.some((entry) => sha256(entry) === sha256(workerExecution))
      )
        executions.push(workerExecution);
      run.workerExecutions = executions;
      live(run).lease = {
        token: leaseToken,
        until: new Date(now + 5 * 60_000).toISOString(),
      };
      live(run).pendingWebhook = false;
      if (action === "shop") run.status = "shopping";
      if (action === "authorize") run.status = "authorizing";
      return { id: run.id, action, allowReplay };
    });
    if (!job) return { processed: false };
    try {
      if (job.action === "shop") await shopAndCreate(job.id);
      else if (job.action === "authorize") await authorizeAndSettle(job.id);
      else await reconcile(job.id, job.allowReplay);
    } catch (error) {
      await tx((db) => {
        const run = db.runs[job.id]!;
        if (["shopping", "creating_order"].includes(run.status)) {
          run.status = "infra_failed";
          run.merchantToken = null;
        }
        if (
          ["authorizing", "verifying", "capturing", "voiding"].includes(
            run.status,
          )
        )
          run.status = "reconciling";
        pushEvent(run, timestamp(), "Run stopped safely", safeError(error));
      });
    } finally {
      await tx((db) => {
        const run = db.runs[job.id]!;
        const state = live(run);
        if (state.lease?.token === leaseToken) delete state.lease;
        if (state.reconcileAttempts >= 12 && run.status === "reconciling") {
          run.status = "inconclusive";
          run.decision = {
            verdict: "REVIEW",
            reason:
              "Automatic reconciliation is exhausted. The last observed provider payment status is preserved; manual reconciliation is required.",
          };
          pushEvent(
            run,
            timestamp(),
            "Reconciliation limit reached",
            "No paid or voided outcome was invented, and no new payment action was created.",
          );
        }
      });
    }
    return { processed: true, runId: job.id };
  }
  async function recover(runId: string, owner: string) {
    const original = await owned(runId, owner);
    return start({ id: original.contract.id }, "none", owner, runId);
  }
  async function cancel(runId: string, owner: string) {
    config();
    return tx((db) => {
      const run = db.runs[runId];
      if (!run || run.owner !== owner || run.mode !== "sandbox")
        throw new Error("Run not found.");
      if (run.status === "canceled") return publicRun(run);
      if (!["queued", "awaiting_approval"].includes(run.status))
        throw new Error(
          "This run may have an active authorization; reconcile it before cancellation.",
        );
      run.status = "canceled";
      run.merchantToken = null;
      pushEvent(
        run,
        timestamp(),
        "Buyer canceled",
        "No authorization or capture was requested by COMRDY.",
      );
      return publicRun(run);
    });
  }
  async function webhook(
    rawBody: string,
    headers: Headers | Record<string, string | undefined>,
  ) {
    config();
    const api = provider();
    if (
      !(await api.verifyWebhook({
        rawBody,
        headers,
        webhookId: process.env.PAYPAL_WEBHOOK_ID!,
      }))
    )
      throw new Error("Webhook signature verification failed.");
    const event = z
      .object({
        id: z.string().min(1),
        event_type: z.string().min(1),
        resource: z
          .object({
            id: z.string().optional(),
            supplementary_data: z
              .object({
                related_ids: z
                  .object({
                    order_id: z.string().optional(),
                    authorization_id: z.string().optional(),
                  })
                  .optional(),
              })
              .optional(),
          })
          .passthrough(),
      })
      .parse(JSON.parse(rawBody));
    const receipt = await tx((db) => {
      if (db.webhooks[event.id] === true)
        return { duplicate: true as const, runId: null };
      db.webhooks[event.id] = false;
      const related = event.resource.supplementary_data?.related_ids;
      const run = Object.values(db.runs).find(
        (r) =>
          r.mode === "sandbox" &&
          [r.payment.orderId, r.payment.authorizationId, r.payment.captureId]
            .filter(Boolean)
            .some(
              (id) =>
                id === event.resource.id ||
                id === related?.order_id ||
                id === related?.authorization_id,
            ),
      );
      if (run) {
        run.lastWebhookAt = timestamp();
        pushEvent(
          run,
          timestamp(),
          "Verified PayPal webhook",
          event.event_type,
        );
        if (
          live(run).commands.capture ||
          live(run).commands.void ||
          live(run).commands.authorize
        )
          live(run).pendingWebhook = true;
      }
      db.webhooks[event.id] = true;
      return { duplicate: false as const, runId: run?.id ?? null };
    });
    // Durable receipt is acknowledged promptly. The worker retrieves provider truth later.
    return { accepted: true, ...receipt };
  }
  return {
    compile,
    start,
    approve,
    recover,
    cancel,
    processJobs,
    webhook,
    reconcile,
  };
}

const service = createSandboxService();
export const sandboxCompile = service.compile;
export const sandboxStart = service.start;
export const sandboxApprove = service.approve;
export const sandboxRecover = service.recover;
export const sandboxCancel = service.cancel;
export const processSandboxJobs = service.processJobs;
export const sandboxWebhook = service.webhook;
