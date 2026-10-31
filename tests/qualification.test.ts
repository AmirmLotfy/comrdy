import test from "node:test";
import assert from "node:assert/strict";
import {
  createCanonicalCandidate,
  CANONICAL_MANDATE,
} from "../src/core/fixtures";
import {
  qualifyIntentCandidate,
  assertQualifiedCapture,
  type IntentFixture,
} from "../scripts/lib/qualification";

const fixture: IntentFixture = {
  id: "canonical",
  text: CANONICAL_MANDATE,
  expect: { size: "M", cap: 16000, noSubscription: true, noSubstitution: true },
};

test("executable qualification separates required-constraint preservation from clarification", () => {
  const candidate = structuredClone(createCanonicalCandidate());
  assert.equal(qualifyIntentCandidate(fixture, candidate).passed, true);
  candidate.needsResolution.push("Please clarify");
  const unexpected = qualifyIntentCandidate(fixture, candidate);
  assert.equal(unexpected.passed, false);
  assert.equal(unexpected.observed, "clarification");
  assert.equal(
    qualifyIntentCandidate({ ...fixture, clarification: true }, candidate)
      .passed,
    true,
  );
});

test("executable qualification rejects missing product/color and wrong operators", () => {
  for (const path of [
    "product.id",
    "variant.attributes.color",
    "quantity",
    "subscription.enabled",
    "policy.substitutionOccurred",
  ]) {
    const missing = structuredClone(createCanonicalCandidate());
    missing.constraints = missing.constraints.filter((c) => c.path !== path);
    assert.equal(qualifyIntentCandidate(fixture, missing).passed, false, path);
  }
  for (const path of [
    "variant.attributes.size",
    "quantity",
    "subscription.enabled",
  ]) {
    const incorrect = structuredClone(createCanonicalCandidate());
    incorrect.constraints.find((c) => c.path === path)!.op = "neq";
    assert.equal(
      qualifyIntentCandidate(fixture, incorrect).passed,
      false,
      path,
    );
  }
  const wrongProduct = structuredClone(createCanonicalCandidate());
  wrongProduct.constraints.find((c) => c.path === "product.id")!.value =
    "summit-boot";
  assert.equal(qualifyIntentCandidate(fixture, wrongProduct).passed, false);
});

const captureInput = (): Parameters<typeof assertQualifiedCapture>[0] => ({
  caseId: "case-1",
  payeeId: "merchant-1",
  order: {
    id: "order-1",
    status: "COMPLETED",
    intent: "AUTHORIZE",
    amount: { amountMinor: 14800, currency: "USD" },
    payeeId: "merchant-1",
    customId: "case-1",
    referenceId: "1",
    authorizationIds: ["auth-1"],
    captureIds: ["capture-1"],
    approvalUrl: null,
  },
  authorization: {
    id: "auth-1",
    status: "CAPTURED",
    amount: { amountMinor: 14800, currency: "USD" },
    orderId: "order-1",
    payeeId: "merchant-1",
    expiresAt: null,
  },
  capture: {
    id: "capture-1",
    status: "COMPLETED",
    amount: { amountMinor: 14800, currency: "USD" },
    orderId: "order-1",
    authorizationId: "auth-1",
    finalCapture: true,
  },
});

test("payment qualification requires the retrieved capture in the retrieved order", () => {
  assert.doesNotThrow(() => assertQualifiedCapture(captureInput()));
  const wrongOrderCapture = captureInput();
  wrongOrderCapture.order.captureIds = ["different-capture"];
  assert.throws(() => assertQualifiedCapture(wrongOrderCapture));
  const wrongAuthorization = captureInput();
  wrongAuthorization.capture.authorizationId = "different-authorization";
  assert.throws(() => assertQualifiedCapture(wrongAuthorization));
});

test("payment qualification rejects unconfirmed authorization and nonfinal capture", () => {
  const active = captureInput();
  active.authorization.status = "CREATED";
  assert.throws(() => assertQualifiedCapture(active));
  const partial = captureInput();
  partial.capture.finalCapture = false;
  assert.throws(() => assertQualifiedCapture(partial));
});
