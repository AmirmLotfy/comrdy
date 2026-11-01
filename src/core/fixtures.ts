import { immutableCopy } from "./hash";
import { confirmContract, sealSnapshot } from "./invariants";
import type { Checkpoint, ContractCandidate, JsonObject, Money } from "./types";

export const CANONICAL_MANDATE =
  "Buy one Ocean Shell in blue, size M. Spend no more than $160 USD delivered. No substitutions or subscriptions.";
export const CANONICAL_PRICE: Readonly<Money> = Object.freeze({
  amountMinor: 14800,
  currency: "USD",
});
export const CANONICAL_CAP: Readonly<Money> = Object.freeze({
  amountMinor: 16000,
  currency: "USD",
});
export const SHIPPING_FAULT_TOTAL: Readonly<Money> = Object.freeze({
  amountMinor: 17300,
  currency: "USD",
});
export const FIXTURE_TIMESTAMP = "2026-11-01T00:00:00.000Z";
export type DemoFault = "none" | "shipping" | "variant";

export function createCanonicalCandidate(): ContractCandidate {
  return immutableCopy({
    schemaVersion: "1.0",
    mandate: CANONICAL_MANDATE,
    needsResolution: [],
    constraints: [
      {
        id: "inv_product",
        path: "product.id",
        op: "eq",
        value: "ocean-shell",
        hard: true,
        severity: "critical",
        sourceText: "Ocean Shell",
      },
      {
        id: "inv_color",
        path: "variant.attributes.color",
        op: "eq_ci",
        value: "blue",
        hard: true,
        severity: "high",
        sourceText: "in blue",
      },
      {
        id: "inv_size",
        path: "variant.attributes.size",
        op: "eq",
        value: "M",
        hard: true,
        severity: "critical",
        sourceText: "size M",
      },
      {
        id: "inv_quantity",
        path: "quantity",
        op: "eq",
        value: 1,
        hard: true,
        severity: "high",
        sourceText: "Buy one",
      },
      {
        id: "inv_total",
        path: "pricing.total",
        op: "money_lte",
        value: CANONICAL_CAP,
        hard: true,
        severity: "critical",
        sourceText: "no more than $160 USD delivered",
      },
      {
        id: "inv_substitution",
        path: "policy.substitutionOccurred",
        op: "bool_eq",
        value: false,
        hard: true,
        severity: "critical",
        sourceText: "No substitutions or subscriptions",
      },
      {
        id: "inv_subscription",
        path: "subscription.enabled",
        op: "bool_eq",
        value: false,
        hard: true,
        severity: "critical",
        sourceText: "No substitutions or subscriptions",
      },
      {
        id: "inv_inventory",
        path: "inventory.available",
        op: "bool_eq",
        value: true,
        hard: true,
        severity: "high",
        sourceText: null,
      },
    ],
  });
}

/** Deterministic test/demo fixture. Interactive flows should confirm the candidate explicitly. */
export function createCanonicalContract(
  confirmedAt = FIXTURE_TIMESTAMP,
  id = "contract-m01",
) {
  return confirmContract(createCanonicalCandidate(), {
    id,
    version: 1,
    confirmedAt,
  });
}

export function createCanonicalState(fault: DemoFault = "none"): JsonObject {
  const shipping = fault === "shipping" ? 3500 : 1000;
  const size = fault === "variant" ? "S" : "M";
  return immutableCopy({
    product: { id: "ocean-shell", name: "Ocean Shell" },
    variant: {
      id: `ocean-shell-blue-${size.toLowerCase()}`,
      sku: `NP-OS-BLU-${size}`,
      attributes: { color: "blue", size },
    },
    quantity: 1,
    pricing: {
      subtotal: { amountMinor: 12900, currency: "USD" },
      shipping: { amountMinor: shipping, currency: "USD" },
      tax: { amountMinor: 900, currency: "USD" },
      discount: { amountMinor: 0, currency: "USD" },
      total: { amountMinor: 12900 + shipping + 900, currency: "USD" },
    },
    policy: { substitutionOccurred: fault === "variant" },
    subscription: { enabled: false },
    inventory: { available: true },
    merchant: { id: "northpath-supply" },
  });
}

export function createCanonicalSnapshot(
  options: {
    id?: string;
    caseId?: string;
    revision?: string;
    checkpoint?: Checkpoint;
    fault?: DemoFault;
    observedAt?: string;
  } = {},
) {
  const checkpoint = options.checkpoint ?? "AUTHORIZED";
  return sealSnapshot({
    id:
      options.id ??
      `snapshot-m01-${checkpoint.toLowerCase()}-${options.fault ?? "none"}`,
    caseId: options.caseId ?? "case-m01",
    revision: options.revision ?? "1",
    checkpoint,
    observedAt: options.observedAt ?? FIXTURE_TIMESTAMP,
    state: createCanonicalState(options.fault),
  });
}
