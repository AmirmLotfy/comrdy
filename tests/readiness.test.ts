import test from "node:test";
import assert from "node:assert/strict";
import {
  compareReadiness,
  executeReadinessRequest,
  parseReadinessQuery,
  READINESS_SCENARIOS,
  ReadinessInputError,
  runReadinessSuite,
} from "../src/core/readiness";
import {
  evaluateContract,
  evaluatePaymentGate,
  readPath,
} from "../src/core/invariants";
import { sha256 } from "../src/core/hash";
import { dollarsToMinor, safeCsvCell } from "../src/app/readiness/format";

test("readiness cases execute both authoritative engines and retain independent expectations", () => {
  const result = runReadinessSuite();
  assert.equal(READINESS_SCENARIOS.length, 12);
  assert.equal(new Set(READINESS_SCENARIOS.map((item) => item.id)).size, 12);
  assert.deepEqual(result.summary, {
    definedCases: 12,
    executedCases: 12,
    checkedExpectations: 12,
    matchedExpectations: 12,
    allow: 2,
    deny: 8,
    review: 2,
  });
  for (const item of result.results) {
    assert.deepEqual(
      item.contract,
      evaluateContract(item.input.contract, item.input.snapshot),
    );
    assert.deepEqual(item.gate, evaluatePaymentGate(item.input));
    assert.equal(item.facts.length, item.input.contract.constraints.length);
    assert.equal(item.matchedExpectation, true, item.id);
    assert.equal(item.captureExecuted, false);
    assert.equal(item.authorizationResolved, false);
    for (const fact of item.facts) {
      assert.equal(
        fact.sourceText,
        item.input.contract.constraints.find(
          (rule) => rule.id === fact.invariantId,
        )?.sourceText,
      );
      assert.equal(fact.provenance.snapshotHash, item.input.snapshot.hash);
      assert.equal(fact.provenance.kind, "synthetic fixture");
    }
  }
});

test("one cent beyond the approved cap is denied even when the synthetic provider agrees", () => {
  const suite = runReadinessSuite();
  const atCap = suite.results.find((item) => item.id === "budget-boundary")!;
  const above = suite.results.find((item) => item.id === "budget-one-cent")!;
  assert.equal(atCap.gate.decision, "ALLOW");
  assert.equal(above.gate.decision, "DENY");
  assert.deepEqual(above.input.provider?.authorizedAmount, {
    amountMinor: 16001,
    currency: "USD",
  });
  assert.deepEqual(readPath(above.input.snapshot.state, "pricing.total"), {
    amountMinor: 16001,
    currency: "USD",
  });
  assert.deepEqual(
    above.facts.find((fact) => fact.invariantId === "inv_total")?.expected,
    { amountMinor: 16000, currency: "USD" },
  );
  assert.equal(
    above.facts.find((fact) => fact.invariantId === "inv_total")?.outcome,
    "fail",
  );
  assert.ok(
    !above.gate.reasons.some(
      (reason) => reason.code === "PAYMENT_AMOUNT_MISMATCH",
    ),
  );
  assert.equal(atCap.input.contract.hash, above.input.contract.hash);
});

test("matching nominal amounts cannot disguise a different currency", () => {
  const currency = runReadinessSuite().results.find(
    (item) => item.id === "currency",
  )!;
  assert.deepEqual(currency.input.provider?.orderAmount, {
    amountMinor: 14800,
    currency: "EUR",
  });
  assert.equal(currency.contract.decision, "DENY");
  assert.equal(currency.gate.decision, "DENY");
  assert.ok(
    currency.gate.reasons.some(
      (reason) => reason.code === "VALUE_CURRENCY_CHANGED",
    ),
  );
  assert.deepEqual(
    currency.facts.find((fact) => fact.invariantId === "inv_total")?.expected,
    { amountMinor: 16000, currency: "USD" },
  );
});

