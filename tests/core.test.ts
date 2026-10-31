import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_MANDATE,
  createCanonicalCandidate,
  createCanonicalContract,
  createCanonicalSnapshot,
  createCanonicalState,
  FIXTURE_TIMESTAMP,
} from "../src/core/fixtures";
import {
  assertCaptureBinding,
  buildLineage,
  confirmContract,
  evaluateContract,
  evaluatePaymentGate,
  sealSnapshot,
  validateCandidate,
  verifyContractHash,
  verifySnapshotHash,
} from "../src/core/invariants";
import { canonicalJson, sha256, stableRequestId } from "../src/core/hash";
import type {
  ContractCandidate,
  JsonObject,
  Money,
  PaymentGateInput,
  ProviderCheckpoint,
} from "../src/core/types";
import {
  fromPayPalMoney,
  PAYPAL_SANDBOX_BASE,
  PayPalError,
  PayPalSandboxAdapter,
  toPayPalMoney,
} from "../src/providers/paypal";
import {
  createSandboxService,
  WEBHOOK_RECEIPT_LIMIT,
  WEBHOOK_RECEIPT_RETENTION_MS,
} from "../src/server/sandbox";
import { publicRun } from "../src/server/store";
import type {
  Database,
  transaction as StoreTransaction,
} from "../src/server/store";

const NOW = "2026-11-01T00:00:01.000Z";
function provider(
  overrides: Partial<ProviderCheckpoint> = {},
): ProviderCheckpoint {
  return {
    environment: "sandbox",
    caseId: "case-m01",
    orderId: "ORDER123",
    authorizationId: "AUTH123",
    payeeId: "MERCHANT123",
    authorizationStatus: "CREATED",
    orderAmount: { amountMinor: 14800, currency: "USD" },
    authorizedAmount: { amountMinor: 14800, currency: "USD" },
    orderAuthorizationLinked: true,
    observedAt: FIXTURE_TIMESTAMP,
    expiresAt: "2026-11-29T00:00:00.000Z",
    ...overrides,
  };
}
function gate(overrides: Partial<PaymentGateInput> = {}): PaymentGateInput {
  return {
    contract: createCanonicalContract(),
    snapshot: createCanonicalSnapshot(),
    provider: provider(),
    expected: {
      caseId: "case-m01",
      revision: "1",
      orderId: "ORDER123",
      authorizationId: "AUTH123",
      payeeId: "MERCHANT123",
    },
    evaluatedAt: NOW,
    ...overrides,
  };
}
function snapshotWith(state: JsonObject) {
  return sealSnapshot({
    id: "test-snapshot",
    caseId: "case-m01",
    revision: "1",
    checkpoint: "AUTHORIZED",
    observedAt: FIXTURE_TIMESTAMP,
    state,
  });
}
function mutableState(): JsonObject {
  return JSON.parse(JSON.stringify(createCanonicalState()));
}

test("canonical $148 fixture satisfies a confirmed $160 delivered cap", () => {
  const input = gate();
  assert.equal(input.contract.mandate, CANONICAL_MANDATE);
  assert.equal(evaluatePaymentGate(input).decision, "ALLOW");
  assert.equal(
    input.snapshot.state.pricing &&
      (input.snapshot.state.pricing as JsonObject).total &&
      ((input.snapshot.state.pricing as JsonObject).total as Money).amountMinor,
    14800,
  );
});

test("shipping fault is $173 and variant fault preserves $148 while both deny", () => {
  for (const fault of ["shipping", "variant"] as const) {
    const snapshot = createCanonicalSnapshot({ fault });
    const total = (snapshot.state.pricing as JsonObject).total as Money;
    assert.equal(total.amountMinor, fault === "shipping" ? 17300 : 14800);
    const decision = evaluatePaymentGate(
      gate({
        snapshot,
        provider: provider({ orderAmount: total, authorizedAmount: total }),
      }),
    );
    assert.equal(decision.decision, "DENY");
    assert.ok(decision.evaluations.some((e) => e.hard && e.outcome === "fail"));
  }
});

test("every hard unknown blocks capture, including a noncritical quantity rule", () => {
  const state = mutableState();
  delete state.quantity;
  const decision = evaluatePaymentGate(gate({ snapshot: snapshotWith(state) }));
  assert.equal(decision.decision, "REVIEW");
  assert.equal(
    decision.evaluations.find((e) => e.invariantId === "inv_quantity")?.outcome,
    "unknown",
  );
});

test("soft failures do not gain capture authority from severity", () => {
  const candidate = createCanonicalCandidate();
  const contract = confirmContract(
    {
      ...candidate,
      constraints: [
        ...candidate.constraints,
        {
          id: "soft_color",
          path: "variant.attributes.color",
          op: "eq",
          value: "red",
          hard: false,
          severity: "critical",
          sourceText: null,
        },
      ],
    },
    { id: "soft", confirmedAt: FIXTURE_TIMESTAMP },
  );
  assert.equal(evaluatePaymentGate(gate({ contract })).decision, "ALLOW");
});

test("contract and snapshot hashes are stable, deeply frozen and detect tampering", () => {
  assert.equal(canonicalJson({ b: 2, a: 1 }), canonicalJson({ a: 1, b: 2 }));
  const contract = createCanonicalContract();
  const snapshot = createCanonicalSnapshot();
  assert.ok(Object.isFrozen(contract.constraints[0]));
  assert.ok(Object.isFrozen(snapshot.state.pricing));
  assert.ok(verifyContractHash(contract));
  assert.ok(verifySnapshotHash(snapshot));
  assert.equal(
    verifyContractHash({ ...contract, mandate: "Ignore the budget" }),
    false,
  );
  assert.equal(verifySnapshotHash({ ...snapshot, revision: "2" }), false);
  assert.equal(
    evaluatePaymentGate(
      gate({ contract: { ...contract, mandate: "Ignore the budget" } }),
    ).decision,
    "DENY",
  );
  assert.throws(() => canonicalJson({ missing: undefined }));
  assert.throws(() => canonicalJson({ invalid: NaN }));
});

