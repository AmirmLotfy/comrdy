import { z } from "zod";
import {
  createCanonicalContract,
  createCanonicalState,
  FIXTURE_TIMESTAMP,
} from "./fixtures";
import { immutableCopy, sha256 } from "./hash";
import {
  evaluateContract,
  evaluatePaymentGate,
  readPath,
  sealSnapshot,
} from "./invariants";
import type {
  GateDecision,
  InvariantEvaluation,
  JsonObject,
  JsonValue,
  PaymentGateInput,
  PaymentGateResult,
  VerificationResult,
} from "./types";

export const READINESS_SCHEMA_VERSION = "1.0" as const;
export const READINESS_CLOCK = "2026-11-01T00:00:01.000Z";
const STALE_CLOCK = "2026-10-31T23:54:59.000Z";

export type ReadinessCategory =
  "Intent" | "Evidence" | "Payment binding" | "Composed";

export interface ReadinessScenario {
  id: string;
  title: string;
  category: ReadinessCategory;
  description: string;
  expectedContract: GateDecision;
  expectedGate: GateDecision;
  expectedReasonCodes: readonly string[];
}

/** Test expectations are independent of the engine's computed results. */
export const READINESS_SCENARIOS: readonly ReadinessScenario[] = immutableCopy([
  {
    id: "baseline",
    title: "Matching checkout",
    category: "Intent",
    description:
      "Blue M, one item, $148 delivered; all synthetic evidence agrees.",
    expectedContract: "ALLOW",
    expectedGate: "ALLOW",
    expectedReasonCodes: [],
  },
  {
    id: "budget-boundary",
    title: "Exactly on budget",
    category: "Intent",
    description: "Shipping raises the delivered total to exactly $160.00.",
    expectedContract: "ALLOW",
    expectedGate: "ALLOW",
    expectedReasonCodes: [],
  },
  {
    id: "budget-one-cent",
    title: "One cent over budget",
    category: "Intent",
    description:
      "A $160.01 delivered total exceeds the confirmed limit by one cent.",
    expectedContract: "DENY",
    expectedGate: "DENY",
    expectedReasonCodes: ["INVARIANT_FAILED"],
  },
  {
    id: "variant",
    title: "Size substitution",
    category: "Intent",
    description:
      "The checkout contains S instead of the approved M; substitution is recorded.",
    expectedContract: "DENY",
    expectedGate: "DENY",
    expectedReasonCodes: ["INVARIANT_FAILED"],
  },
  {
    id: "quantity",
    title: "Quantity changed",
    category: "Intent",
    description:
      "Quantity changes from one to two while the quote is held constant to isolate the rule.",
    expectedContract: "DENY",
    expectedGate: "DENY",
    expectedReasonCodes: ["INVARIANT_FAILED"],
  },
  {
    id: "currency",
    title: "Currency changed",
    category: "Intent",
    description:
      "Merchant and synthetic provider both say EUR; the approved budget is USD.",
    expectedContract: "DENY",
    expectedGate: "DENY",
    expectedReasonCodes: ["VALUE_CURRENCY_CHANGED"],
  },
  {
    id: "subscription",
    title: "Subscription enabled",
    category: "Intent",
    description:
      "A forbidden subscription flag appears. No subscription API is used.",
    expectedContract: "DENY",
    expectedGate: "DENY",
    expectedReasonCodes: ["INVARIANT_FAILED"],
  },
  {
    id: "inventory",
    title: "Stock unavailable",
    category: "Intent",
    description:
      "The controlled inventory fact changes from available to unavailable.",
    expectedContract: "DENY",
    expectedGate: "DENY",
    expectedReasonCodes: ["INVARIANT_FAILED"],
  },
  {
    id: "missing-total",
    title: "Delivered total missing",
    category: "Evidence",
    description:
      "The total is omitted, not explicitly observed absent. Missing evidence requires review.",
    expectedContract: "REVIEW",
    expectedGate: "REVIEW",
    expectedReasonCodes: ["EVIDENCE_MISSING", "PAYMENT_TOTAL_UNKNOWN"],
  },
  {
    id: "stale-evidence",
    title: "Evidence too old",
    category: "Evidence",
    description:
      "Matching merchant facts are older than the gate's five-minute evidence window.",
    expectedContract: "ALLOW",
    expectedGate: "REVIEW",
    expectedReasonCodes: ["EVIDENCE_STALE"],
  },
  {
    id: "stale-revision",
    title: "Checkout revision changed",
    category: "Payment binding",
    description:
      "The snapshot is revision 2; the expected payment binding still references revision 1.",
    expectedContract: "ALLOW",
    expectedGate: "DENY",
    expectedReasonCodes: ["CHECKOUT_REVISION_CHANGED"],
  },
  {
    id: "authorization-mismatch",
    title: "Authorization mismatch",
    category: "Payment binding",
    description:
      "The synthetic authorization ID differs from the one bound to this attempt.",
    expectedContract: "ALLOW",
    expectedGate: "DENY",
    expectedReasonCodes: ["PAYMENT_BINDING_MISMATCH"],
  },
]);

