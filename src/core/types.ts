import { z } from "zod";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export const MoneySchema = z
  .object({
    amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    currency: z.string().regex(/^[A-Z]{3}$/),
  })
  .strict();
export type Money = z.infer<typeof MoneySchema>;

export const OPERATORS = [
  "eq",
  "eq_ci",
  "neq",
  "in",
  "not_in",
  "lte",
  "gte",
  "between",
  "money_eq",
  "money_lte",
  "money_gte",
  "date_lte",
  "exists",
  "not_exists",
  "bool_eq",
] as const;
export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
const PrimitiveSchema = z.union([z.string(), z.number().finite(), z.boolean()]);
export const ConstraintValueSchema = z.union([
  PrimitiveSchema,
  z.null(),
  MoneySchema,
  z.array(PrimitiveSchema).max(64),
  z.object({ min: z.number().finite(), max: z.number().finite() }).strict(),
]);
export const ConstraintSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
    path: z
      .string()
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)*$/)
      .max(200),
    op: z.enum(OPERATORS),
    value: ConstraintValueSchema,
    hard: z.boolean(),
    severity: z.enum(SEVERITIES),
    /** Exact mandate excerpt; null denotes an explicit catalog/policy invariant. */
    sourceText: z.string().min(1).max(1000).nullable(),
  })
  .strict();
export type Constraint = z.infer<typeof ConstraintSchema>;
export type ConstraintValue = Constraint["value"];

export const ContractCandidateSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    mandate: z.string().min(1).max(6000),
    constraints: z.array(ConstraintSchema).min(1).max(64),
    needsResolution: z.array(z.string().min(1).max(500)).max(32),
  })
  .strict();
export type ContractCandidate = z.infer<typeof ContractCandidateSchema>;

/** A candidate only becomes executable after explicit human confirmation. */
export interface IntentContract extends ContractCandidate {
  id: string;
  version: number;
  confirmedAt: string;
  hash: string;
}

export const CHECKPOINTS = [
  "SELECTED",
  "CART",
  "CHECKOUT",
  "AUTHORIZED",
  "CAPTURED",
  "VOIDED",
] as const;
export type Checkpoint = (typeof CHECKPOINTS)[number];
export interface SnapshotInput {
  id: string;
  caseId: string;
  revision: string;
  checkpoint: Checkpoint;
  observedAt: string;
  state: JsonObject;
  /** Explicitly observed absence; omission by an extractor alone is unknown. */
  absentPaths?: string[];
}
export interface CommerceSnapshot extends SnapshotInput {
  hash: string;
}

export type EvaluationOutcome = "pass" | "fail" | "unknown";
export interface InvariantEvaluation {
  invariantId: string;
  path: string;
  op: Constraint["op"];
  hard: boolean;
  severity: Constraint["severity"];
  outcome: EvaluationOutcome;
  expected: ConstraintValue;
  observed: JsonValue | null;
  code: string;
  message: string;
}
export type GateDecision = "ALLOW" | "REVIEW" | "DENY";
export interface VerificationResult {
  decision: GateDecision;
  evaluations: InvariantEvaluation[];
  contractHash: string;
  snapshotHash: string;
}

export const AUTHORIZATION_STATUSES = [
  "CREATED",
  "CAPTURED",
  "DENIED",
  "PARTIALLY_CAPTURED",
  "VOIDED",
  "PENDING",
] as const;
export type AuthorizationStatus = (typeof AUTHORIZATION_STATUSES)[number];
export const CAPTURE_STATUSES = [
  "COMPLETED",
  "DECLINED",
  "PARTIALLY_REFUNDED",
  "PENDING",
  "REFUNDED",
  "FAILED",
] as const;
export type CaptureStatus = (typeof CAPTURE_STATUSES)[number];

/** Normalized, redacted facts obtained by retrieving the order and authorization. */
export interface ProviderCheckpoint {
  environment: "sandbox";
  caseId: string;
  orderId: string;
  authorizationId: string;
  payeeId: string;
  authorizationStatus: AuthorizationStatus;
  orderAmount: Money;
  authorizedAmount: Money;
  /** True only when the retrieved order includes this authorization ID. */
  orderAuthorizationLinked: boolean;
  observedAt: string;
  expiresAt: string | null;
}
export interface ExpectedPaymentBinding {
  caseId: string;
  revision: string;
  orderId: string;
  authorizationId: string;
  payeeId: string;
}
export interface PaymentGateInput {
  contract: IntentContract;
  snapshot: CommerceSnapshot;
  provider: ProviderCheckpoint | null;
  expected: ExpectedPaymentBinding;
  alreadyCaptured?: boolean;
  capturePending?: boolean;
  /** Deterministic caller-provided clock. Required; no wall-clock reads in the engine. */
  evaluatedAt: string;
  maxEvidenceAgeMs?: number;
}
export interface PaymentGateResult extends VerificationResult {
  decisionId: string;
  binding: ExpectedPaymentBinding & {
    contractHash: string;
    snapshotHash: string;
    providerHash: string | null;
    amount: Money | null;
  };
  evaluatedAt: string;
  reasons: { code: string; message: string }[];
}
export interface CaptureBindingInput {
  decision: PaymentGateResult;
  contract: IntentContract;
  snapshot: CommerceSnapshot;
  provider: ProviderCheckpoint;
  expected: ExpectedPaymentBinding;
  now: string;
  maxDecisionAgeMs?: number;
}

export interface LineageEntry {
  invariantId: string;
  path: string;
  checkpoints: {
    snapshotId: string;
    checkpoint: Checkpoint;
    outcome: EvaluationOutcome;
    observed: JsonValue | null;
  }[];
  firstDriftSnapshotId: string | null;
  firstDriftCheckpoint: Checkpoint | null;
  origin: "selection" | "transition" | null;
}
