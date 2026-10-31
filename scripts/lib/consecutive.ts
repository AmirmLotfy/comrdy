import assert from "node:assert/strict";
type Run = {
  id: string;
  mode: string;
  fault: string;
  parentId?: string;
  createdAt: string;
  execution?: unknown;
};
/** Includes failures and unfinished attempts; selecting around them cannot qualify. */
export function assertLatestConsecutiveRuns(
  all: Run[],
  selected: string[],
  revision: string,
) {
  const chosen = new Set(selected);
  for (const fault of ["none", "variant", "shipping"]) {
    const latest = all
      .filter(
        (r) =>
          r.mode === "sandbox" &&
          !r.parentId &&
          r.fault === fault &&
          (r.execution as { revision?: string })?.revision === revision,
      )
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
      )
      .slice(0, 3);
    assert.equal(
      latest.length,
      3,
      `Three release attempts required for ${fault}`,
    );
    assert.ok(
      latest.every((r) => chosen.has(r.id)),
      `Select the latest three consecutive ${fault} attempts, including failures or unfinished attempts`,
    );
  }
}