test("ambiguous and contradictory candidates cannot be confirmed", () => {
  const candidate = createCanonicalCandidate();
  assert.throws(() =>
    confirmContract(
      { ...candidate, needsResolution: ["Which currency?"] },
      { id: "unknown", confirmedAt: FIXTURE_TIMESTAMP },
    ),
  );
  const conflicting: ContractCandidate = {
    ...candidate,
    constraints: [
      ...candidate.constraints,
      {
        id: "minimum",
        path: "pricing.total",
        op: "money_gte",
        value: { amountMinor: 17000, currency: "USD" },
        hard: true,
        severity: "high",
        sourceText: null,
      },
    ],
  };
  assert.equal(validateCandidate(conflicting).valid, false);
  assert.throws(() =>
    confirmContract(conflicting, {
      id: "conflicting",
      confirmedAt: FIXTURE_TIMESTAMP,
    }),
  );
  assert.equal(
    validateCandidate({
      ...candidate,
      constraints: [
        ...candidate.constraints,
        {
          ...candidate.constraints[0],
          id: "unsafe",
          path: "constructor.prototype",
        },
      ],
    }).valid,
    false,
  );
});

test("missing evidence never proves not_exists, explicit observed absence does", () => {
  const candidate = createCanonicalCandidate();
  const contract = confirmContract(
    {
      ...candidate,
      constraints: [
        ...candidate.constraints,
        {
          id: "absent",
          path: "subscription.plan",
          op: "not_exists",
          value: true,
          hard: true,
          severity: "low",
          sourceText: null,
        },
      ],
    },
    { id: "absence", confirmedAt: FIXTURE_TIMESTAMP },
  );
  assert.equal(
    evaluateContract(contract, createCanonicalSnapshot()).decision,
    "REVIEW",
  );
  const { hash: _hash, ...input } = createCanonicalSnapshot();
  const observedAbsent = sealSnapshot({
    ...input,
    absentPaths: ["subscription.plan"],
  });
  assert.equal(evaluateContract(contract, observedAbsent).decision, "ALLOW");
});

test("integer cap is inclusive and stays failed when the total increases", () => {
  for (const amountMinor of [15999, 16000, 16001, 17300]) {
    const state = mutableState();
    (state.pricing as JsonObject).total = { amountMinor, currency: "USD" };
    assert.equal(
      evaluateContract(createCanonicalContract(), snapshotWith(state)).decision,
      amountMinor <= 16000 ? "ALLOW" : "DENY",
    );
  }
});

test("currency, IDs, revision, merchant, linkage, pending and duplicate states fail closed", () => {
  const variants: Partial<PaymentGateInput>[] = [
    {
      provider: provider({
        authorizedAmount: { amountMinor: 14800, currency: "EUR" },
      }),
    },
    { provider: provider({ orderId: "OTHER" }) },
    { provider: provider({ authorizationId: "OTHER" }) },
    { provider: provider({ payeeId: "OTHER" }) },
    { provider: provider({ orderAuthorizationLinked: false }) },
    { provider: provider({ authorizationStatus: "PENDING" }) },
    { provider: provider({ authorizationStatus: "CAPTURED" }) },
    { snapshot: createCanonicalSnapshot({ revision: "2" }) },
    { alreadyCaptured: true },
    { capturePending: true },
    { provider: null },
    {
      provider: provider({
        authorizedAmount: { amountMinor: 14799, currency: "USD" },
      }),
    },
    { evaluatedAt: "2026-11-01T00:06:01.000Z" },
    { provider: provider({ expiresAt: NOW }) },
    { provider: provider({ observedAt: "2026-11-01T00:01:00.000Z" }) },
  ];
  for (const variant of variants)
    assert.notEqual(
      evaluatePaymentGate(gate(variant)).decision,
      "ALLOW",
      JSON.stringify(variant),
    );
});

test("capture decision binds exact contract, snapshot, provider and operation identities", () => {
  const input = gate();
  const decision = evaluatePaymentGate(input);
  const binding = {
    decision,
    contract: input.contract,
    snapshot: input.snapshot,
    provider: input.provider!,
    expected: input.expected,
    now: NOW,
  };
  assert.deepEqual(assertCaptureBinding(binding), {
    amountMinor: 14800,
    currency: "USD",
  });
  assert.throws(() =>
    assertCaptureBinding({
      ...binding,
      expected: { ...input.expected, revision: "2" },
    }),
  );
  assert.throws(() =>
    assertCaptureBinding({
      ...binding,
      snapshot: createCanonicalSnapshot({ fault: "variant" }),
    }),
  );
  assert.throws(() =>
    assertCaptureBinding({ ...binding, now: "2026-11-01T00:02:00.000Z" }),
  );
  assert.throws(() =>
    assertCaptureBinding({
      ...binding,
      decision: {
        ...decision,
        binding: {
          ...decision.binding,
          amount: { amountMinor: 1, currency: "USD" },
        },
      },
    }),
  );
});

test("lineage identifies first divergence rather than every propagated failure", () => {
  const snapshots = [
    createCanonicalSnapshot({ id: "selected", checkpoint: "SELECTED" }),
    createCanonicalSnapshot({
      id: "cart",
      checkpoint: "CART",
      fault: "variant",
    }),
    createCanonicalSnapshot({
      id: "auth",
      checkpoint: "AUTHORIZED",
      fault: "variant",
    }),
  ];
  const size = buildLineage(createCanonicalContract(), snapshots).find(
    (line) => line.invariantId === "inv_size",
  );
  assert.equal(size?.firstDriftSnapshotId, "cart");
  assert.equal(size?.origin, "transition");
});

test("provider keys are stable, distinct per operation and fit conservative UUID limits", () => {
  const id = stableRequestId("capture", "economic-action-1");
  assert.equal(id, stableRequestId("capture", "economic-action-1"));
  assert.notEqual(id, stableRequestId("void", "economic-action-1"));
  assert.equal(id.length, 36);
  assert.match(id, /^[a-f0-9-]+$/);
  assert.equal(
    sha256({ first: 1, second: 2 }),
    sha256({ second: 2, first: 1 }),
  );
});