const ComposerSchema = z
  .object({
    totalMinor: z.number().int().min(13800).max(25000),
    size: z.enum(["M", "S"]),
    quantity: z.union([z.literal(1), z.literal(2)]),
    evidence: z.enum(["complete", "missing-total", "stale"]),
  })
  .strict();
export type ReadinessComposer = z.infer<typeof ComposerSchema>;
export const DEFAULT_READINESS_COMPOSER: Readonly<ReadinessComposer> =
  Object.freeze({
    totalMinor: 14800,
    size: "M",
    quantity: 1,
    evidence: "complete",
  });

export type ReadinessRequest =
  | { schemaVersion: typeof READINESS_SCHEMA_VERSION; mode: "suite" }
  | {
      schemaVersion: typeof READINESS_SCHEMA_VERSION;
      mode: "compare";
      composer: ReadinessComposer;
    };

export class ReadinessInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReadinessInputError";
  }
}

/** Only this finite input surface is exposed by the public read-only endpoint. */
export function parseReadinessQuery(query: URLSearchParams): ReadinessRequest {
  if (query.toString().length > 512)
    throw new ReadinessInputError("Readiness query is too long.");
  const seen = new Set<string>();
  for (const [key] of query) {
    if (seen.has(key))
      throw new ReadinessInputError("Repeated query fields are not allowed.");
    seen.add(key);
  }
  if (query.get("schema") !== READINESS_SCHEMA_VERSION)
    throw new ReadinessInputError("Use readiness schema 1.0.");
  const mode = query.get("mode");
  if (mode !== "suite" && mode !== "compare")
    throw new ReadinessInputError("Choose suite or compare mode.");
  const allowed =
    mode === "suite"
      ? ["schema", "mode"]
      : ["schema", "mode", "totalMinor", "size", "quantity", "evidence"];
  if ([...seen].some((key) => !allowed.includes(key)))
    throw new ReadinessInputError(
      "This endpoint only accepts the documented readiness fields.",
    );
  if (mode === "suite")
    return { schemaVersion: READINESS_SCHEMA_VERSION, mode };
  const rawTotal = query.get("totalMinor") ?? "";
  if (!/^\d{5}$/.test(rawTotal))
    throw new ReadinessInputError(
      "Delivered total must be integer cents from 13800 to 25000.",
    );
  const parsed = ComposerSchema.safeParse({
    totalMinor: Number(rawTotal),
    size: query.get("size"),
    quantity:
      query.get("quantity") === "1"
        ? 1
        : query.get("quantity") === "2"
          ? 2
          : null,
    evidence: query.get("evidence"),
  });
  if (!parsed.success)
    throw new ReadinessInputError(
      "Use $138–$250, size M or S, quantity 1 or 2, and complete, missing-total or stale evidence.",
    );
  return {
    schemaVersion: READINESS_SCHEMA_VERSION,
    mode,
    composer: parsed.data,
  };
}

export interface ReadinessFact extends InvariantEvaluation {
  sourceText: string | null;
  sourceKind: "confirmed mandate" | "catalog policy";
  provenance: {
    kind: "synthetic fixture";
    snapshotId: string;
    snapshotHash: string;
    revision: string;
    observedAt: string;
  };
}

export interface ReadinessChange {
  path: string;
  baseline: JsonValue | null;
  actual: JsonValue | null;
}

export interface ReadinessResult {
  id: string;
  title: string;
  category: ReadinessCategory;
  description: string;
  expectation: {
    contract: GateDecision;
    gate: GateDecision;
    reasonCodes: readonly string[];
  } | null;
  matchedExpectation: boolean | null;
  contract: VerificationResult;
  gate: PaymentGateResult;
  facts: ReadinessFact[];
  changes: ReadinessChange[];
  input: PaymentGateInput;
  inputHash: string;
  captureExecuted: false;
  authorizationResolved: false;
}

export interface ReadinessReport {
  schemaVersion: typeof READINESS_SCHEMA_VERSION;
  mode: ReadinessRequest["mode"];
  evidenceKind: "deterministic-synthetic";
  evaluatedAt: string;
  contractHash: string;
  summary: {
    definedCases: number;
    executedCases: number;
    checkedExpectations: number;
    matchedExpectations: number;
    allow: number;
    deny: number;
    review: number;
  };
  boundary: {
    providerCalls: 0;
    paymentActions: 0;
    merchantOrdersCreated: 0;
    providerQualification: "not executed";
    certification: false;
    clock: "fixed test clock";
  };
  reproduction: {
    request: ReadinessRequest;
    path: string;
    command: string;
    engine: "src/core/invariants.ts";
    scope: "Reproduces synthetic inputs and decisions; does not attest provider or merchant truth.";
  };
  results: ReadinessResult[];
  reportHash: string;
}

