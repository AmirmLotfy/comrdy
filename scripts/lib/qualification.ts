import assert from "node:assert/strict";
import { validateCandidate } from "../../src/core/invariants";
import type { ContractCandidate, Constraint } from "../../src/core/types";
import type {
  PayPalOrder,
  PayPalAuthorization,
  PayPalCapture,
} from "../../src/providers/paypal";

export interface IntentFixture {
  id: string;
  text: string;
  clarification?: boolean;
  expect?: {
    size: string;
    cap: number;
    noSubscription: boolean;
    noSubstitution: boolean;
  };
}

export function qualifyIntentCandidate(
  item: IntentFixture,
  candidate: ContractCandidate,
) {
  const expected = item.clarification ? "clarification" : "executable";
  const observed = candidate.needsResolution.length
    ? "clarification"
    : "executable";
  const issues: string[] = [];
  const normalize = (text: string) => text.trim().replace(/\s+/g, " ");
  if (normalize(candidate.mandate) !== normalize(item.text))
    issues.push("Mandate text changed");
  if (expected !== observed)
    issues.push(`Expected ${expected}, received ${observed}`);
  if (expected === "executable" && observed === "executable") {
    issues.push(...validateCandidate(candidate).issues);
    const e = item.expect;
    if (!e) issues.push("Executable fixture has no expected constraints");
    else {
      const has = (
        path: string,
        value: Constraint["value"],
        operators: Constraint["op"][],
      ) =>
        candidate.constraints.some((c) => {
          if (!c.hard || c.path !== path || !operators.includes(c.op))
            return false;
          if (typeof value === "string" && typeof c.value === "string")
            return c.op === "eq_ci"
              ? c.value.toLowerCase() === value.toLowerCase()
              : c.value === value;
          if (
            value &&
            typeof value === "object" &&
            "amountMinor" in value &&
            c.value &&
            typeof c.value === "object" &&
            "amountMinor" in c.value
          )
            return (
              value.amountMinor === c.value.amountMinor &&
              value.currency === c.value.currency
            );
          return c.value === value;
        });
      const required: [boolean, string][] = [
        [
          has("product.id", "ocean-shell", ["eq"]) ||
            has("product.name", "Ocean Shell", ["eq", "eq_ci"]),
          "product identity",
        ],
        [
          has("variant.attributes.color", "blue", ["eq", "eq_ci"]),
          "blue color",
        ],
        [has("variant.attributes.size", e.size, ["eq", "eq_ci"]), "size"],
        [has("quantity", 1, ["eq"]), "quantity"],
        [
          has("pricing.total", { amountMinor: e.cap, currency: "USD" }, [
            "money_lte",
          ]),
          "delivered cap",
        ],
        [
          !e.noSubscription ||
            has("subscription.enabled", false, ["bool_eq", "eq"]),
          "no subscription",
        ],
        [
          !e.noSubstitution ||
            has("policy.substitutionOccurred", false, ["bool_eq", "eq"]),
          "no substitution",
        ],
      ];
      for (const [passed, label] of required)
        if (!passed)
          issues.push(`Missing or incorrect hard ${label} constraint`);
    }
  }
  return { expected, observed, passed: issues.length === 0, issues };
}

/** Independent provider readback checks; no financial actions. */
export function assertQualifiedCapture(input: {
  order: PayPalOrder;
  authorization: PayPalAuthorization;
  capture: PayPalCapture;
  caseId: string;
  payeeId: string;
}) {
  const { order, authorization, capture, caseId, payeeId } = input;
  const amount = { amountMinor: 14800, currency: "USD" };
  assert.equal(order.customId, caseId);
  assert.equal(order.payeeId, payeeId);
  assert.deepEqual(order.amount, amount);
  assert.deepEqual(authorization.amount, amount);
  assert.equal(authorization.status, "CAPTURED");
  assert.ok(order.authorizationIds.includes(authorization.id));
  assert.deepEqual(
    order.captureIds,
    [capture.id],
    "Retrieved capture must be the order's sole capture",
  );
  if (authorization.orderId) assert.equal(authorization.orderId, order.id);
  if (authorization.payeeId) assert.equal(authorization.payeeId, payeeId);
  if (capture.orderId) assert.equal(capture.orderId, order.id);
  if (capture.authorizationId)
    assert.equal(capture.authorizationId, authorization.id);
  assert.equal(capture.status, "COMPLETED");
  assert.deepEqual(capture.amount, amount);
  assert.equal(capture.finalCapture, true);
}