test("PayPal money uses exact minor-unit decimal conversion and rejects invalid currency", () => {
  assert.deepEqual(toPayPalMoney({ amountMinor: 14801, currency: "USD" }), {
    value: "148.01",
    currency_code: "USD",
  });
  assert.deepEqual(fromPayPalMoney({ value: "148.01", currency_code: "USD" }), {
    amountMinor: 14801,
    currency: "USD",
  });
  assert.throws(() =>
    fromPayPalMoney({ value: "1.001", currency_code: "USD" }),
  );
  assert.throws(() => fromPayPalMoney({ value: "1.00", currency_code: "EUR" }));
  assert.throws(() => toPayPalMoney({ amountMinor: 0, currency: "USD" }));
});

test("capture sends exact amount and final_capture with the same ID on explicit retries", async () => {
  const requests: { url: string; init: RequestInit }[] = [];
  const fakeFetch: typeof fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (String(url).endsWith("/oauth2/token"))
      return Response.json({
        access_token: "test-token",
        token_type: "Bearer",
        expires_in: 3600,
      });
    return Response.json({
      id: "CAPTURE123",
      status: "COMPLETED",
      amount: { value: "148.00", currency_code: "USD" },
      final_capture: true,
    });
  };
  const adapter = new PayPalSandboxAdapter({
    clientId: "test",
    clientSecret: "test-secret",
    fetch: fakeFetch,
  });
  const input = {
    authorizationId: "AUTH123",
    amount: { amountMinor: 14800, currency: "USD" },
    actionId: "action-1",
  };
  await adapter.capture(input);
  await adapter.capture(input);
  assert.equal(requests.length, 3);
  for (const req of requests)
    assert.ok(req.url.startsWith(PAYPAL_SANDBOX_BASE));
  const [first, second] = requests.slice(1);
  assert.deepEqual(JSON.parse(first!.init.body as string), {
    amount: { value: "148.00", currency_code: "USD" },
    final_capture: true,
    invoice_id: "action-1",
  });
  assert.equal(
    new Headers(first!.init.headers).get("PayPal-Request-Id"),
    new Headers(second!.init.headers).get("PayPal-Request-Id"),
  );
});

test("a timed-out capture remains unknown and is never automatically retried", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async (url) => {
    calls++;
    if (String(url).endsWith("/oauth2/token"))
      return Response.json({
        access_token: "test-token",
        token_type: "Bearer",
        expires_in: 3600,
      });
    throw new Error("network failed after request sent");
  };
  const adapter = new PayPalSandboxAdapter({
    clientId: "test",
    clientSecret: "test-secret",
    fetch: fakeFetch,
  });
  await assert.rejects(
    adapter.capture({
      authorizationId: "AUTH123",
      amount: { amountMinor: 14800, currency: "USD" },
      actionId: "action-1",
    }),
    (error: unknown) => error instanceof PayPalError && error.outcomeUnknown,
  );
  assert.equal(calls, 2);
});

test("provider PENDING is retained rather than converted to completed", async () => {
  const fakeFetch: typeof fetch = async (url) =>
    String(url).endsWith("/oauth2/token")
      ? Response.json({
          access_token: "t",
          token_type: "Bearer",
          expires_in: 3600,
        })
      : Response.json({
          id: "C1",
          status: "PENDING",
          amount: { value: "148.00", currency_code: "USD" },
          final_capture: true,
        });
  const adapter = new PayPalSandboxAdapter({
    clientId: "test",
    clientSecret: "secret",
    fetch: fakeFetch,
  });
  assert.equal(
    (
      await adapter.capture({
        authorizationId: "A1",
        amount: { amountMinor: 14800, currency: "USD" },
        actionId: "action-1",
      })
    ).status,
    "PENDING",
  );
});

test("webhook signature verification preserves original event and rejects arbitrary certificate hosts", async () => {
  let body = "";
  let calls = 0;
  const fakeFetch: typeof fetch = async (url, init = {}) => {
    calls++;
    if (String(url).endsWith("/oauth2/token"))
      return Response.json({
        access_token: "t",
        token_type: "Bearer",
        expires_in: 3600,
      });
    body = init.body as string;
    return Response.json({ verification_status: "SUCCESS" });
  };
  const adapter = new PayPalSandboxAdapter({
    clientId: "test",
    clientSecret: "secret",
    fetch: fakeFetch,
  });
  const rawBody =
    '{ "id": "WH-1", "event_type": "PAYMENT.CAPTURE.COMPLETED", "resource": {} }';
  const headers = {
    "paypal-cert-url":
      "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1",
    "paypal-transmission-id": "tx-1",
    "paypal-transmission-time": NOW,
    "paypal-transmission-sig": "test-signature",
    "paypal-auth-algo": "SHA256withRSA",
  };
  assert.equal(
    await adapter.verifyWebhook({ rawBody, headers, webhookId: "WHCONFIG1" }),
    true,
  );
  assert.ok(body.includes(`"webhook_event":${rawBody}`));
  assert.equal(
    await adapter.verifyWebhook({
      rawBody,
      headers: {
        ...headers,
        "paypal-cert-url": "https://127.0.0.1/v1/notifications/certs/CERT-1",
      },
      webhookId: "WHCONFIG1",
    }),
    false,
  );
  assert.equal(calls, 2);
});

