"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  GitCompareArrows,
  LoaderCircle,
} from "lucide-react";
import {
  AppShell,
  EmptyState,
  ErrorNotice,
  PageHeading,
  StatusPill,
} from "../_components/ui";
import {
  EvidenceDrawer,
  Lineage,
  type EvidenceSelection,
} from "../_components/lineage";
import {
  api,
  capOf,
  currencyOf,
  expectedSize,
  faultLabels,
  money,
  type Run,
} from "../_components/types";

export function ComparisonView({
  initialLeft,
  initialRight,
}: {
  initialLeft?: string;
  initialRight?: string;
}) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [leftId, setLeftId] = useState(initialLeft ?? "");
  const [rightId, setRightId] = useState(initialRight ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceSelection | null>(null);
  useEffect(() => {
    let active = true;
    api<{ runs: Run[] }>("/api/v1/runs")
      .then(({ runs: items = [] }) => {
        if (!active) return;
        setRuns(items);
        const recovery = items.find((r) => r.parentId);
        if (!initialLeft)
          setLeftId(recovery?.parentId ?? items[1]?.id ?? items[0]?.id ?? "");
        if (!initialRight) setRightId(recovery?.id ?? items[0]?.id ?? "");
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error ? err.message : "Runs could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialLeft, initialRight]);
  const left = runs.find((run) => run.id === leftId);
  const right = runs.find((run) => run.id === rightId);
  function choose(side: "left" | "right", value: string) {
    if (side === "left") setLeftId(value);
    else setRightId(value);
    const params = new URLSearchParams({
      left: side === "left" ? value : leftId,
      right: side === "right" ? value : rightId,
    });
    window.history.replaceState(null, "", `/compare?${params}`);
  }
  const rows = [
    {
      label: "Test condition",
      get: (r: Run) => faultLabels[r.fault] ?? r.fault,
    },
    {
      label: "Confirmed size",
      get: (r: Run) => expectedSize(r.contract) ?? "Not specified",
    },
    {
      label: "Delivered-total limit",
      get: (r: Run) =>
        capOf(r.contract) === undefined
          ? "Not specified"
          : money(capOf(r.contract), currencyOf(r.contract)),
    },
    {
      label: "Last observed size",
      get: (r: Run) => r.snapshots.at(-1)?.size ?? "Unknown",
    },
    {
      label: "Last observed total",
      get: (r: Run) =>
        money(r.snapshots.at(-1)?.totalMinor, currencyOf(r.contract)),
    },
    { label: "Decision", get: (r: Run) => r.decision.verdict },
    {
      label: "Payment state",
      get: (r: Run) => r.payment.status.replaceAll("_", " "),
    },
    {
      label: "Environment",
      get: (r: Run) =>
        r.mode === "sandbox" ? "PayPal Sandbox" : "Local simulation",
    },
  ];
  return (
    <AppShell title="Compare runs">
      <PageHeading
        title="Compare recorded runs"
        description="Compare recorded attempts against their confirmed intent. A recovery never overwrites the original."
      />
      <ErrorNotice message={error} />
      {loading ? (
        <div className="page-loading" role="status">
          <LoaderCircle size={20} className="spin" />
          Loading your recorded runs…
        </div>
      ) : runs.length < 2 ? (
        <EmptyState title="A useful comparison starts with two runs.">
          Run a fault case and a no-fault case, or try a bounded recovery from a
          wrong-variant result.
        </EmptyState>
      ) : (
        <>
          <div className="compare-selectors">
            <label>
              <span className="field-label">Original / run A</span>
              <select
                value={leftId}
                onChange={(event) => choose("left", event.target.value)}
              >
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.id.slice(0, 10)} ·{" "}
                    {faultLabels[run.fault] ?? run.fault}
                    {run.parentId ? " · Recovery" : ""}
                  </option>
                ))}
              </select>
            </label>
            <GitCompareArrows size={22} />
            <label>
              <span className="field-label">Comparison / run B</span>
              <select
                value={rightId}
                onChange={(event) => choose("right", event.target.value)}
              >
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.id.slice(0, 10)} ·{" "}
                    {faultLabels[run.fault] ?? run.fault}
                    {run.parentId ? " · Recovery" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {left && right ? (
            <>
              <div className="comparison-context">
                <GitCompareArrows size={17} />
                <p>
                  {right.parentId === left.id
                    ? "Run B is a bounded recovery from run A. The original evidence remains unchanged."
                    : leftId === rightId
                      ? "You are viewing the same run on both sides. Select another run to see differences."
                      : "These are separate recorded runs. Differences alone do not establish causation."}
                </p>
              </div>
              {left.contract.hash &&
              right.contract.hash &&
              left.contract.hash !== right.contract.hash ? (
                <div className="unresolved-notice">
                  <strong>The contract differs between these runs.</strong>
                  <p>
                    This is not a comparison under identical confirmed intent.
                  </p>
                </div>
              ) : null}
              <div className="compare-table-wrap">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>Observed fact</th>
                      <th>
                        <span className="mini-label">ORIGINAL / A</span>
                        <StatusPill verdict={left.decision.verdict} />
                      </th>
                      <th>
                        <span className="mini-label">COMPARISON / B</span>
                        <StatusPill verdict={right.decision.verdict} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const a = row.get(left);
                      const b = row.get(right);
                      return (
                        <tr
                          className={a !== b ? "changed-row" : ""}
                          key={row.label}
                        >
                          <th scope="row">{row.label}</th>
                          <td data-column="Original / A">{a}</td>
                          <td data-column="Comparison / B">
                            {a !== b && <ArrowRight size={13} />}
                            <span>{b}</span>
                            {a !== b && (
                              <span className="changed-label">Changed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Full evidence</td>
                      <td>
                        <Link href={`/cases/${encodeURIComponent(left.id)}`}>
                          Open original
                          <ArrowUpRight size={14} />
                        </Link>
                      </td>
                      <td>
                        <Link href={`/cases/${encodeURIComponent(right.id)}`}>
                          Open comparison
                          <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="comparison-lineages">
                <section>
                  <div className="section-heading">
                    <span className="section-number">A</span>
                    <h2>Original trajectory</h2>
                  </div>
                  <Lineage run={left} onInspect={setEvidence} />
                </section>
                <section>
                  <div className="section-heading">
                    <span className="section-number">B</span>
                    <h2>Comparison trajectory</h2>
                  </div>
                  <Lineage run={right} onInspect={setEvidence} />
                </section>
              </div>
            </>
          ) : (
            <EmptyState title="The selected run is unavailable.">
              Choose two runs from this session.
            </EmptyState>
          )}
        </>
      )}
      <EvidenceDrawer selection={evidence} onClose={() => setEvidence(null)} />
    </AppShell>
  );
}
