import { readFileSync } from "node:fs";
export interface ExecutionProvenance {
  revision: string | null;
  dirty: boolean;
  builtAt: string | null;
  sourceDigest?: string;
}
const unknown: ExecutionProvenance = {
  revision: null,
  dirty: true,
  builtAt: null,
};
function load(): ExecutionProvenance {
  if (process.env.NODE_ENV !== "production") return unknown;
  try {
    // Next inlines this public, non-secret metadata at build time. The separate
    // worker reads the same immutable build receipt once at process startup.
    const encoded =
      process.env.COMRDY_BUILD_PROVENANCE ||
      readFileSync(".build-provenance.json", "utf8");
    const value = JSON.parse(encoded);
    if (
      !/^[a-f0-9]{40}$/.test(value.revision) ||
      typeof value.dirty !== "boolean" ||
      !Number.isFinite(Date.parse(value.builtAt))
    )
      return unknown;
    return {
      revision: value.revision,
      dirty: value.dirty,
      builtAt: value.builtAt,
      ...(typeof value.sourceDigest === "string"
        ? { sourceDigest: value.sourceDigest }
        : {}),
    };
  } catch {
    return unknown;
  }
}
const execution = Object.freeze(load());
export function executionProvenance(): ExecutionProvenance {
  return { ...execution };
}