async function withSandboxEnvironment(body: () => Promise<void>) {
  const settings = {
    APP_MODE: "sandbox",
    PAYPAL_ENV: "sandbox",
    PAYPAL_CLIENT_ID: "mock-client",
    PAYPAL_CLIENT_SECRET: "mock-secret",
    PAYPAL_WEBHOOK_ID: "MOCKWH",
    PAYPAL_MERCHANT_ID: "MERCHANT123",
    OPENAI_API_KEY: "mock-ai",
    KERNEL_API_KEY: "mock-browser",
    DATABASE_URL: "postgres://mock.invalid/test",
    APP_URL: "https://comrdy.test",
    RUN_ACCESS_CODE: "test-access",
  };
  const original = Object.fromEntries(
    Object.keys(settings).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, settings);
  try {
    await body();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function sandboxHarness(
  options: {
    captureTimeout?: "before" | "after";
    capturePending?: boolean;
    captureRejected?: boolean;
    voidRejected?: boolean;
    shopperFails?: boolean;
    changeBeforeCapture?: boolean;
  } = {},
) {
  const contract = createCanonicalContract();
  const db: Database = {
    contracts: {
      [contract.id]: {
        owner: "owner",
        contract,
        compiler: { model: "mock-model", responseId: "mock-response" },
      },
    },
    runs: {},
    webhooks: {},
  };
  let time = new Date(NOW);
  let orderCase = "";
  let authorizationStatus: ProviderCheckpoint["authorizationStatus"] =
    "CREATED";
  let authorized = false;
  let captured = false;
  let changedBeforeCapture = false;
  const dispatched: Partial<
    Record<"create" | "authorize" | "capture" | "void", Database>
  > = {};
  const calls = {
    create: 0,
    authorize: 0,
    capture: 0,
    void: 0,
    captureActionIds: [] as string[],
  };
  const captureResult = {
    id: "CAPTURE123",
    status: options.capturePending
      ? ("PENDING" as const)
      : ("COMPLETED" as const),
    amount: { amountMinor: 14800, currency: "USD" },
    orderId: "ORDER123",
    authorizationId: "AUTH123",
    finalCapture: true,
  };
  const order = () => ({
    id: "ORDER123",
    status: authorized ? "COMPLETED" : "APPROVED",
    intent: "AUTHORIZE",
    amount: { amountMinor: 14800, currency: "USD" },
    payeeId: "MERCHANT123",
    customId: orderCase,
    referenceId: "1",
    authorizationIds: authorized ? ["AUTH123"] : [],
    captureIds: captured ? ["CAPTURE123"] : [],
    approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER123",
  });
  const fakeProvider = {
    async createOrder(input: { caseId: string }) {
      dispatched.create ??= structuredClone(db);
      calls.create++;
      orderCase = input.caseId;
      authorized = false;
      captured = false;
      authorizationStatus = "CREATED";
      return order();
    },
    async getOrder() {
      return order();
    },
    async authorize() {
      dispatched.authorize ??= structuredClone(db);
      calls.authorize++;
      authorized = true;
      return order();
    },
    async getAuthorization() {
      return {
        id: "AUTH123",
        status: authorizationStatus,
        amount: { amountMinor: 14800, currency: "USD" },
        orderId: "ORDER123",
        payeeId: "MERCHANT123",
        expiresAt: "2026-11-29T00:00:00.000Z",
      };
    },
    async capture(input: { actionId: string }) {
      dispatched.capture ??= structuredClone(db);
      calls.capture++;
      calls.captureActionIds.push(input.actionId);
      if (options.captureTimeout === "before" && calls.capture === 1)
        throw new PayPalError(
          "mock timeout",
          "PROVIDER_NETWORK_ERROR",
          null,
          true,
        );
      if (options.captureRejected)
        throw new PayPalError("Rejected capture", "CAPTURE_DENIED", 422, false);
      captured = true;
      authorizationStatus = "CAPTURED";
      if (options.captureTimeout === "after" && calls.capture === 1)
        throw new PayPalError(
          "mock timeout",
          "PROVIDER_NETWORK_ERROR",
          null,
          true,
        );
      return captureResult;
    },
    async getCapture() {
      return captureResult;
    },
    async voidAuthorization() {
      dispatched.void ??= structuredClone(db);
      calls.void++;
      if (options.voidRejected)
        throw new PayPalError("Rejected void", "VOID_DENIED", 422, false);
      authorizationStatus = "VOIDED";
    },
    async getCheckpoint() {
      return provider({
        caseId: orderCase,
        authorizationStatus,
        observedAt: time.toISOString(),
      });
    },
    async verifyWebhook() {
      return true;
    },
  };
  const transact: typeof StoreTransaction = async (fn) => {
    const result = await fn(db);
    // Inject a committed merchant mutation between verification and the atomic capture claim.
    if (options.changeBeforeCapture && !changedBeforeCapture) {
      const run = Object.values(db.runs).find(
        (candidate) =>
          candidate.status === "capturing" &&
          !(candidate.live as { commands: Record<string, unknown> }).commands
            .capture,
      );
      if (run) {
        const cart = run.merchant as {
          size: string;
          revision: number;
          state: JsonObject;
        };
        cart.size = "S";
        cart.revision++;
        cart.state = structuredClone(createCanonicalState("variant"));
        changedBeforeCapture = true;
      }
    }
    return result === undefined ? result : structuredClone(result);
  };
  const service = createSandboxService({
    transaction: transact,
    now: () => time,
    providerFactory: () => fakeProvider,
    shopper: async (input) => {
      if (options.shopperFails) throw new Error("Real browser failed");
      await input.onEvent("Agent action", "review_checkout");
      db.runs[input.runId]!.merchant = {
        size: "M",
        totalMinor: 14800,
        revision: 1,
        source: "Mock merchant server",
        state: structuredClone(createCanonicalState()),
      };
      return {
        size: "M",
        totalText: "$148.00",
        screenshotFile: "mock.png",
        source: "Mock browser observation",
        model: "mock-model",
        promptVersion: "shopper-v1",
      };
    },
  });
  return {
    db,
    contract,
    service,
    calls,
    fakeProvider,
    dispatched,
    rewindAfterAuthorization: () => {
      captured = false;
      authorizationStatus = "CREATED";
      calls.capture = 0;
      calls.void = 0;
    },
    restart: () =>
      createSandboxService({
        transaction: transact,
        now: () => time,
        providerFactory: () => fakeProvider,
        shopper: async () => {
          throw new Error("Restart must reconcile, not reshop");
        },
      }),
    setCaptureStatus: (status: "PENDING" | "COMPLETED") => {
      captureResult.status = status;
    },
    setAuthorizationStatus: (
      status: ProviderCheckpoint["authorizationStatus"],
    ) => {
      authorizationStatus = status;
    },
    advance: (milliseconds: number) => {
      time = new Date(time.getTime() + milliseconds);
    },
  };
}

test("sandbox approval queues work and repeated callbacks cannot duplicate capture or merchant order", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness();
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    assert.equal(created.status, "queued");
    await h.service.processJobs();
    const run = h.db.runs[created.id]!;
    assert.equal(run.status, "awaiting_approval");
    assert.equal(h.calls.authorize, 0);
    await h.service.approve(created.id, "owner", "ORDER123");
    await h.service.approve(created.id, "owner", "ORDER123");
    assert.equal(run.status, "approved");
    assert.equal(h.calls.authorize, 0);
    await h.service.processJobs();
    assert.equal(run.status, "completed");
    assert.equal(h.calls.capture, 1);
    const merchantOrder = structuredClone(run.merchantOrder);
    await h.service.approve(created.id, "owner", "ORDER123");
    await h.service.processJobs();
    assert.equal(h.calls.capture, 1);
    assert.deepEqual(run.merchantOrder, merchantOrder);
    assert.equal(
      (run.evidence as Record<string, unknown>).captureEvidence !== undefined,
      true,
    );
    assert.equal(
      (run.compiler as Record<string, unknown>).responseId,
      "mock-response",
    );
  }));