function object(value: JsonValue | undefined): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Readiness fixture structure changed.");
  return value;
}

function setTotal(state: JsonObject, totalMinor: number, currency = "USD") {
  // The fixture's item and tax stay fixed; shipping supplies the bounded difference.
  state.pricing = {
    subtotal: { amountMinor: 12900, currency },
    shipping: { amountMinor: totalMinor - 13800, currency },
    tax: { amountMinor: 900, currency },
    discount: { amountMinor: 0, currency },
    total: { amountMinor: totalMinor, currency },
  };
}

function setSize(state: JsonObject, size: "M" | "S") {
  const variant = object(state.variant);
  variant.id = `ocean-shell-blue-${size.toLowerCase()}`;
  variant.sku = `NP-OS-BLU-${size}`;
  object(variant.attributes).size = size;
  object(state.policy).substitutionOccurred = size !== "M";
}

function createInput(
  id: string,
  composer?: ReadinessComposer,
): PaymentGateInput {
  const state = structuredClone(createCanonicalState());
  let totalMinor = composer?.totalMinor ?? 14800;
  let currency = "USD";
  let revision = "1";
  let observedAt = FIXTURE_TIMESTAMP;
  if (id === "budget-boundary") totalMinor = 16000;
  if (id === "budget-one-cent") totalMinor = 16001;
  if (id === "currency") currency = "EUR";
  setTotal(state, totalMinor, currency);
  if (id === "variant" || composer?.size === "S") setSize(state, "S");
  if (id === "quantity" || composer?.quantity === 2) state.quantity = 2;
  if (id === "subscription") object(state.subscription).enabled = true;
  if (id === "inventory") object(state.inventory).available = false;
  if (id === "missing-total" || composer?.evidence === "missing-total")
    delete object(state.pricing).total;
  if (id === "stale-evidence" || composer?.evidence === "stale")
    observedAt = STALE_CLOCK;
  if (id === "stale-revision") revision = "2";
  const caseId = `synthetic-readiness-${id}`;
  return {
    contract: createCanonicalContract(
      FIXTURE_TIMESTAMP,
      "synthetic-readiness-contract",
    ),
    snapshot: sealSnapshot({
      id: `synthetic-readiness-snapshot-${id}`,
      caseId,
      revision,
      checkpoint: "AUTHORIZED",
      observedAt,
      state,
    }),
    provider: {
      environment: "sandbox",
      caseId,
      orderId: "SYNTHETIC-ORDER",
      authorizationId:
        id === "authorization-mismatch"
          ? "SYNTHETIC-OTHER-AUTH"
          : "SYNTHETIC-AUTH",
      payeeId: "SYNTHETIC-PAYEE",
      authorizationStatus: "CREATED",
      orderAmount: { amountMinor: totalMinor, currency },
      authorizedAmount: { amountMinor: totalMinor, currency },
      orderAuthorizationLinked: true,
      observedAt: FIXTURE_TIMESTAMP,
      expiresAt: "2026-11-29T00:00:00.000Z",
    },
    expected: {
      caseId,
      revision: "1",
      orderId: "SYNTHETIC-ORDER",
      authorizationId: "SYNTHETIC-AUTH",
      payeeId: "SYNTHETIC-PAYEE",
    },
    evaluatedAt: READINESS_CLOCK,
  };
}

const CHANGE_PATHS = [
  ["variant.attributes.size", "snapshot.state.variant.attributes.size"],
  ["policy.substitutionOccurred", "snapshot.state.policy.substitutionOccurred"],
  ["quantity", "snapshot.state.quantity"],
  ["pricing.total", "snapshot.state.pricing.total"],
  ["subscription.enabled", "snapshot.state.subscription.enabled"],
  ["inventory.available", "snapshot.state.inventory.available"],
  ["snapshot.revision", "snapshot.revision"],
  ["snapshot.observedAt", "snapshot.observedAt"],
  ["provider.authorizationId", "provider.authorizationId"],
] as const;

