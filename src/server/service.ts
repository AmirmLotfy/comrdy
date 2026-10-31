import { sandboxCompile, sandboxStart, sandboxRecover } from "./sandbox";
import { sha256 } from "../core/hash";
import { randomUUID } from "node:crypto";
import { transaction, publicRun, type StoredRun } from "./store";
import { releaseLibrary } from "./library";
import { status } from "./config";
import {
  createCanonicalContract,
  createCanonicalSnapshot,
  CANONICAL_MANDATE,
} from "../core/fixtures";
import { confirmContract, evaluateContract } from "../core/invariants";
import type { ContractCandidate, IntentContract } from "../core/types";
export function event(run: StoredRun, title: string, detail: string) {
  run.events.push({ time: new Date().toISOString(), title, detail });
}
export async function compile(mandate: string, owner: string) {
  if (!mandate || mandate.length > 6000)
    throw new Error("Enter a mandate of 1–6000 characters.");
  if (status().mode === "sandbox") {
    const result = await sandboxCompile(mandate);
    await transaction((db) => {
      db.compilations ??= {};
      db.compilations[owner + ":" + sha256(result.contract)] = {
        ...result.compiler,
        promptVersion: "intent-v1",
      };
    });
    return result;
  }
  const fixture = createCanonicalContract();
  const candidate: ContractCandidate = {
    schemaVersion: "1.0",
    mandate,
    constraints: fixture.constraints,
    needsResolution:
      mandate.trim() === CANONICAL_MANDATE.trim()
        ? []
        : [
            "Local simulation supports the exact example mandate only. Real AI compilation requires configured Sandbox mode.",
          ],
  };
  return {
    contract: candidate,
    unresolved: candidate.needsResolution,
    mode: "simulation",
  };
}
export async function confirm(candidate: ContractCandidate, owner: string) {
  const contract = confirmContract(candidate, {
    id: randomUUID(),
    version: 1,
    confirmedAt: new Date().toISOString(),
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
  await transaction((db) => {
    db.contracts[contract.id] = {
      owner,
      contract,
      compiler: db.compilations?.[owner + ":" + sha256(candidate)] ?? {
        source: "human-reviewed-or-edited",
        model: null,
      },
    };
  });
  return { contract };
}
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
      fault,
      status: "completed",
      contract,
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