test("late variant and shipping faults issue zero captures and require provider-confirmed void", async () =>
  withSandboxEnvironment(async () => {
    for (const fault of ["variant", "shipping"] as const) {
      const h = sandboxHarness();
      const created = await h.service.start(
        { id: h.contract.id },
        fault,
        "owner",
      );
      await h.service.processJobs();
      await h.service.approve(created.id, "owner");
      await h.service.processJobs();
      const run = h.db.runs[created.id]!;
      assert.equal(run.status, "blocked");
      assert.equal(run.decision.verdict, "DENY");
      assert.equal(run.payment.status, "VOIDED");
      assert.equal(h.calls.capture, 0);
      assert.equal(h.calls.void, 1);
      assert.equal(run.merchantOrder, undefined);
      assert.ok((run.evidence as Record<string, unknown>).voidEvidence);
      const recovery = await h.service.recover(created.id, "owner");
      assert.equal(recovery.parentId, created.id);
      await assert.rejects(h.service.recover(created.id, "owner"));
    }
  }));

test("sandbox browser failure never falls back to a fixture payment", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness({ shopperFails: true });
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    assert.equal(h.db.runs[created.id]!.status, "infra_failed");
    assert.equal(h.calls.create, 0);
    assert.equal(h.calls.authorize, 0);
    assert.equal(h.calls.capture, 0);
  }));

test("unknown capture after provider success reconciles without another capture request", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness({ captureTimeout: "after" });
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(created.id, "owner");
    await h.service.processJobs();
    assert.equal(h.db.runs[created.id]!.status, "reconciling");
    await h.service.processJobs();
    assert.equal(h.db.runs[created.id]!.status, "completed");
    assert.equal(h.calls.capture, 1);
  }));

test("unknown capture before provider processing permits one retry with the exact persisted action ID", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness({ captureTimeout: "before" });
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(created.id, "owner");
    await h.service.processJobs();
    await h.service.processJobs();
    assert.equal(h.db.runs[created.id]!.status, "completed");
    assert.equal(h.calls.capture, 2);
    assert.equal(h.calls.captureActionIds[0], h.calls.captureActionIds[1]);
  }));

test("worker resumes a crash after approval was queued but before authorization dispatch", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness();
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(created.id, "owner");
    const run = h.db.runs[created.id]!;
    run.status = "authorizing";
    (run.live as { lease?: unknown }).lease = {
      token: "dead-worker",
      until: FIXTURE_TIMESTAMP,
    };
    await h.service.processJobs();
    assert.equal(run.status, "completed");
    assert.equal(h.calls.authorize, 1);
    assert.equal(h.calls.capture, 1);
  }));

test("verified webhooks deduplicate and never regress an active financial lease", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness();
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(created.id, "owner");
    await h.service.processJobs();
    const run = h.db.runs[created.id]!;
    run.status = "capturing";
    (run.live as { lease?: unknown }).lease = {
      token: "active-worker",
      until: "2026-11-01T00:05:00.000Z",
    };
    const raw = JSON.stringify({
      id: "WH-1",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: "CAPTURE123" },
    });
    const first = await h.service.webhook(raw, {});
    const second = await h.service.webhook(raw, {});
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(run.status, "capturing");
    assert.equal((await h.service.processJobs()).processed, false);
    assert.equal(h.calls.capture, 1);
  }));

test("recovery completes the unchanged confirmed contract and cannot start a second correction", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness();
    const first = await h.service.start(
      { id: h.contract.id },
      "variant",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(first.id, "owner");
    await h.service.processJobs();
    const recovery = await h.service.recover(first.id, "owner");
    assert.deepEqual(
      h.db.runs[recovery.id]!.contract,
      h.db.runs[first.id]!.contract,
    );
    await h.service.processJobs();
    await h.service.approve(recovery.id, "owner");
    await h.service.processJobs();
    const corrected = h.db.runs[recovery.id]!;
    assert.equal(corrected.status, "completed");
    assert.equal(h.calls.capture, 1);
    assert.equal(corrected.contract.hash, h.contract.hash);
    assert.equal((corrected.merchantOrder as { size: string }).size, "M");
    assert.deepEqual((corrected.merchantOrder as { amount: Money }).amount, {
      amountMinor: 14800,
      currency: "USD",
    });
    await assert.rejects(h.service.recover(first.id, "owner"), /one recovery/);
    await assert.rejects(
      h.service.recover(recovery.id, "owner"),
      /safely blocked original/,
    );
  }));

