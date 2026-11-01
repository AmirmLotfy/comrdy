import test from "node:test";
import assert from "node:assert/strict";
import { createContractService } from "../src/server/service";
import {
  publicRun,
  type Database,
  type StoredRun,
  type transaction,
} from "../src/server/store";
import {
  CANONICAL_MANDATE,
  createCanonicalCandidate,
} from "../src/core/fixtures";
import { sha256 } from "../src/core/hash";
import { verifyContractHash } from "../src/core/invariants";
import { COMPILER_PROMPT_VERSION } from "../src/providers/compiler";

const OWNER = "private-owner-session";
const NOW = "2026-11-01T12:00:00.000Z";

function harness(mode: "sandbox" | "simulation" = "sandbox") {
  const db: Database = { contracts: {}, runs: {}, webhooks: {} };
  let calls = 0;
  let sequence = 0;
  const tx: typeof transaction = async (fn) => {
    const draft = structuredClone(db);
    const result = await fn(draft);
    Object.assign(db, draft);
    return result;
  };
  const service = createContractService({
    transaction: tx,
    mode: () => mode,
    now: () => NOW,
    id: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
    sandboxCompile: async () => {
      calls++;
      return {
        contract: createCanonicalCandidate(),
        unresolved: [],
        mode: "sandbox",
        compiler: {
          execution: { revision: "a".repeat(40), dirty: false, builtAt: NOW },
          promptVersion: COMPILER_PROMPT_VERSION,
          rawCandidate: createCanonicalCandidate(),
          model: "test-model",
          responseId: "mock-compiler-response",
          usage: { inputTokens: 10, outputTokens: 20 },
        },
      };
    },
  });
  return { db, service, modelCalls: () => calls };
}

test("edited candidate retains its owner-bound original compiler receipt without another model call", async () => {
  const { db, service, modelCalls } = harness();
  const compiled = await service.compile(CANONICAL_MANDATE, OWNER);
  const original = structuredClone(compiled.contract);
  const candidate = structuredClone(compiled.contract);
  candidate.constraints[0].severity = "low";
  const confirmed = await service.confirm(
    candidate,
    OWNER,
    compiled.compilationId,
  );
  const review = confirmed.compiler.review;
  assert.equal(modelCalls(), 1);
  assert.equal(confirmed.compiler.model, "test-model");
  assert.equal(confirmed.compiler.responseId, "mock-compiler-response");
  assert.equal(confirmed.compiler.promptVersion, COMPILER_PROMPT_VERSION);
  assert.deepEqual(confirmed.compiler.rawCandidate, original);
  assert.deepEqual(review.originalCandidate, original);
  assert.equal(review.originalCandidateHash, sha256(original));
  assert.deepEqual(review.finalCandidate, candidate);
  assert.equal(review.finalCandidateHash, sha256(candidate));
  assert.deepEqual(review.changedPaths, ["/constraints/0/severity"]);
  assert.equal(review.confirmedContractId, confirmed.contract.id);
  assert.equal(review.confirmedContractHash, confirmed.contract.hash);
  assert.equal(review.confirmedAt, NOW);
  assert.equal(review.compiledAt, NOW);
  assert.equal(verifyContractHash(confirmed.contract), true);
  assert.equal(db.contracts[confirmed.contract.id].owner, OWNER);
  assert.deepEqual(
    db.compilationReceipts![compiled.compilationId].originalCandidate,
    original,
  );
  candidate.constraints[0].severity = "medium";
  assert.equal(review.finalCandidate.constraints[0].severity, "low");
});

test("missing, foreign and malformed receipt IDs cannot claim compiler provenance or save a contract", async () => {
  const { db, service } = harness();
  const compiled = await service.compile(CANONICAL_MANDATE, OWNER);
  await assert.rejects(
    service.confirm(compiled.contract, "foreign-owner", compiled.compilationId),
    /unavailable for this session/,
  );
  await assert.rejects(
    service.confirm(
      compiled.contract,
      OWNER,
      "00000000-0000-4000-8000-999999999999",
    ),
    /unavailable for this session/,
  );
  await assert.rejects(
    service.confirm(compiled.contract, OWNER, "forged-client-receipt"),
    /unavailable for this session/,
  );
  await assert.rejects(
    service.confirm(compiled.contract, OWNER, null as unknown as string),
    /unavailable for this session/,
  );
  assert.equal(Object.keys(db.contracts).length, 0);
});

test("exact confirmation records zero edits and a corrupt saved original fails closed", async () => {
  const { db, service } = harness();
  const compiled = await service.compile(CANONICAL_MANDATE, OWNER);
  const confirmed = await service.confirm(
    compiled.contract,
    OWNER,
    compiled.compilationId,
  );
  assert.deepEqual(confirmed.compiler.review.changedPaths, []);
  assert.equal(
    confirmed.compiler.review.originalCandidateHash,
    confirmed.compiler.review.finalCandidateHash,
  );
  const changed = structuredClone(
    db.compilationReceipts![compiled.compilationId],
  );
  changed.originalCandidate.constraints[0].severity = "low";
  db.compilationReceipts![compiled.compilationId] = changed;
  await assert.rejects(
    service.confirm(compiled.contract, OWNER, compiled.compilationId),
    /integrity check failed/,
  );
  assert.equal(Object.keys(db.contracts).length, 1);
});

test("manual candidates and local fixtures use truthful sources and never invent model provenance", async () => {
  const { service, modelCalls } = harness("simulation");
  const compiled = await service.compile(CANONICAL_MANDATE, OWNER);
  const fromFixture = await service.confirm(
    compiled.contract,
    OWNER,
    compiled.compilationId,
  );
  assert.equal(fromFixture.compiler.source, "local-fixture");
  assert.equal(fromFixture.compiler.model, null);
  const manual = await service.confirm(createCanonicalCandidate(), OWNER);
  assert.equal(manual.compiler.source, "manual");
  assert.equal(manual.compiler.review.source, "manual-candidate-review");
  assert.equal(manual.compiler.review.compilationId, null);
  assert.equal(manual.compiler.review.originalCandidate, null);
  assert.equal(manual.compiler.review.originalCandidateHash, null);
  assert.equal(modelCalls(), 0);
  // A candidate cannot smuggle its own compiler receipt through the strict schema.
  await assert.rejects(
    service.confirm(
      { ...createCanonicalCandidate(), compiler: { model: "forged" } } as never,
      OWNER,
    ),
  );
});

test("public run provenance includes before/after evidence but excludes the private compilation owner", async () => {
  const { service, db } = harness();
  const compiled = await service.compile(CANONICAL_MANDATE, OWNER);
  const confirmed = await service.confirm(
    compiled.contract,
    OWNER,
    compiled.compilationId,
  );
  const run: StoredRun = {
    id: "test-run",
    owner: OWNER,
    mode: "sandbox",
    fault: "none",
    status: "queued",
    contract: confirmed.contract,
    compiler: confirmed.compiler,
    snapshots: [],
    events: [],
    decision: { verdict: "REVIEW", reason: "Not executed" },
    payment: { status: "NOT_CREATED", authorizationId: null, captureId: null },
    operations: {},
    createdAt: NOW,
  };
  const exposed = publicRun(run);
  assert.equal(JSON.stringify(exposed).includes(OWNER), false);
  assert.equal(JSON.stringify(exposed).includes('"owner"'), false);
  assert.deepEqual(exposed.compiler, confirmed.compiler);
  assert.equal(db.compilationReceipts![compiled.compilationId].owner, OWNER);
});