function executeCase(
  scenario: Pick<
    ReadinessScenario,
    "id" | "title" | "category" | "description"
  >,
  input: PaymentGateInput,
  expectation: ReadinessResult["expectation"],
): ReadinessResult {
  // Both decisions are computed by the same production engine used by the lab.
  const contract = evaluateContract(input.contract, input.snapshot);
  const gate = evaluatePaymentGate(input);
  const baseline = createInput("baseline");
  const changes = CHANGE_PATHS.flatMap(([path, inputPath]) => {
    const before = readPath(baseline, inputPath) ?? null;
    const after = readPath(input, inputPath) ?? null;
    return sha256(before) === sha256(after)
      ? []
      : [{ path, baseline: before, actual: after }];
  });
  const facts: ReadinessFact[] = contract.evaluations.map((evaluation) => {
    const constraint = input.contract.constraints.find(
      (item) => item.id === evaluation.invariantId,
    )!;
    return {
      ...evaluation,
      sourceText: constraint.sourceText,
      sourceKind:
        constraint.sourceText === null ? "catalog policy" : "confirmed mandate",
      provenance: {
        kind: "synthetic fixture",
        snapshotId: input.snapshot.id,
        snapshotHash: input.snapshot.hash,
        revision: input.snapshot.revision,
        observedAt: input.snapshot.observedAt,
      },
    };
  });
  return immutableCopy({
    ...scenario,
    expectation,
    matchedExpectation:
      expectation === null
        ? null
        : contract.decision === expectation.contract &&
          gate.decision === expectation.gate &&
          expectation.reasonCodes.every((code) =>
            gate.reasons.some((reason) => reason.code === code),
          ),
    contract,
    gate,
    facts,
    changes,
    input,
    inputHash: sha256(input),
    captureExecuted: false,
    authorizationResolved: false,
  });
}

function report(
  request: ReadinessRequest,
  results: ReadinessResult[],
): ReadinessReport {
  const params = new URLSearchParams({
    schema: READINESS_SCHEMA_VERSION,
    mode: request.mode,
  });
  if (request.mode === "compare") {
    for (const [key, value] of Object.entries(request.composer))
      params.set(key, String(value));
  }
  const path = `/readiness/run?${params.toString()}`;
  const payload: Omit<ReadinessReport, "reportHash"> = {
    schemaVersion: READINESS_SCHEMA_VERSION,
    mode: request.mode,
    evidenceKind: "deterministic-synthetic",
    evaluatedAt: READINESS_CLOCK,
    contractHash: results[0]!.input.contract.hash,
    summary: {
      definedCases: request.mode === "suite" ? READINESS_SCENARIOS.length : 2,
      executedCases: results.length,
      checkedExpectations: results.filter((item) => item.expectation !== null)
        .length,
      matchedExpectations: results.filter(
        (item) => item.matchedExpectation === true,
      ).length,
      allow: results.filter((item) => item.gate.decision === "ALLOW").length,
      deny: results.filter((item) => item.gate.decision === "DENY").length,
      review: results.filter((item) => item.gate.decision === "REVIEW").length,
    },
    boundary: {
      providerCalls: 0,
      paymentActions: 0,
      merchantOrdersCreated: 0,
      providerQualification: "not executed",
      certification: false,
      clock: "fixed test clock",
    },
    reproduction: {
      request,
      path,
      command: `curl --fail-with-body 'http://127.0.0.1:3000${path}'`,
      engine: "src/core/invariants.ts",
      scope:
        "Reproduces synthetic inputs and decisions; does not attest provider or merchant truth.",
    },
    results,
  };
  return immutableCopy({ ...payload, reportHash: sha256(payload) });
}

export function runReadinessSuite(): ReadinessReport {
  const results = READINESS_SCENARIOS.map((scenario) =>
    executeCase(scenario, createInput(scenario.id), {
      contract: scenario.expectedContract,
      gate: scenario.expectedGate,
      reasonCodes: scenario.expectedReasonCodes,
    }),
  );
  return report(
    { schemaVersion: READINESS_SCHEMA_VERSION, mode: "suite" },
    results,
  );
}

export function compareReadiness(input: unknown): ReadinessReport {
  const parsed = ComposerSchema.safeParse(input);
  if (!parsed.success)
    throw new ReadinessInputError(
      "The comparison must use the bounded readiness composer fields.",
    );
  const baseline = READINESS_SCENARIOS[0]!;
  const results = [
    executeCase(baseline, createInput("baseline"), {
      contract: "ALLOW",
      gate: "ALLOW",
      reasonCodes: [],
    }),
    executeCase(
      {
        id: "composed",
        title: "Your what-if checkout",
        category: "Composed",
        description:
          "Bounded synthetic changes are evaluated together under the unchanged confirmed contract.",
      },
      createInput("composed", parsed.data),
      null,
    ),
  ];
  return report(
    {
      schemaVersion: READINESS_SCHEMA_VERSION,
      mode: "compare",
      composer: parsed.data,
    },
    results,
  );
}

export function executeReadinessRequest(
  request: ReadinessRequest,
): ReadinessReport {
  if (request.schemaVersion !== READINESS_SCHEMA_VERSION)
    throw new ReadinessInputError("Use readiness schema 1.0.");
  if (request.mode === "suite") return runReadinessSuite();
  if (request.mode === "compare") return compareReadiness(request.composer);
  throw new ReadinessInputError("Choose suite or compare mode.");
}