test("a failed correction consumes the single recovery attempt without weakening the contract", async () =>
  withSandboxEnvironment(async () => {
    const options = { shopperFails: false };
    const h = sandboxHarness(options);
    const first = await h.service.start(
      { id: h.contract.id },
      "shipping",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(first.id, "owner");
    await h.service.processJobs();
    const recovery = await h.service.recover(first.id, "owner");
    options.shopperFails = true;
    await h.service.processJobs();
    assert.equal(h.db.runs[recovery.id]!.status, "infra_failed");
    assert.equal(h.calls.capture, 0);
    assert.deepEqual(
      h.db.runs[recovery.id]!.contract,
      h.db.runs[first.id]!.contract,
    );
    await assert.rejects(h.service.recover(first.id, "owner"), /one recovery/);
    await assert.rejects(
      h.service.recover(recovery.id, "owner"),
      /safely blocked original/,
    );
  }));

test("a checkout mutation after the gate is rejected atomically before capture and then voided", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness({ changeBeforeCapture: true });
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(created.id, "owner");
    await h.service.processJobs();
    const run = h.db.runs[created.id]!;
    assert.equal(run.status, "reconciling");
    assert.equal(h.calls.capture, 0);
    assert.equal(
      (run.live as { commands: Record<string, unknown> }).commands.capture,
      undefined,
    );
    await h.service.processJobs();
    assert.equal(run.status, "blocked");
    assert.equal(run.payment.status, "VOIDED");
    assert.equal(h.calls.capture, 0);
    assert.equal(h.calls.void, 1);
    assert.equal(run.merchantOrder, undefined);
  }));

test("exhausted pending reconciliation becomes inconclusive while preserving provider payment truth", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness({ capturePending: true });
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(created.id, "owner");
    await h.service.processJobs();
    const run = h.db.runs[created.id]!;
    assert.equal(run.status, "reconciling");
    assert.equal(run.payment.status, "PENDING");
    (run.live as { reconcileAttempts: number }).reconcileAttempts = 11;
    await h.service.processJobs();
    assert.equal(run.status, "inconclusive");
    assert.equal(run.payment.status, "PENDING");
    assert.equal(run.merchantOrder, undefined);
    assert.equal(h.calls.capture, 1);
    assert.equal((await h.service.processJobs()).processed, false);
  }));

test("merchant divergence known before authorization is rejected without an authorization request", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness();
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    const run = h.db.runs[created.id]!;
    run.merchant = {
      size: "S",
      totalMinor: 14800,
      revision: 2,
      source: "Mock merchant server",
      state: structuredClone(createCanonicalState("variant")),
    };
    await h.service.approve(created.id, "owner");
    await h.service.processJobs();
    assert.equal(run.status, "blocked");
    assert.equal(h.calls.authorize, 0);
    assert.equal(h.calls.capture, 0);
    assert.equal(h.calls.void, 0);
  }));

test("cancellation is idempotent before authorization and cannot abandon a financial operation", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness();
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    await h.service.cancel(created.id, "owner");
    await h.service.cancel(created.id, "owner");
    assert.equal(h.db.runs[created.id]!.status, "canceled");
    assert.equal(h.calls.authorize, 0);
    const second = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(second.id, "owner");
    await assert.rejects(
      h.service.cancel(second.id, "owner"),
      /active authorization/,
    );
  }));

test("definitive capture rejection keeps the authorization unresolved until confirmed void", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness({ captureRejected: true });
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(created.id, "owner");
    await h.service.processJobs();
    const run = h.db.runs[created.id]!;
    assert.equal(run.status, "reconciling");
    assert.equal(run.payment.status, "AUTHORIZED");
    await assert.rejects(
      h.service.start({ id: h.contract.id }, "none", "owner"),
      /reconcile/,
    );
    await h.service.processJobs();
    assert.equal(run.status, "payment_failed");
    assert.equal(run.payment.status, "VOIDED");
    assert.equal(run.decision.verdict, "ALLOW");
    assert.equal(h.calls.capture, 1);
    assert.equal(h.calls.void, 1);
    assert.equal(run.merchantOrder, undefined);
    await h.service.start({ id: h.contract.id }, "none", "owner");
  }));

test("definitive void rejection is read back without retrying and blocks another economic attempt", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness({ voidRejected: true });
    const created = await h.service.start(
      { id: h.contract.id },
      "variant",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(created.id, "owner");
    await h.service.processJobs();
    const run = h.db.runs[created.id]!;
    assert.equal(run.status, "reconciling");
    await h.service.processJobs();
    assert.equal(run.payment.status, "CREATED");
    assert.equal(run.status, "reconciling");
    assert.equal(h.calls.capture, 0);
    assert.equal(h.calls.void, 1);
    // The unresolved-resource guard also protects older infra_failed records.
    run.status = "infra_failed";
    await assert.rejects(
      h.service.start({ id: h.contract.id }, "none", "owner"),
      /reconcile/,
    );
    run.status = "reconciling";
    (run.live as { reconcileAttempts: number }).reconcileAttempts = 11;
    h.advance(16_000);
    await h.service.processJobs();
    assert.equal(run.status, "inconclusive");
    h.setAuthorizationStatus("VOIDED");
    h.advance(16_000);
    await h.service.webhook(
      JSON.stringify({
        id: "WH-late-void",
        event_type: "PAYMENT.AUTHORIZATION.VOIDED",
        resource: { id: "AUTH123" },
      }),
      {},
    );
    await h.service.processJobs();
    assert.equal(run.status, "blocked");
    assert.equal(run.payment.status, "VOIDED");
    assert.equal(h.calls.void, 1);
  }));