test("omitted total stays unknown and requires review instead of a false absence or a pass", () => {
  const missing = runReadinessSuite().results.find(
    (item) => item.id === "missing-total",
  )!;
  assert.equal(missing.contract.decision, "REVIEW");
  assert.equal(missing.gate.decision, "REVIEW");
  assert.equal(
    missing.facts.find((fact) => fact.invariantId === "inv_total")?.outcome,
    "unknown",
  );
  assert.equal(
    readPath(missing.input.snapshot.state, "pricing.total"),
    undefined,
  );
  assert.deepEqual(missing.input.snapshot.absentPaths, []);
  assert.ok(
    missing.gate.reasons.some((reason) => reason.code === "EVIDENCE_MISSING"),
  );
  assert.ok(
    missing.gate.reasons.some(
      (reason) => reason.code === "PAYMENT_TOTAL_UNKNOWN",
    ),
  );
});

test("matching contract facts do not override stale evidence or mismatched payment bindings", () => {
  const suite = runReadinessSuite();
  for (const [id, decision, reason] of [
    ["stale-evidence", "REVIEW", "EVIDENCE_STALE"],
    ["stale-revision", "DENY", "CHECKOUT_REVISION_CHANGED"],
    ["authorization-mismatch", "DENY", "PAYMENT_BINDING_MISMATCH"],
  ]) {
    const result = suite.results.find((item) => item.id === id)!;
    assert.equal(result.contract.decision, "ALLOW", id);
    assert.equal(result.gate.decision, decision, id);
    assert.ok(
      result.gate.reasons.some((item) => item.code === reason),
      id,
    );
  }
});

test("composed faults retain all hard failures without editing the approved contract", () => {
  const result = compareReadiness({
    totalMinor: 16001,
    size: "S",
    quantity: 2,
    evidence: "complete",
  });
  const [baseline, composed] = result.results;
  assert.equal(baseline!.gate.decision, "ALLOW");
  assert.equal(composed!.gate.decision, "DENY");
  assert.deepEqual(
    composed!.facts
      .filter((fact) => fact.outcome === "fail")
      .map((fact) => fact.invariantId)
      .sort(),
    ["inv_quantity", "inv_size", "inv_substitution", "inv_total"],
  );
  assert.equal(composed!.input.contract.hash, baseline!.input.contract.hash);
  assert.deepEqual(composed!.input.contract, baseline!.input.contract);
  assert.equal(composed!.expectation, null);
  assert.equal(composed!.matchedExpectation, null);
  assert.equal(result.summary.checkedExpectations, 1);
  assert.equal(result.summary.executedCases, 2);
  assert.equal(result.mode, "compare");
});

test("a hard failure takes precedence while missing evidence is still retained", () => {
  const composed = compareReadiness({
    totalMinor: 14800,
    size: "S",
    quantity: 1,
    evidence: "missing-total",
  }).results[1]!;
  assert.equal(composed.gate.decision, "DENY");
  assert.ok(
    composed.facts.some(
      (fact) => fact.invariantId === "inv_size" && fact.outcome === "fail",
    ),
  );
  assert.ok(
    composed.facts.some(
      (fact) => fact.invariantId === "inv_total" && fact.outcome === "unknown",
    ),
  );
  assert.ok(
    composed.gate.reasons.some((reason) => reason.code === "EVIDENCE_MISSING"),
  );
});

