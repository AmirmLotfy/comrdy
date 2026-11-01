export type Mode = "simulation" | "sandbox";
export type Contract = Record<string, unknown>;
export type Fault = "none" | "variant" | "shipping";

export interface Snapshot {
  checkpoint: string;
  size: string | null;
  totalMinor: number | null;
  revision: string | number;
  source: string;
  [key: string]: unknown;
}

export interface Run {
  id: string;
  mode: Mode;
  fault: Fault;
  status: string;
  contract: Contract;
  snapshots: Snapshot[];
  events: { time: string; title: string; detail: string }[];
  decision: { verdict: string; reason: string };
  payment: {
    authorizationId?: string | null;
    captureId?: string | null;
    status: string;
    [key: string]: unknown;
  };
  parentId?: string;
  [key: string]: unknown;
}

export function isRunPending(run: Run): boolean {
  return [
    "queued",
    "shopping",
    "creating_order",
    "awaiting_approval",
    "approved",
    "authorizing",
    "verifying",
    "capturing",
    "voiding",
    "reconciling",
    "processing",
    "executing",
    "pending",
  ].includes(run.status.toLowerCase());
}

export function approvalLink(run: Run): string | null {
  const value = run.approvalUrl ?? run.payment?.approvalUrl;
  if (run.mode !== "sandbox" || typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "sandbox.paypal.com" ||
        url.hostname.endsWith(".sandbox.paypal.com"))
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export interface ServiceStatus {
  mode: Mode;
  ready: Record<string, unknown>;
  accessCodeRequired?: boolean;
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    const accessCode =
      typeof window === "undefined"
        ? null
        : window.sessionStorage.getItem("comrdy-live-access-code");
    if (accessCode) headers["x-comrdy-access-code"] = accessCode;
  }
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error;
    throw new Error(
      typeof error === "string"
        ? error
        : error?.message ||
            data?.message ||
            `The request could not complete (${response.status}). Please try again.`,
    );
  }
  if (!data)
    throw new Error(
      "The service returned an empty response. Please try again.",
    );
  return data as T;
}

export function at(value: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (current, key) =>
        current && typeof current === "object"
          ? (current as Record<string, unknown>)[key]
          : undefined,
      value,
    );
}

export function first(contract: Contract, paths: string[]): unknown {
  for (const path of paths) {
    const value = at(contract, path);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function constraint(contract: Contract, pattern: RegExp): unknown {
  const constraints = contract.constraints;
  if (!Array.isArray(constraints)) return undefined;
  const found = constraints.find(
    (item: unknown) =>
      item &&
      typeof item === "object" &&
      pattern.test(
        String(
          (item as Record<string, unknown>).path ??
            (item as Record<string, unknown>).id ??
            "",
        ),
      ),
  );
  return found?.value;
}

export function expectedSize(contract: Contract): string | undefined {
  const value =
    first(contract, [
      "size",
      "variant.size",
      "variant.attributes.size",
      "expected.size",
      "intent.size",
      "product.size",
      "item.size",
    ]) ?? constraint(contract, /size/i);
  return typeof value === "string" ? value : undefined;
}

export function currencyOf(contract: Contract): string {
  const value = first(contract, [
    "currency",
    "budget.currency",
    "maxTotal.currency",
    "expected.currency",
  ]);
  const money = constraint(contract, /total|budget/i);
  return typeof value === "string"
    ? value
    : money &&
        typeof money === "object" &&
        typeof (money as Record<string, unknown>).currency === "string"
      ? ((money as Record<string, unknown>).currency as string)
      : "USD";
}

export function capOf(contract: Contract): number | undefined {
  const minor = first(contract, [
    "maxTotalMinor",
    "max_total_minor",
    "budget.maxTotalMinor",
    "budget.amountMinor",
    "expected.maxTotalMinor",
    "constraints.maxTotalMinor",
    "totalCapMinor",
  ]);
  if (typeof minor === "number") return minor;
  const value = constraint(contract, /total|budget/i);
  if (value && typeof value === "object") {
    const money = value as Record<string, unknown>;
    if (typeof money.amount_minor === "number") return money.amount_minor;
    if (typeof money.amountMinor === "number") return money.amountMinor;
    if (
      typeof money.amount === "string" &&
      /^\d+(\.\d{1,2})?$/.test(money.amount)
    )
      return Math.round(Number(money.amount) * 100);
  }
  return undefined;
}

export function money(
  value: number | null | undefined,
  currency = "USD",
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unknown";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value / 100);
  } catch {
    return `${(value / 100).toFixed(2)} ${currency}`;
  }
}

export function readable(value: unknown): string {
  if (value === undefined || value === null) return "Not specified";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function contractRows(
  contract: Contract,
): { label: string; value: string }[] {
  const rows = [
    {
      label: "Product",
      value:
        first(contract, [
          "productName",
          "product.name",
          "product.title",
          "subject.product.name",
          "item.name",
          "productId",
          "product_id",
          "sku",
        ]) ?? constraint(contract, /product|sku/i),
    },
    {
      label: "Color",
      value:
        first(contract, [
          "color",
          "variant.color",
          "variant.attributes.color",
          "expected.color",
        ]) ?? constraint(contract, /color/i),
    },
    { label: "Size", value: expectedSize(contract) },
    {
      label: "Quantity",
      value:
        first(contract, ["quantity", "expected.quantity", "item.quantity"]) ??
        constraint(contract, /quantity/i),
    },
    {
      label: "Delivered total",
      value:
        capOf(contract) === undefined
          ? undefined
          : `At most ${money(capOf(contract), currencyOf(contract))}`,
    },
    {
      label: "Substitutions",
      value:
        first(contract, [
          "allowSubstitution",
          "allowSubstitutions",
          "allow_substitution",
          "policy.allowSubstitution",
        ]) ?? constraint(contract, /substitution/i),
    },
    {
      label: "Subscription",
      value:
        first(contract, [
          "allowSubscription",
          "subscription",
          "subscriptionAllowed",
          "allow_subscription",
          "subscription.enabled",
        ]) ?? constraint(contract, /subscription/i),
    },
  ]
    .filter((row) => row.value !== undefined && row.value !== null)
    .map((row) => ({ label: row.label, value: readable(row.value) }));
  if (rows.length) return rows;
  if (Array.isArray(contract.constraints))
    return contract.constraints.map((c: Record<string, unknown>) => ({
      label: String(c.path ?? c.id ?? "Constraint"),
      value: readable(c.value),
    }));
  return Object.entries(contract)
    .filter(
      ([key, value]) =>
        !/hash|version|confirmed|source|mandate|id|time/i.test(key) &&
        typeof value !== "object",
    )
    .map(([label, value]) => ({ label, value: readable(value) }));
}

export const DEFAULT_MANDATE =
  "Buy one Ocean Shell in blue, size M. Spend no more than $160 USD delivered. No substitutions or subscriptions.";

export const faultLabels: Record<Fault, string> = {
  none: "No injected fault",
  variant: "Variant changes to S",
  shipping: "Shipping exceeds the cap",
};