test("a late verified webhook performs read-only reconciliation after periodic budget exhaustion", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness({ capturePending: true });
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(created.id, "owner");
    await h.service.processJobs();
    const run = h.db.runs[created.id]!;
    (run.live as { reconcileAttempts: number }).reconcileAttempts = 11;
    await h.service.processJobs();
    assert.equal(run.status, "inconclusive");
    h.setCaptureStatus("COMPLETED");
    h.advance(16_000);
    const notification = JSON.stringify({
      id: "WH-late-capture",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: "CAPTURE123" },
    });
    await h.service.webhook(notification, {});
    await h.service.processJobs();
    assert.equal(run.status, "completed");
    assert.equal(run.payment.status, "COMPLETED");
    assert.equal(run.decision.verdict, "ALLOW");
    assert.doesNotMatch(run.decision.reason, /manual reconciliation/);
    assert.equal((run.workerExecutions as unknown[]).length, 1);
    assert.equal(
      (run.merchantOrder as { captureId: string }).captureId,
      "CAPTURE123",
    );
    assert.equal(h.calls.capture, 1);
    assert.equal(h.calls.void, 0);
    assert.equal((await h.service.webhook(notification, {})).duplicate, true);
    assert.equal((await h.service.processJobs()).processed, false);
  }));

for (const boundary of ["create", "authorize", "capture", "void"] as const) {
  test(`worker restart restores durable ${boundary} dispatch before result installation`, async () =>
    withSandboxEnvironment(async () => {
      const h = sandboxHarness();
      const created = await h.service.start(
        { id: h.contract.id },
        boundary === "void" ? "variant" : "none",
        "owner",
      );
      await h.service.processJobs();
      if (boundary !== "create") {
        await h.service.approve(created.id, "owner");
        await h.service.processJobs();
      }
      const checkpoint = h.dispatched[boundary]!;
      assert.ok(
        checkpoint,
        "Durable dispatch checkpoint exists before provider I/O",
      );
      const before = checkpoint.runs[created.id]!;
      const sent = (
        before.live as {
          commands: Record<string, { state: string; requestId: string }>;
        }
      ).commands[boundary]!;
      assert.equal(sent.state, "sent");
      const requestId = sent.requestId;
      h.db.runs = structuredClone(checkpoint.runs);
      if (boundary === "authorize") h.rewindAfterAuthorization();
      h.advance(301_000);
      const restarted = h.restart();
      await restarted.processJobs();
      const restored = h.db.runs[created.id]!;
      assert.equal(
        (restored.live as { commands: Record<string, { requestId: string }> })
          .commands[boundary]!.requestId,
        requestId,
      );
      assert.ok(!["infra_failed", "inconclusive"].includes(restored.status));
      if (boundary === "create") {
        assert.equal(restored.status, "awaiting_approval");
        assert.equal(h.calls.authorize, 0);
        assert.equal(h.calls.capture, 0);
      } else if (boundary === "void") {
        assert.equal(restored.payment.status, "VOIDED");
        assert.equal(h.calls.void, 1);
        assert.equal(h.calls.capture, 0);
        assert.equal(restored.merchantOrder, undefined);
      } else {
        assert.equal(restored.payment.status, "COMPLETED");
        assert.equal(h.calls.capture, 1);
        assert.equal(h.calls.authorize, 1);
        assert.equal(
          (restored.merchantOrder as { captureId: string }).captureId,
          "CAPTURE123",
        );
      }
    }));
}

test("early verified authorization notification associates after provider IDs are installed", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness();
    const raw = JSON.stringify({
      id: "WH-early-auth",
      event_type: "PAYMENT.AUTHORIZATION.CREATED",
      resource: {
        id: "AUTH123",
        payer: { email_address: "private-buyer@example.invalid" },
        shipping: { address: "PRIVATE ADDRESS" },
      },
    });
    assert.deepEqual(await h.service.webhook(raw, {}), {
      accepted: true,
      duplicate: false,
      runId: null,
    });
    assert.equal(h.db.webhooks["WH-early-auth"], false);
    assert.equal((await h.service.webhook(raw, {})).duplicate, true);
    assert.equal(h.db.webhooks["WH-early-auth"], false);
    assert.deepEqual(
      Object.keys(h.db.webhookReceipts!["WH-early-auth"]).sort(),
      ["authorizationId", "eventType", "orderId", "receivedAt", "resourceId"],
    );
    assert.doesNotMatch(
      JSON.stringify(h.db.webhookReceipts),
      /private-buyer|PRIVATE ADDRESS|payer|shipping/,
    );
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(created.id, "owner");
    await h.service.processJobs();
    assert.equal(
      h.db.webhooks["WH-early-auth"],
      false,
      "Authorization response installed after that scan",
    );
    const beforeCalls = structuredClone(h.calls);
    await h.service.processJobs();
    const run = h.db.runs[created.id]!;
    assert.equal(h.db.webhooks["WH-early-auth"], true);
    assert.equal(
      run.events.filter((event) => event.title === "Verified PayPal webhook")
        .length,
      1,
    );
    assert.equal(run.payment.status, "COMPLETED");
    assert.deepEqual(
      h.calls,
      beforeCalls,
      "Association only retrieved existing provider truth",
    );
    assert.equal((await h.service.webhook(raw, {})).duplicate, true);
    assert.equal((await h.service.processJobs()).processed, false);
  }));

test("redelivery can associate an unmatched order event without authorizing or settling payment", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness();
    const raw = JSON.stringify({
      id: "WH-early-order",
      event_type: "CHECKOUT.ORDER.APPROVED",
      resource: { id: "ORDER123" },
    });
    await h.service.webhook(raw, {});
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    const second = await h.service.webhook(raw, {});
    assert.equal(second.duplicate, true);
    assert.equal(second.runId, created.id);
    const run = h.db.runs[created.id]!;
    assert.equal(run.status, "awaiting_approval");
    assert.equal(
      (run.live as { pendingWebhook?: boolean }).pendingWebhook,
      true,
    );
    await h.service.processJobs();
    assert.equal(run.status, "awaiting_approval");
    assert.equal(run.approvalRequestedAt, undefined);
    assert.equal(h.calls.authorize, 0);
    assert.equal(h.calls.capture, 0);
    assert.equal(h.calls.void, 0);
    assert.deepEqual(Object.keys((run.live as { commands: object }).commands), [
      "create",
    ]);
    await h.service.webhook(raw, {});
    assert.equal((await h.service.processJobs()).processed, false);
    assert.equal(
      run.events.filter((event) => event.title === "Verified PayPal webhook")
        .length,
      1,
    );
  }));

