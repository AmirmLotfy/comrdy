import { createHash } from "node:crypto";

/** Stable JSON only: rejects undefined, nonfinite numbers, cycles and exotic objects. */
export function canonicalJson(value: unknown): string {
  const active = new Set<object>();
  function encode(item: unknown): string {
    if (item === null || typeof item === "string" || typeof item === "boolean")
      return JSON.stringify(item);
    if (typeof item === "number") {
      if (!Number.isFinite(item))
        throw new TypeError("Canonical JSON requires finite numbers.");
      return JSON.stringify(item);
    }
    if (typeof item !== "object")
      throw new TypeError("Canonical JSON does not support this value.");
    if (active.has(item))
      throw new TypeError("Canonical JSON cannot contain a cycle.");
    active.add(item);
    try {
      if (Array.isArray(item)) return `[${item.map(encode).join(",")}]`;
      const prototype = Object.getPrototypeOf(item);
      if (prototype !== Object.prototype && prototype !== null)
        throw new TypeError("Canonical JSON requires plain objects.");
      const object = item as Record<string, unknown>;
      return `{${Object.keys(object)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${encode(object[key])}`)
        .join(",")}}`;
    } finally {
      active.delete(item);
    }
  }
  return encode(value);
}

export function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJson(value), "utf8")
    .digest("hex");
}

export function immutableCopy<T>(value: T): T {
  const copy = JSON.parse(canonicalJson(value)) as T;
  function freeze(item: unknown): void {
    if (item !== null && typeof item === "object") {
      Object.values(item).forEach(freeze);
      Object.freeze(item);
    }
  }
  freeze(copy);
  return copy;
}

/** Stable UUID-shaped provider key, distinct for each intended action and operation. */
export function stableRequestId(operation: string, actionId: string): string {
  if (!operation.trim() || !actionId.trim())
    throw new TypeError("Operation and action ID are required.");
  const hex = sha256({
    namespace: "comrdy:paypal:sandbox:v1",
    operation,
    actionId,
  });
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${((parseInt(hex[16]!, 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
