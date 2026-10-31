import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePayPalDiagnostics,
  PayPalError,
  PayPalSandboxAdapter,
} from "../src/providers/paypal";

test("PayPal diagnostics keep only bounded recognized issue codes and private debug ID", () => {
  const result = normalizePayPalDiagnostics({
    name: "UNPROCESSABLE_ENTITY",
    debug_id: "a1b2c3d4e5f67",
    message: "Buyer private-buyer@example.invalid has a problem",
    details: [
      {
        issue: "INSTRUMENT_DECLINED",
        field: "/payment_source/paypal/email_address",
        value: "private-buyer@example.invalid",
        description: "Raw buyer data",
      },
      { issue: "INSTRUMENT_DECLINED" },
      { issue: "ORDER_NOT_APPROVED" },
      { issue: "https://private.invalid/token" },
      { issue: "PRIVATE_BUYER_NAME" },
      { issue: "X".repeat(10000) },
    ],
    links: [{ href: "https://private.invalid/token" }],
  });
  assert.deepEqual(result, {
    name: "UNPROCESSABLE_ENTITY",
    issueCodes: ["INSTRUMENT_DECLINED", "ORDER_NOT_APPROVED"],
    debugId: "a1b2c3d4e5f67",
  });
  const serialized = JSON.stringify(result);
  for (const prohibited of [
    "private-buyer",
    "PRIVATE_BUYER_NAME",
    "payment_source",
    "description",
    "links",
    "token",
    "Raw buyer data",
  ])
    assert.equal(serialized.includes(prohibited), false);
});

test("malformed provider diagnostics and unknown names fail closed", () => {
  for (const body of [
    null,
    [],
    "private",
    {
      name: "PRIVATE_BUYER",
      debug_id: "https://private.invalid",
      details: "not-an-array",
    },
    {
      name: "x".repeat(5000),
      debug_id: "1".repeat(65),
      details: [null, "PRIVATE", { issue: 123 }],
    },
  ])
    assert.deepEqual(normalizePayPalDiagnostics(body), {
      name: "PROVIDER_ERROR",
      issueCodes: [],
      debugId: null,
    });
  const body = {
    name: "INVALID_REQUEST",
    details: Array.from({ length: 100 }, (_, index) => ({
      issue: index < 16 ? "UNKNOWN_ISSUE" : "ORDER_NOT_APPROVED",
    })),
  };
  assert.deepEqual(normalizePayPalDiagnostics(body).issueCodes, []);
  const many = normalizePayPalDiagnostics({
    details: [
      "AUTHORIZATION_ALREADY_CAPTURED",
      "AUTHORIZATION_EXPIRED",
      "AUTHORIZATION_VOIDED",
      "CAPTURE_AMOUNT_EXCEEDED",
      "DUPLICATE_INVOICE_ID",
      "INSTRUMENT_DECLINED",
      "ORDER_ALREADY_AUTHORIZED",
      "ORDER_ALREADY_CAPTURED",
      "ORDER_NOT_APPROVED",
      "AMOUNT_MISMATCH",
    ].map((issue) => ({ issue })),
  });
  assert.equal(many.issueCodes.length, 8);
});

test("PayPalError retains existing constructor behavior and sanitizes diagnostic additions", () => {
  const prior = new PayPalError(
    "Safe application message",
    "CAPTURE_DENIED",
    422,
    false,
    "request-id",
  );
  assert.equal(prior.code, "CAPTURE_DENIED");
  assert.equal(prior.outcomeUnknown, false);
  assert.equal(prior.requestId, "request-id");
  assert.deepEqual(prior.issueCodes, []);
  assert.equal(prior.debugId, null);
  const diagnostic = new PayPalError(
    "Safe message",
    "INSTRUMENT_DECLINED",
    422,
    false,
    null,
    "a1b2c3d4e5f67",
    {
      name: "UNPROCESSABLE_ENTITY",
      issueCodes: ["INSTRUMENT_DECLINED", "PRIVATE_BUYER_NAME"],
    },
  );
  assert.equal(diagnostic.providerName, "UNPROCESSABLE_ENTITY");
  assert.deepEqual(diagnostic.issueCodes, ["INSTRUMENT_DECLINED"]);
  assert.ok(Object.isFrozen(diagnostic.issueCodes));
});

test("adapter exposes the safe issue code without leaking raw provider values", async () => {
  let calls = 0;
  const api = new PayPalSandboxAdapter({
    clientId: "local-mock-client",
    clientSecret: "local-mock-secret",
    fetch: async () => {
      calls++;
      return calls === 1
        ? new Response(
            JSON.stringify({
              access_token: "local-mock-token",
              expires_in: 1000,
              token_type: "Bearer",
            }),
            { status: 200 },
          )
        : new Response(
            JSON.stringify({
              name: "UNPROCESSABLE_ENTITY",
              debug_id: "a1b2c3d4e5f67",
              details: [
                {
                  issue: "AUTHORIZATION_VOIDED",
                  value: "private-buyer@example.invalid",
                  description: "private financial details",
                },
              ],
            }),
            { status: 422 },
          );
    },
  });
  await assert.rejects(
    api.capture({
      authorizationId: "AUTH123",
      actionId: "local-control-capture",
      amount: { amountMinor: 14800, currency: "USD" },
    }),
    (error: unknown) => {
      assert.ok(error instanceof PayPalError);
      assert.equal(error.code, "AUTHORIZATION_VOIDED");
      assert.equal(error.providerName, "UNPROCESSABLE_ENTITY");
      assert.deepEqual(error.issueCodes, ["AUTHORIZATION_VOIDED"]);
      assert.equal(error.debugId, "a1b2c3d4e5f67");
      assert.equal(JSON.stringify(error).includes("debugId"), false);
      assert.equal(JSON.stringify(error).includes("a1b2c3d4e5f67"), false);
      assert.equal(error.outcomeUnknown, false);
      assert.equal(JSON.stringify(error).includes("private-buyer"), false);
      assert.equal(error.message.includes("private financial"), false);
      return true;
    },
  );
  assert.equal(calls, 2);
});