test("out-of-order notifications never replace retrieved payment truth or issue economic commands", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness();
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    await h.service.approve(created.id, "owner");
    await h.service.processJobs();
    const beforeCalls = structuredClone(h.calls);
    const beforeCommands = structuredClone(
      (h.db.runs[created.id]!.live as { commands: object }).commands,
    );
    for (const [id, eventType, resourceId] of [
      ["WH-older-pending", "PAYMENT.CAPTURE.PENDING", "CAPTURE123"],
      ["WH-older-created", "PAYMENT.AUTHORIZATION.CREATED", "AUTH123"],
      ["WH-conflicting-void", "PAYMENT.AUTHORIZATION.VOIDED", "AUTH123"],
    ]) {
      const raw = JSON.stringify({
        id,
        event_type: eventType,
        resource: { id: resourceId },
      });
      await h.service.webhook(raw, {});
      assert.equal((await h.service.webhook(raw, {})).duplicate, true);
    }
    await h.service.processJobs();
    const run = h.db.runs[created.id]!;
    assert.equal(run.payment.status, "COMPLETED");
    assert.equal(run.status, "completed");
    assert.equal(run.payment.captureId, "CAPTURE123");
    assert.equal(
      run.events.filter((event) => event.title === "Verified PayPal webhook")
        .length,
      3,
    );
    assert.deepEqual(h.calls, beforeCalls);
    assert.deepEqual(
      (run.live as { commands: object }).commands,
      beforeCommands,
    );
  }));

test("verified webhook receipt and dedupe retention are bounded and expire together", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness();
    h.db.webhookReceipts = {};
    for (let i = 0; i < WEBHOOK_RECEIPT_LIMIT + 3; i++) {
      const id = `WH-retained-${i}`;
      h.db.webhookReceipts[id] = {
        eventType: "PAYMENT.AUTHORIZATION.CREATED",
        resourceId: `UNKNOWN-${i}`,
        orderId: null,
        authorizationId: null,
        receivedAt: NOW,
      };
      h.db.webhooks[id] = false;
    }
    h.db.webhookReceipts["WH-expired"] = {
      eventType: "PAYMENT.AUTHORIZATION.CREATED",
      resourceId: "OLD",
      orderId: null,
      authorizationId: null,
      receivedAt: new Date(
        Date.parse(NOW) - WEBHOOK_RECEIPT_RETENTION_MS - 1,
      ).toISOString(),
    };
    h.db.webhooks["WH-expired"] = true;
    await h.service.webhook(
      JSON.stringify({
        id: "WH-new",
        event_type: "PAYMENT.AUTHORIZATION.CREATED",
        resource: { id: "UNKNOWN-NEW" },
      }),
      {},
    );
    assert.equal(
      Object.keys(h.db.webhookReceipts).length,
      WEBHOOK_RECEIPT_LIMIT,
    );
    assert.equal(Object.keys(h.db.webhooks).length, WEBHOOK_RECEIPT_LIMIT);
    assert.equal(h.db.webhookReceipts["WH-expired"], undefined);
    assert.equal(h.db.webhooks["WH-expired"], undefined);
    assert.ok(h.db.webhookReceipts["WH-new"]);
    h.advance(WEBHOOK_RECEIPT_RETENTION_MS + 1);
    await h.service.processJobs();
    assert.deepEqual(h.db.webhookReceipts, {});
    assert.deepEqual(h.db.webhooks, {});
  }));

test("unverified notification cannot enter the unmatched-receipt store", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness();
    h.fakeProvider.verifyWebhook = async () => false;
    await assert.rejects(
      h.service.webhook(
        JSON.stringify({
          id: "WH-invalid",
          event_type: "PAYMENT.CAPTURE.COMPLETED",
          resource: { id: "CAPTURE123" },
        }),
        {},
      ),
      /signature verification failed/,
    );
    assert.equal(h.db.webhookReceipts, undefined);
    assert.deepEqual(h.db.webhooks, {});
    assert.equal(h.calls.capture, 0);
    assert.equal(h.calls.void, 0);
  }));

test("command diagnostics retain sanitized operator correlation privately", async () =>
  withSandboxEnvironment(async () => {
    const h = sandboxHarness();
    h.fakeProvider.createOrder = async () => {
      throw new PayPalError(
        "private buyer raw error body",
        "INSTRUMENT_DECLINED",
        422,
        false,
        null,
        "abc123def456",
        {
          name: "UNPROCESSABLE_ENTITY",
          issueCodes: ["INSTRUMENT_DECLINED", "private-buyer@example.invalid"],
        },
      );
    };
    const created = await h.service.start(
      { id: h.contract.id },
      "none",
      "owner",
    );
    await h.service.processJobs();
    const run = h.db.runs[created.id]!;
    const command = (
      run.live as { commands: { create: { diagnostics: unknown } } }
    ).commands.create;
    assert.deepEqual(command.diagnostics, {
      providerName: "UNPROCESSABLE_ENTITY",
      issueCodes: ["INSTRUMENT_DECLINED"],
      providerDebugId: "abc123def456",
      httpStatus: 422,
    });
    const exposed = JSON.stringify(publicRun(run));
    assert.match(exposed, /INSTRUMENT_DECLINED/);
    assert.doesNotMatch(
      exposed,
      /abc123def456|providerDebugId|diagnostics|private buyer|private-buyer/,
    );
    assert.doesNotMatch(JSON.stringify(command), /private buyer|private-buyer/);
    assert.equal(h.calls.capture, 0);
    assert.equal(h.calls.void, 0);
  }));
