import { canonicalJson, immutableCopy, sha256 } from "./hash";
import { CHECKPOINTS, ContractCandidateSchema, MoneySchema } from "./types";
import type {
  CaptureBindingInput,
  CommerceSnapshot,
  Constraint,
  ContractCandidate,
  IntentContract,
  InvariantEvaluation,
  JsonValue,
  LineageEntry,
  Money,
  PaymentGateInput,
  PaymentGateResult,
  SnapshotInput,
  VerificationResult,
} from "./types";

const FORBIDDEN_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);
const ISO_WITH_ZONE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|([+-])(\d{2}):(\d{2}))$/;
export function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_WITH_ZONE.exec(value);
  if (!match) return false;
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= days[month - 1]! &&
    Number(match[4]) <= 23 &&
    Number(match[5]) <= 59 &&
    Number(match[6]) <= 59 &&
    (!match[7] || (Number(match[8]) <= 23 && Number(match[9]) <= 59)) &&
    Number.isFinite(Date.parse(value))
  );
}
function scalar(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}
function money(value: unknown): Money | null {
  const parsed = MoneySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
function sameMoney(a: Money, b: Money) {
  return a.currency === b.currency && a.amountMinor === b.amountMinor;
}

export class ContractValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Contract cannot be confirmed: ${issues.join("; ")}`);
    this.name = "ContractValidationError";
    this.issues = issues;
  }
}

/** Semantic checks are independent of the model and run again at confirmation. */
export function validateCandidate(input: unknown): {
  valid: boolean;
  candidate: ContractCandidate | null;
  issues: string[];
} {
  const parsed = ContractCandidateSchema.safeParse(input);
  if (!parsed.success)
    return {
      valid: false,
      candidate: null,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    };
  const candidate = parsed.data;
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const c of candidate.constraints) {
    if (ids.has(c.id)) issues.push(`Duplicate invariant ID: ${c.id}`);
    ids.add(c.id);
    if (
      c.sourceText !== null &&
      !candidate.mandate
        .trim()
        .replace(/\s+/g, " ")
        .includes(c.sourceText.trim().replace(/\s+/g, " "))
    )
      issues.push(`${c.id}: sourceText is not an exact mandate excerpt`);
    if (c.path.split(".").some((part) => FORBIDDEN_SEGMENTS.has(part)))
      issues.push(`${c.id}: unsafe path`);
    if (c.value === null) {
      if (!candidate.needsResolution.length)
        issues.push(`${c.id}: unresolved value requires needsResolution`);
      continue;
    }
    if (["eq", "neq", "bool_eq", "eq_ci"].includes(c.op) && !scalar(c.value))
      issues.push(`${c.id}: scalar value required`);
    if (c.op === "bool_eq" && typeof c.value !== "boolean")
      issues.push(`${c.id}: boolean value required`);
    if (c.op === "eq_ci" && typeof c.value !== "string")
      issues.push(`${c.id}: string value required`);
    if (
      ["in", "not_in"].includes(c.op) &&
      (!Array.isArray(c.value) || !c.value.length)
    )
      issues.push(`${c.id}: nonempty set required`);
    if (["lte", "gte"].includes(c.op) && typeof c.value !== "number")
      issues.push(`${c.id}: numeric value required`);
    if (
      c.op === "between" &&
      (typeof c.value !== "object" ||
        Array.isArray(c.value) ||
        !("min" in c.value) ||
        c.value.min > c.value.max)
    )
      issues.push(`${c.id}: coherent numeric range required`);
    if (c.op.startsWith("money_") && !money(c.value))
      issues.push(`${c.id}: minor-unit money required`);
    if (c.op === "date_lte" && !isTimestamp(c.value))
      issues.push(`${c.id}: date must include an explicit timezone`);
    if (["exists", "not_exists"].includes(c.op) && c.value !== true)
      issues.push(`${c.id}: existence operators use value=true`);
  }
  if (!issues.length) issues.push(...contradictions(candidate.constraints));
  return { valid: issues.length === 0, candidate, issues };
}

function contradictions(constraints: Constraint[]): string[] {
  const issues: string[] = [];
  const paths = [
    ...new Set(constraints.filter((c) => c.hard).map((c) => c.path)),
  ];
  for (const path of paths) {
    const rules = constraints.filter(
      (c) => c.hard && c.path === path && c.value !== null,
    );
    if (
      rules.some((c) => c.op === "exists") &&
      rules.some((c) => c.op === "not_exists")
    )
      issues.push(`${path}: contradictory existence rules`);
    const equals = rules.filter((c) =>
      ["eq", "eq_ci", "bool_eq"].includes(c.op),
    );
    for (const equal of equals) {
      for (const other of rules) {
        if (
          other === equal ||
          ![
            "eq",
            "eq_ci",
            "bool_eq",
            "neq",
            "in",
            "not_in",
            "lte",
            "gte",
            "between",
          ].includes(other.op)
        )
          continue;
        const result = compare(other, equal.value as JsonValue);
        // A case-insensitive equality permits case variants of an exact equality.
        if (
          equal.op === "eq_ci" &&
          other.op === "eq" &&
          typeof equal.value === "string" &&
          typeof other.value === "string" &&
          equal.value.toLowerCase() === other.value.toLowerCase()
        )
          continue;
        if (result.outcome === "fail")
          issues.push(
            `${path}: contradictory hard rules ${equal.id}/${other.id}`,
          );
      }
    }
    for (const category of ["number", "money"] as const) {
      let low = -Infinity;
      let high = Infinity;
      const currencies = new Set<string>();
      for (const rule of rules) {
        if (category === "number") {
          if (rule.op === "gte" && typeof rule.value === "number")
            low = Math.max(low, rule.value);
          if (rule.op === "lte" && typeof rule.value === "number")
            high = Math.min(high, rule.value);
          if (
            rule.op === "between" &&
            rule.value &&
            typeof rule.value === "object" &&
            "min" in rule.value
          ) {
            low = Math.max(low, rule.value.min);
            high = Math.min(high, rule.value.max);
          }
        } else {
          const value = money(rule.value);
          if (!rule.op.startsWith("money_") || !value) continue;
          currencies.add(value.currency);
          if (["money_eq", "money_gte"].includes(rule.op))
            low = Math.max(low, value.amountMinor);
          if (["money_eq", "money_lte"].includes(rule.op))
            high = Math.min(high, value.amountMinor);
        }
      }
      if (low > high || currencies.size > 1)
        issues.push(`${path}: contradictory ${category} bounds`);
    }
    const inclusions = rules
      .filter((c) => c.op === "in")
      .map((c) => c.value as (string | number | boolean)[]);
    if (inclusions.length) {
      const excluded = rules
        .filter((c) => c.op === "not_in")
        .flatMap((c) => c.value as (string | number | boolean)[]);
      const possible = inclusions[0]!.filter(
        (v) =>
          inclusions.every((set) => set.includes(v)) && !excluded.includes(v),
      );
      if (!possible.length) issues.push(`${path}: disjoint hard sets`);
    }
  }
  return [...new Set(issues)];
}

export function confirmContract(
  input: ContractCandidate,
  options: { id: string; version?: number; confirmedAt: string },
): IntentContract {
  const checked = validateCandidate(input);
  const issues = [...checked.issues];
  if (checked.candidate?.needsResolution.length)
    issues.push(
      ...checked.candidate.needsResolution.map(
        (issue) => `Unresolved: ${issue}`,
      ),
    );
  if (!options.id.trim() || options.id.length > 128)
    issues.push("Contract ID is required and must be at most 128 characters");
  if (!Number.isSafeInteger(options.version ?? 1) || (options.version ?? 1) < 1)
    issues.push("Version must be a positive integer");
  if (!isTimestamp(options.confirmedAt))
    issues.push("Confirmation timestamp must include a timezone");
  if (issues.length || !checked.candidate)
    throw new ContractValidationError(issues);
  const payload = {
    ...checked.candidate,
    mandate: checked.candidate.mandate.trim().replace(/\s+/g, " "),
    id: options.id,
    version: options.version ?? 1,
    confirmedAt: options.confirmedAt,
  };
  return immutableCopy({ ...payload, hash: sha256(payload) });
}

export function verifyContractHash(contract: IntentContract): boolean {
  try {
    const { hash, id, version, confirmedAt, ...candidate } = contract;
    const checked = validateCandidate(candidate);
    return (
      checked.valid &&
      !candidate.needsResolution.length &&
      !!id.trim() &&
      Number.isSafeInteger(version) &&
      version > 0 &&
      isTimestamp(confirmedAt) &&
      hash === sha256({ ...candidate, id, version, confirmedAt })
    );
  } catch {
    return false;
  }
}

export function sealSnapshot(input: SnapshotInput): CommerceSnapshot {
  if (
    !input.id.trim() ||
    !input.caseId.trim() ||
    !input.revision.trim() ||
    !CHECKPOINTS.includes(input.checkpoint) ||
    !isTimestamp(input.observedAt)
  )
    throw new TypeError(
      "Snapshot identity, revision, checkpoint and timestamp are required.",
    );
  if (
    !input.state ||
    Array.isArray(input.state) ||
    typeof input.state !== "object"
  )
    throw new TypeError("Snapshot state must be a JSON object.");
  const absentPaths = [...new Set(input.absentPaths ?? [])].sort();
  for (const path of absentPaths) {
    if (
      !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)*$/.test(path) ||
      path.split(".").some((part) => FORBIDDEN_SEGMENTS.has(part))
    )
      throw new TypeError("Invalid absent path.");
    if (readPath(input.state, path) !== undefined)
      throw new TypeError(
        "A snapshot cannot contain a value and claim it is absent.",
      );
  }
  const payload = {
    id: input.id,
    caseId: input.caseId,
    revision: input.revision,
    checkpoint: input.checkpoint,
    observedAt: input.observedAt,
    state: input.state,
    absentPaths,
  };
  return immutableCopy({ ...payload, hash: sha256(payload) });
}

export function verifySnapshotHash(snapshot: CommerceSnapshot): boolean {
  try {
    const { hash, ...payload } = snapshot;
    return hash === sha256(payload) && sealSnapshot(payload).hash === hash;
  } catch {
    return false;
  }
}

export function readPath(state: unknown, path: string): JsonValue | undefined {
  let current: unknown = state;
  for (const part of path.split(".")) {
    if (
      FORBIDDEN_SEGMENTS.has(part) ||
      current === null ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      !Object.hasOwn(current, part)
    )
      return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current as JsonValue | undefined;
}

type Comparison = {
  outcome: "pass" | "fail" | "unknown";
  code: string;
  message: string;
};
function compare(c: Constraint, observed: JsonValue): Comparison {
  const unknown = (
    message = "Evidence is missing or has an incompatible type.",
  ): Comparison => ({ outcome: "unknown", code: "EVIDENCE_UNKNOWN", message });
  const result = (pass: boolean): Comparison => ({
    outcome: pass ? "pass" : "fail",
    code: pass ? "INVARIANT_PASSED" : "INVARIANT_FAILED",
    message: pass
      ? "Observed value satisfies the confirmed constraint."
      : "Observed value violates the confirmed constraint.",
  });
  if (c.value === null || observed === null) return unknown();
  switch (c.op) {
    case "eq":
    case "neq":
      if (
        !scalar(observed) ||
        !scalar(c.value) ||
        typeof observed !== typeof c.value
      )
        return unknown();
      return result(
        c.op === "eq" ? observed === c.value : observed !== c.value,
      );
    case "bool_eq":
      return typeof observed === "boolean" && typeof c.value === "boolean"
        ? result(observed === c.value)
        : unknown();
    case "eq_ci":
      return typeof observed === "string" && typeof c.value === "string"
        ? result(observed.toLowerCase() === c.value.toLowerCase())
        : unknown();
    case "in":
    case "not_in": {
      if (!scalar(observed) || !Array.isArray(c.value)) return unknown();
      const included = c.value.includes(observed);
      return result(c.op === "in" ? included : !included);
    }
    case "lte":
    case "gte":
      if (
        typeof observed !== "number" ||
        !Number.isFinite(observed) ||
        typeof c.value !== "number"
      )
        return unknown();
      return result(c.op === "lte" ? observed <= c.value : observed >= c.value);
    case "between":
      if (
        typeof observed !== "number" ||
        !Number.isFinite(observed) ||
        typeof c.value !== "object" ||
        Array.isArray(c.value) ||
        !("min" in c.value)
      )
        return unknown();
      return result(observed >= c.value.min && observed <= c.value.max);
    case "money_eq":
    case "money_lte":
    case "money_gte": {
      const actual = money(observed),
        expected = money(c.value);
      if (!actual || !expected)
        return unknown("A valid minor-unit amount and currency are required.");
      if (actual.currency !== expected.currency)
        return {
          outcome: "fail",
          code: "VALUE_CURRENCY_CHANGED",
          message: "Observed currency differs from the confirmed currency.",
        };
      return result(
        c.op === "money_eq"
          ? actual.amountMinor === expected.amountMinor
          : c.op === "money_lte"
            ? actual.amountMinor <= expected.amountMinor
            : actual.amountMinor >= expected.amountMinor,
      );
    }
    case "date_lte":
      if (!isTimestamp(observed) || !isTimestamp(c.value))
        return unknown("Dates require explicit timezones.");
      return result(Date.parse(observed) <= Date.parse(c.value));
    case "exists":
      return result(true);
    case "not_exists":
      return result(false);
    default:
      return unknown("Unsupported invariant operator.");
  }
}

export function evaluateInvariant(
  c: Constraint,
  snapshot: CommerceSnapshot,
): InvariantEvaluation {
  const observed = readPath(snapshot.state, c.path);
  let comparison: Comparison;
  if ((snapshot.absentPaths ?? []).includes(c.path)) {
    comparison =
      c.op === "not_exists"
        ? {
            outcome: "pass",
            code: "ABSENCE_CONFIRMED",
            message: "The field was explicitly observed to be absent.",
          }
        : {
            outcome: "fail",
            code: "REQUIRED_VALUE_ABSENT",
            message: "The required field was explicitly observed to be absent.",
          };
  } else if (observed === undefined)
    comparison = {
      outcome: "unknown",
      code: "EVIDENCE_MISSING",
      message: "The field was not observed; omission is not proof of absence.",
    };
  else comparison = compare(c, observed);
  return {
    invariantId: c.id,
    path: c.path,
    op: c.op,
    hard: c.hard,
    severity: c.severity,
    expected: c.value,
    observed: observed ?? null,
    ...comparison,
  };
}

export function evaluateContract(
  contract: IntentContract,
  snapshot: CommerceSnapshot,
): VerificationResult {
  if (!verifyContractHash(contract) || !verifySnapshotHash(snapshot)) {
    return {
      decision: "DENY",
      evaluations: [],
      contractHash: contract?.hash ?? "",
      snapshotHash: snapshot?.hash ?? "",
    };
  }
  const evaluations = contract.constraints.map((c) =>
    evaluateInvariant(c, snapshot),
  );
  const decision = evaluations.some((e) => e.hard && e.outcome === "fail")
    ? "DENY"
    : evaluations.some((e) => e.hard && e.outcome === "unknown")
      ? "REVIEW"
      : "ALLOW";
  return immutableCopy({
    decision,
    evaluations,
    contractHash: contract.hash,
    snapshotHash: snapshot.hash,
  });
}

export function evaluatePaymentGate(
  input: PaymentGateInput,
): PaymentGateResult {
  const { contract, snapshot, provider, expected } = input;
  const verification = evaluateContract(contract, snapshot);
  const reasons: PaymentGateResult["reasons"] = [];
  let hardDeny = verification.decision === "DENY";
  let review = verification.decision === "REVIEW";
  const deny = (code: string, message: string) => {
    hardDeny = true;
    reasons.push({ code, message });
  };
  const unknown = (code: string, message: string) => {
    review = true;
    reasons.push({ code, message });
  };
  if (!verifyContractHash(contract))
    deny(
      "CONTRACT_INTEGRITY_FAILED",
      "The confirmed contract changed or is invalid.",
    );
  if (!verifySnapshotHash(snapshot))
    deny(
      "SNAPSHOT_INTEGRITY_FAILED",
      "The observed snapshot changed or is invalid.",
    );
  for (const result of verification.evaluations.filter(
    (e) => e.hard && e.outcome !== "pass",
  ))
    reasons.push({
      code: result.code,
      message: `${result.invariantId}: ${result.message}`,
    });
  if (
    !contract.constraints.some(
      (c) =>
        c.hard &&
        c.path === "pricing.total" &&
        ["money_lte", "money_eq"].includes(c.op),
    )
  )
    deny(
      "BUDGET_POLICY_REQUIRED",
      "A confirmed hard delivered-total limit is required.",
    );
  if (
    snapshot.caseId !== expected.caseId ||
    snapshot.revision !== expected.revision
  )
    deny(
      "CHECKOUT_REVISION_CHANGED",
      "The case or checkout revision differs from the expected revision.",
    );
  if (snapshot.checkpoint !== "AUTHORIZED")
    deny(
      "AUTHORIZATION_CHECKPOINT_REQUIRED",
      "Capture requires an authorization checkpoint.",
    );
  if (input.alreadyCaptured)
    deny(
      "PAYMENT_DUPLICATE_ATTEMPT",
      "This economic action is already captured.",
    );
  if (input.capturePending)
    unknown(
      "PAYMENT_UNKNOWN_STATE",
      "A previous capture is pending or has an unknown outcome.",
    );
  const total = money(readPath(snapshot.state, "pricing.total"));
  if (!total || total.amountMinor <= 0)
    unknown(
      "PAYMENT_TOTAL_UNKNOWN",
      "A positive, currency-qualified checkout total is required.",
    );
  const components = ["subtotal", "shipping", "tax", "discount"].map((name) =>
    money(readPath(snapshot.state, `pricing.${name}`)),
  );
  if (components.some((value) => !value))
    unknown(
      "PAYMENT_BREAKDOWN_UNKNOWN",
      "Every checkout price component must be observed.",
    );
  else if (total) {
    const [subtotal, shipping, tax, discount] = components as Money[];
    const computed =
      subtotal!.amountMinor +
      shipping!.amountMinor +
      tax!.amountMinor -
      discount!.amountMinor;
    if (
      components.some((value) => value!.currency !== total.currency) ||
      !Number.isSafeInteger(computed) ||
      computed !== total.amountMinor
    )
      deny(
        "PAYMENT_BREAKDOWN_MISMATCH",
        "The checkout price components do not equal its total in one currency.",
      );
  }
  const now = isTimestamp(input.evaluatedAt)
    ? Date.parse(input.evaluatedAt)
    : NaN;
  const maxAge = input.maxEvidenceAgeMs ?? 5 * 60_000;
  if (!Number.isFinite(now) || !Number.isSafeInteger(maxAge) || maxAge <= 0)
    unknown(
      "EVIDENCE_CLOCK_INVALID",
      "A valid clock and evidence age limit are required.",
    );
  function fresh(timestamp: string, source: string) {
    const time = isTimestamp(timestamp) ? Date.parse(timestamp) : NaN;
    if (
      !Number.isFinite(time) ||
      !Number.isFinite(now) ||
      now < time ||
      now - time > maxAge
    )
      unknown(
        "EVIDENCE_STALE",
        `${source} evidence must be current before capture.`,
      );
  }
  fresh(snapshot.observedAt, "Merchant");
  if (!provider)
    unknown(
      "PAYMENT_PROVIDER_UNKNOWN",
      "Provider authorization evidence is missing.",
    );
  else {
    if (provider.environment !== "sandbox")
      deny("SANDBOX_REQUIRED", "Only PayPal Sandbox evidence is allowed.");
    for (const key of [
      "caseId",
      "orderId",
      "authorizationId",
      "payeeId",
    ] as const) {
      if (!expected[key] || provider[key] !== expected[key])
        deny(
          "PAYMENT_BINDING_MISMATCH",
          `Provider ${key} differs from this payment attempt.`,
        );
    }
    if (!provider.orderAuthorizationLinked)
      deny(
        "PAYMENT_AUTHORIZATION_UNLINKED",
        "The provider order does not contain this authorization.",
      );
    if (provider.authorizationStatus === "PENDING")
      unknown(
        "PAYMENT_AUTHORIZATION_PENDING",
        "The provider has not completed authorization.",
      );
    else if (provider.authorizationStatus !== "CREATED")
      deny(
        "PAYMENT_AUTHORIZATION_NOT_CAPTURABLE",
        "The authorization is not available for its first capture.",
      );
    const orderAmount = money(provider.orderAmount),
      authorizedAmount = money(provider.authorizedAmount);
    if (!orderAmount || !authorizedAmount)
      unknown(
        "PAYMENT_AMOUNT_UNKNOWN",
        "Provider amounts are incomplete or malformed.",
      );
    else if (
      total &&
      (!sameMoney(total, orderAmount) || !sameMoney(total, authorizedAmount))
    )
      deny(
        "PAYMENT_AMOUNT_MISMATCH",
        "Checkout, provider order and authorization amounts/currencies must agree exactly.",
      );
    fresh(provider.observedAt, "PayPal");
    if (provider.expiresAt !== null) {
      if (!isTimestamp(provider.expiresAt))
        unknown(
          "PAYMENT_EXPIRY_UNKNOWN",
          "The authorization expiry is malformed.",
        );
      else if (Number.isFinite(now) && Date.parse(provider.expiresAt) <= now)
        deny("PAYMENT_AUTHORIZATION_EXPIRED", "The authorization has expired.");
    }
  }
  const binding = {
    ...expected,
    contractHash: contract.hash,
    snapshotHash: snapshot.hash,
    providerHash: provider ? sha256(provider) : null,
    amount: total,
  };
  const payload = {
    ...verification,
    decision: hardDeny
      ? ("DENY" as const)
      : review
        ? ("REVIEW" as const)
        : ("ALLOW" as const),
    binding,
    evaluatedAt: input.evaluatedAt,
    reasons,
  };
  return immutableCopy({ ...payload, decisionId: sha256(payload) });
}

/** Recheck immediately before a durable capture command is claimed. This is not a signature. */
export function assertCaptureBinding(input: CaptureBindingInput): Money {
  const { decisionId, ...payload } = input.decision;
  if (sha256(payload) !== decisionId || input.decision.decision !== "ALLOW")
    throw new Error("CAPTURE_NOT_ALLOWED: decision is invalid or blocked.");
  const b = input.decision.binding;
  if (
    !verifyContractHash(input.contract) ||
    !verifySnapshotHash(input.snapshot) ||
    b.contractHash !== input.contract.hash ||
    b.snapshotHash !== input.snapshot.hash ||
    b.providerHash !== sha256(input.provider)
  )
    throw new Error(
      "CAPTURE_BINDING_CHANGED: contract, snapshot or provider evidence changed.",
    );
  for (const key of [
    "caseId",
    "revision",
    "orderId",
    "authorizationId",
    "payeeId",
  ] as const)
    if (b[key] !== input.expected[key])
      throw new Error(`CAPTURE_BINDING_CHANGED: ${key} changed.`);
  const now = isTimestamp(input.now) ? Date.parse(input.now) : NaN;
  const at = Date.parse(input.decision.evaluatedAt);
  const maxAge = input.maxDecisionAgeMs ?? 60_000;
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(at) ||
    !Number.isSafeInteger(maxAge) ||
    maxAge <= 0 ||
    now < at ||
    now - at > maxAge
  )
    throw new Error(
      "CAPTURE_DECISION_EXPIRED: evaluate current evidence again.",
    );
  const reevaluated = evaluatePaymentGate({
    contract: input.contract,
    snapshot: input.snapshot,
    provider: input.provider,
    expected: input.expected,
    evaluatedAt: input.now,
  });
  if (
    reevaluated.decision !== "ALLOW" ||
    !b.amount ||
    canonicalJson(b.amount) !== canonicalJson(reevaluated.binding.amount)
  )
    throw new Error("CAPTURE_NOT_ALLOWED: current state fails verification.");
  return immutableCopy(b.amount);
}

export function buildLineage(
  contract: IntentContract,
  snapshots: CommerceSnapshot[],
): LineageEntry[] {
  if (
    !verifyContractHash(contract) ||
    snapshots.some((snapshot) => !verifySnapshotHash(snapshot))
  )
    throw new Error(
      "Lineage requires sealed evidence and a confirmed contract.",
    );
  return contract.constraints.map((constraint) => {
    const checkpoints = snapshots.map((snapshot) => ({
      snapshotId: snapshot.id,
      checkpoint: snapshot.checkpoint,
      ...(({ outcome, observed }) => ({ outcome, observed }))(
        evaluateInvariant(constraint, snapshot),
      ),
    }));
    const firstFail = checkpoints.findIndex(
      (checkpoint) => checkpoint.outcome === "fail",
    );
    const priorPass =
      firstFail > 0 &&
      checkpoints
        .slice(0, firstFail)
        .some((checkpoint) => checkpoint.outcome === "pass");
    return {
      invariantId: constraint.id,
      path: constraint.path,
      checkpoints,
      firstDriftSnapshotId:
        firstFail < 0 ? null : checkpoints[firstFail]!.snapshotId,
      firstDriftCheckpoint:
        firstFail < 0 ? null : checkpoints[firstFail]!.checkpoint,
      origin: firstFail < 0 ? null : priorPass ? "transition" : "selection",
    };
  });
}
