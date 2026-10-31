import { sandboxCompile, sandboxStart, sandboxRecover } from "./sandbox";
import { immutableCopy, sha256 } from "../core/hash";
import { randomUUID } from "node:crypto";
import { transaction, publicRun, type StoredRun } from "./store";
import { releaseLibrary } from "./library";
import { status } from "./config";
import { executionProvenance } from "./provenance";
import {
  createCanonicalContract,
  createCanonicalSnapshot,
  CANONICAL_MANDATE,
} from "../core/fixtures";
import { confirmContract, evaluateContract } from "../core/invariants";
import {
  ContractCandidateSchema,
  type ContractCandidate,
  type IntentContract,
} from "../core/types";
export function event(run: StoredRun, title: string, detail: string) {
  run.events.push({ time: new Date().toISOString(), title, detail });
}
/** JSON-pointer paths retain exact array positions in the saved before/after candidates. */
function changedCandidatePaths(
  before: unknown,
  after: unknown,
  path = "",
): string[] {
  if (before === after) return [];
  if (before === undefined || after === undefined) return [path || "/"];
  if (
    before === null ||
    after === null ||
    typeof before !== "object" ||
    typeof after !== "object" ||
    Array.isArray(before) !== Array.isArray(after)
  )
    return [path || "/"];
  const left = before as Record<string, unknown>;
  const right = after as Record<string, unknown>;
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .sort()
    .flatMap((key) =>
      changedCandidatePaths(
        left[key],
        right[key],
        `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
      ),
    );
}

/** Injectable only on the server, allowing receipt ownership/edits to be tested without a model call. */
export function createContractService(
  dependencies: {
    transaction?: typeof transaction;
    sandboxCompile?: typeof sandboxCompile;
    mode?: () => "sandbox" | "simulation";
    now?: () => string;
    id?: () => string;
  } = {},
) {
  const tx = dependencies.transaction ?? transaction;
  const compileSandbox = dependencies.sandboxCompile ?? sandboxCompile;
  const mode = dependencies.mode ?? (() => status().mode);
  const now = dependencies.now ?? (() => new Date().toISOString());
  const id = dependencies.id ?? randomUUID;

  async function compile(mandate: string, owner: string) {
    if (typeof mandate !== "string" || !mandate || mandate.length > 6000)
      throw new Error("Enter a mandate of 1–6000 characters.");
    let result: {
      contract: ContractCandidate;
      unresolved: string[];
      mode: "sandbox" | "simulation";
      compiler: Record<string, unknown>;
    };
    if (mode() === "sandbox") {
      const compiled = await compileSandbox(mandate);
      result = {
        ...compiled,
        compiler: {
          ...compiled.compiler,
          source: "ai-compiler",
          promptVersion: "intent-v1",
        },
      };
    } else {
      const candidate: ContractCandidate = {
        schemaVersion: "1.0",
        mandate,
        constraints: createCanonicalContract().constraints,
        needsResolution:
          mandate.trim() === CANONICAL_MANDATE.trim()
            ? []
            : [
                "Local simulation supports the exact example mandate only. Real AI compilation requires configured Sandbox mode.",
              ],
      };
      result = {
        contract: candidate,
        unresolved: candidate.needsResolution,
        mode: "simulation",
        compiler: {
          source: "local-fixture",
          model: null,
          promptVersion: "canonical-fixture-v1",
        },
      };
    }
    const originalCandidate = ContractCandidateSchema.parse(result.contract);
    const compilationId = id();
    const receipt = immutableCopy({
      id: compilationId,
      owner,
      compiledAt: now(),
      originalCandidate,
      originalCandidateHash: sha256(originalCandidate),
      compiler: result.compiler,
    });
    await tx((db) => {
      db.compilationReceipts ??= {};
      db.compilationReceipts[compilationId] = receipt;
    });
    return { ...result, compilationId };
  }

  async function confirm(
    candidate: ContractCandidate,
    owner: string,
    compilationId?: string,
  ) {
    if (
      compilationId !== undefined &&
      (typeof compilationId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          compilationId,
        ))
    )
      throw new Error("Compilation receipt is unavailable for this session.");
    const contract = confirmContract(candidate, {
      id: id(),
      version: 1,
      confirmedAt: now(),
    });
    if (
      !contract.constraints.some(
        (c) =>
          c.hard &&
          c.path === "pricing.total" &&
          ["money_lte", "money_eq"].includes(c.op) &&
          c.value &&
          typeof c.value === "object" &&
          !Array.isArray(c.value) &&
          "amountMinor" in c.value &&
          c.value.currency === "USD" &&
          c.value.amountMinor <= 16000,
      )
    )
      throw new Error(
        "This controlled lab requires a hard USD delivered-total cap of $160 or less.",
      );
    const {
      id: contractId,
      version: _version,
      confirmedAt,
      hash: contractHash,
      ...finalCandidate
    } = contract;
    const compiler = await tx((db) => {
      const receipt = compilationId
        ? db.compilationReceipts?.[compilationId]
        : undefined;
      if (compilationId && (!receipt || receipt.owner !== owner))
        throw new Error("Compilation receipt is unavailable for this session.");
      if (
        receipt &&
        receipt.originalCandidateHash !== sha256(receipt.originalCandidate)
      )
        throw new Error("Compilation receipt integrity check failed.");
      // Only the opaque ID comes from the client. Metadata, original candidate and owner binding come from durable server state.
      const compiler = immutableCopy({
        ...(receipt?.compiler ?? { source: "manual", model: null }),
        review: {
          source: receipt
            ? "compiled-candidate-review"
            : "manual-candidate-review",
          compilationId: receipt?.id ?? null,
          compiledAt: receipt?.compiledAt ?? null,
          originalCandidate: receipt?.originalCandidate ?? null,
          originalCandidateHash: receipt?.originalCandidateHash ?? null,
          finalCandidate,
          finalCandidateHash: sha256(finalCandidate),
          changedPaths: receipt
            ? changedCandidatePaths(receipt.originalCandidate, finalCandidate)
            : [],
          confirmedContractId: contractId,
          confirmedContractHash: contractHash,
          confirmedAt,
        },
      });
      db.contracts[contract.id] = { owner, contract, compiler };
      return compiler as typeof compiler & Record<string, unknown>;
    });
    return { contract, compiler };
  }
  return { compile, confirm };
}

const contractsService = createContractService();
export const compile = contractsService.compile;
export const confirm = contractsService.confirm;
export async function start(
  contractInput: { id: string },
  fault: StoredRun["fault"],
  owner: string,
  parentId?: string,
) {
  if (!["none", "variant", "shipping"].includes(fault))
    throw new Error("Unknown fault");
  if (status().mode === "sandbox")
    return sandboxStart(contractInput, fault, owner, parentId);
  return transaction((db) => {
    const saved = db.contracts[contractInput.id];
    if (!saved || saved.owner !== owner)
      throw new Error("Confirm your contract before running.");
    const contract = saved.contract as IntentContract;
    if (Object.values(db.runs).filter((r) => r.owner === owner).length >= 100)
      throw new Error("Local session run limit reached.");
    if (parentId) {
      const parent = db.runs[parentId];
      if (
        !parent ||
        parent.owner !== owner ||
        parent.parentId ||
        parent.decision.verdict === "ALLOW" ||
        parent.contract.id !== contract.id
      )
        throw new Error("Recovery requires a blocked original run.");
      if (Object.values(db.runs).some((r) => r.parentId === parentId))
        throw new Error("Recovery already attempted.");
    }
    const id = randomUUID();
    const run: StoredRun = {
      id,
      owner,
      mode: "simulation",
      execution: executionProvenance(),
      fault,
      status: "completed",
      contract,
      compiler: saved.compiler ?? null,
      snapshots: [],
      events: [],
      decision: { verdict: "REVIEW", reason: "Not evaluated" },
      payment: { authorizationId: null, captureId: null, status: "SIMULATED" },
      operations: {},
      createdAt: new Date().toISOString(),
      ...(parentId ? { parentId } : {}),
    };
    event(
      run,
      "Local simulation",
      "Fixture execution. No AI browser or PayPal request is made.",
    );
    const before = createCanonicalSnapshot({
      caseId: id,
      revision: "1",
      checkpoint: "CHECKOUT",
      fault: "none",
      observedAt: new Date().toISOString(),
    });
    const preflight = evaluateContract(contract, before);
    run.snapshots.push({
      checkpoint: "Checkout",
      size: "M",
      totalMinor: 14800,
      revision: 1,
      source: "Local fixture",
    });
    if (preflight.decision !== "ALLOW") {
      run.decision = {
        verdict: preflight.decision,
        reason: "Preflight did not satisfy every hard constraint.",
      };
      event(run, "Preflight stopped", "No authorization requested.");
      db.runs[id] = run;
      return publicRun(run);
    }
    event(
      run,
      "Approval boundary",
      "Simulation assumes a buyer approval; a live run requires actual PayPal Sandbox approval.",
    );
    const after = createCanonicalSnapshot({
      caseId: id,
      revision: fault === "none" ? "1" : "2",
      checkpoint: "AUTHORIZED",
      fault,
      observedAt: new Date().toISOString(),
    });
    const result = evaluateContract(contract, after);
    run.snapshots.push({
      checkpoint: "Final check",
      size: fault === "variant" ? "S" : "M",
      totalMinor: fault === "shipping" ? 17300 : 14800,
      revision: fault === "none" ? 1 : 2,
      source: "Local fixture",
    });
    run.decision = {
      verdict: result.decision,
      reason:
        result.evaluations
          .filter((e) => e.hard && e.outcome !== "pass")
          .map((e) => e.path + ": " + e.message)
          .join(" ") || "Every required constraint passed.",
    };
    run.evaluations = result.evaluations;
    run.evidence = {
      contractHash: contract.hash,
      snapshotHash: after.hash,
      snapshots: [before, after],
      providerEvidence: null,
    };
    event(run, "Deterministic decision", run.decision.reason);
    run.payment.status =
      result.decision === "ALLOW" ? "SIMULATED_CAPTURE" : "SIMULATED_VOID";
    event(
      run,
      result.decision === "ALLOW"
        ? "Capture would be allowed"
        : "Capture blocked; void would be requested",
      "Simulated outcome only. No provider resource exists.",
    );
    db.runs[id] = run;
    return publicRun(run);
  });
}
export async function getRun(id: string, owner: string) {
  const privateRun = await transaction((db) => {
    const run = db.runs[id];
    if (!run || run.owner !== owner) return null;
    return publicRun(run);
  });
  if (privateRun) return privateRun;
  const shared = (await releaseLibrary()).runs.find(
    (r: { id: string }) => r.id === id,
  );
  if (!shared) throw new Error("Run not found");
  return shared;
}
export async function listRuns(owner: string) {
  const privateRuns = await transaction((db) =>
    Object.values(db.runs)
      .filter((r) => r.owner === owner)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(publicRun),
  );
  const library = await releaseLibrary();
  return {
    runs: [
      ...privateRuns,
      ...library.runs.filter(
        (r: { id: string }) => !privateRuns.some((p) => p.id === r.id),
      ),
    ],
  };
}
export async function recover(id: string, owner: string) {
  if (status().mode === "sandbox") return sandboxRecover(id, owner);
  const run = await getRun(id, owner);
  return start(run.contract, "none", owner, id);
}