test("readiness input is finite, strict, and cannot become a general evaluation endpoint", () => {
  for (const query of [
    "schema=2.0&mode=suite",
    "schema=1.0&mode=capture",
    "schema=1.0&mode=suite&mode=compare",
    "schema=1.0&mode=suite&contract=anything",
    "schema=1.0&mode=suite&totalMinor=14800",
    "schema=1.0&mode=compare&totalMinor=1e4&size=M&quantity=1&evidence=complete",
    "schema=1.0&mode=compare&totalMinor=13799&size=M&quantity=1&evidence=complete",
    "schema=1.0&mode=compare&totalMinor=25001&size=M&quantity=1&evidence=complete",
    "schema=1.0&mode=compare&totalMinor=14800&size=L&quantity=1&evidence=complete",
    "schema=1.0&mode=compare&totalMinor=14800&size=M&quantity=0&evidence=complete",
    "schema=1.0&mode=compare&totalMinor=14800&size=M&quantity=1&evidence=provider",
    "schema=1.0&mode=compare&totalMinor=14800&size=M&quantity=1",
  ])
    assert.throws(
      () => parseReadinessQuery(new URLSearchParams(query)),
      ReadinessInputError,
      query,
    );
  assert.throws(
    () =>
      compareReadiness({
        totalMinor: 14800,
        size: "M",
        quantity: 1,
        evidence: "complete",
        provider: {},
      }),
    ReadinessInputError,
  );
  assert.throws(
    () =>
      compareReadiness({
        totalMinor: 14800.5,
        size: "M",
        quantity: 1,
        evidence: "complete",
      }),
    ReadinessInputError,
  );
  assert.deepEqual(
    parseReadinessQuery(new URLSearchParams("schema=1.0&mode=suite")),
    { schemaVersion: "1.0", mode: "suite" },
  );
  assert.equal(
    parseReadinessQuery(
      new URLSearchParams(
        "schema=1.0&mode=compare&totalMinor=25000&size=S&quantity=2&evidence=stale",
      ),
    ).mode,
    "compare",
  );
});

test("JSON reproduction preserves exact synthetic inputs and never implies provider qualification", () => {
  for (const report of [
    runReadinessSuite(),
    compareReadiness({
      totalMinor: 16000,
      size: "M",
      quantity: 1,
      evidence: "stale",
    }),
  ]) {
    const exported = JSON.parse(JSON.stringify(report));
    const { reportHash, ...payload } = exported;
    assert.equal(sha256(payload), reportHash);
    const request = parseReadinessQuery(
      new URL(report.reproduction.path, "https://comrdy.example").searchParams,
    );
    assert.deepEqual(executeReadinessRequest(request), report);
    for (const result of report.results)
      assert.equal(result.inputHash, sha256(result.input));
    assert.equal(report.evidenceKind, "deterministic-synthetic");
    assert.deepEqual(report.boundary, {
      providerCalls: 0,
      paymentActions: 0,
      merchantOrdersCreated: 0,
      providerQualification: "not executed",
      certification: false,
      clock: "fixed test clock",
    });
    assert.ok(Object.isFrozen(report));
    assert.ok(Object.isFrozen(report.results[0]!.input.contract));
    assert.match(
      report.results[0]!.input.provider!.authorizationId,
      /^SYNTHETIC-/,
    );
  }
});

test("CSV cells neutralize formula prefixes including leading whitespace and controls", () => {
  for (const value of [
    "=1+1",
    "+SUM(A1)",
    "-2+3",
    "@SUM(A1)",
    "\t=1",
    "\r=1",
    "  =1",
    "\ntext",
    "\u0000+1",
  ]) {
    assert.ok(safeCsvCell(value).startsWith("'"));
  }
  assert.equal(safeCsvCell("Matching checkout"), "Matching checkout");
  assert.equal(safeCsvCell(null), "");
  assert.equal(safeCsvCell("DENY"), "DENY");
});

test("what-if money input preserves the one-cent boundary without floating point rounding", () => {
  assert.equal(dollarsToMinor("160.00"), 16000);
  assert.equal(dollarsToMinor("160.01"), 16001);
  assert.equal(dollarsToMinor("148.1"), 14810);
  assert.equal(dollarsToMinor("138"), 13800);
  for (const value of [
    "137.99",
    "250.01",
    "160.001",
    "1e3",
    "Infinity",
    "-160",
    "",
  ])
    assert.equal(dollarsToMinor(value), null);
});
