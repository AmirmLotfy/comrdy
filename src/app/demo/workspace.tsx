"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  CircleDot,
  FileCheck2,
  FlaskConical,
  LoaderCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  AppShell,
  ErrorNotice,
  PageHeading,
  StatusPill,
  useServiceStatus,
} from "../_components/ui";
import {
  EvidenceDrawer,
  RunResult,
  type EvidenceSelection,
} from "../_components/lineage";
import { LiveAccessCode } from "../_components/live-access-code";
import {
  api,
  contractRows,
  DEFAULT_MANDATE,
  faultLabels,
  isRunPending,
  type Contract,
  type Fault,
  type Run,
} from "../_components/types";

export function DemoWorkspace() {
  const { status } = useServiceStatus();
  const [mandate, setMandate] = useState(DEFAULT_MANDATE);
  const [contract, setContract] = useState<Contract | null>(null);
  const [compilationId, setCompilationId] = useState<string | undefined>();
  const [compilerReceipt, setCompilerReceipt] = useState<unknown>(null);
  const [constraintDraft, setConstraintDraft] = useState("");
  const [draftChanged, setDraftChanged] = useState(false);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [fault, setFault] = useState<Fault>("variant");
  const [busy, setBusy] = useState<"compile" | "confirm" | "run" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [evidence, setEvidence] = useState<EvidenceSelection | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [edit, setEdit] = useState(true);
  useEffect(() => {
    let active = true;
    api<{ runs: Run[] }>("/api/v1/runs")
      .then((data) => {
        if (active) setRuns(data.runs ?? []);
      })
      .catch(() => {});
    const approvedRun = new URL(window.location.href).searchParams.get(
      "approvedRun",
    );
    if (approvedRun)
      api<Run>(`/api/v1/runs/${encodeURIComponent(approvedRun)}`)
        .then((data) => {
          if (!active) return;
          setRun(data);
          setContract(data.contract);
          setCompilerReceipt(data.compiler ?? null);
          const priorReview = (
            data.compiler as
              { review?: { compilationId?: unknown } } | undefined
          )?.review;
          setCompilationId(
            typeof priorReview?.compilationId === "string"
              ? priorReview.compilationId
              : undefined,
          );
          setMandate(String(data.contract.mandate ?? DEFAULT_MANDATE));
          setConfirmed(Boolean(data.contract.confirmedAt));
          setEdit(false);
          setConstraintDraft(
            JSON.stringify(data.contract.constraints ?? [], null, 2),
          );
        })
        .catch((err) => {
          if (active)
            setError(
              err instanceof Error
                ? err.message
                : "The approved run could not be loaded.",
            );
        });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!run || !isRunPending(run)) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api<Run>(`/api/v1/runs/${encodeURIComponent(run.id)}`)
        .then((next) => {
          if (!active) return;
          setRun(next);
          setRuns((current) => [
            next,
            ...current.filter((item) => item.id !== next.id),
          ]);
        })
        .catch((err) => {
          if (active)
            setError(
              err instanceof Error
                ? err.message
                : "Run status could not be refreshed. Reload this page to continue.",
            );
        });
    }, 1800);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [run]);

  async function compile() {
    setBusy("compile");
    setError(null);
    setConfirmed(false);
    setContract(null);
    setCompilationId(undefined);
    setCompilerReceipt(null);
    try {
      const data = await api<{
        contract: Contract;
        unresolved?: string[];
        compilationId: string;
      }>("/api/v1/compile", { mandate });
      setContract(data.contract);
      setCompilationId(data.compilationId);
      setConstraintDraft(
        JSON.stringify(data.contract.constraints ?? [], null, 2),
      );
      setDraftChanged(false);
      setUnresolved(
        data.unresolved ??
          (Array.isArray(data.contract.needsResolution)
            ? (data.contract.needsResolution as string[])
            : []),
      );
      setEdit(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The contract could not be compiled.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function confirm() {
    if (!contract) return;
    setBusy("confirm");
    setError(null);
    try {
      const data = await api<{ contract: Contract; compiler: unknown }>(
        "/api/v1/confirm",
        {
          contract: {
            schemaVersion: contract.schemaVersion,
            mandate: contract.mandate,
            constraints: contract.constraints,
            needsResolution: contract.needsResolution,
          },
          ...(compilationId ? { compilationId } : {}),
        },
      );
      setContract(data.contract);
      setCompilerReceipt(data.compiler);
      setConfirmed(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The contract could not be confirmed.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function execute() {
    if (!contract || !confirmed) return;
    setBusy("run");
    setError(null);
    try {
      const next = await api<Run>("/api/v1/runs", { contract, fault });
      setRun(next);
      setRuns((current) => [next, ...current.filter((r) => r.id !== next.id)]);
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The run could not complete.",
      );
    } finally {
      setBusy(null);
    }
  }
  function editMandate(value: string) {
    setMandate(value);
    setCompilationId(undefined);
    setCompilerReceipt(null);
    setConfirmed(false);
    setContract(null);
    setUnresolved([]);
  }
  function applyConstraintEdits() {
    try {
      const constraints: unknown = JSON.parse(constraintDraft);
      if (!Array.isArray(constraints) || constraints.length === 0)
        throw new Error("Use a non-empty JSON array of constraints.");
      if (!contract) return;
      setContract({ ...contract, constraints });
      setCompilerReceipt(null);
      setConfirmed(false);
      setDraftChanged(false);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The constraint JSON is invalid.",
      );
    }
  }

  return (
    <AppShell title="Test lab">
      <PageHeading
        title="Test a transaction"
        description="Confirm the contract, choose a failure, then inspect the decision."
        action={
          <Link
            href="/store"
            target="_blank"
            rel="noopener noreferrer"
            className="button secondary small"
          >
            Open demo store
            <ArrowUpRight size={14} />
          </Link>
        }
      />
      <ol className="setup-progress" aria-label="Test setup progress">
        <li className={contract ? "complete" : "current"}>
          <span>{contract ? <Check size={13} /> : "01"}</span>
          <div>
            <strong>Compile intent</strong>
            <small>
              {contract ? "Contract prepared" : "Start with the instruction"}
            </small>
          </div>
        </li>
        <li className={confirmed ? "complete" : contract ? "current" : ""}>
          <span>{confirmed ? <Check size={13} /> : "02"}</span>
          <div>
            <strong>Confirm constraints</strong>
            <small>{confirmed ? "Intent locked" : "Review the boundary"}</small>
          </div>
        </li>
        <li className={confirmed ? "current" : ""}>
          <span>03</span>
          <div>
            <strong>Run & inspect</strong>
            <small>Choose a controlled failure</small>
          </div>
        </li>
      </ol>
      <div className="lab-context">
        <div>
          <span className="context-dot" />
          <strong>Northpath Supply</strong>
          <span>Controlled merchant</span>
        </div>
        <span>Ocean Shell · Blue · Sandbox-only purchase flow</span>
      </div>
      {status?.accessCodeRequired && <LiveAccessCode />}
      <div className="lab-setup">
        <section className="intent-editor">
          <div className="section-heading">
            <span className="section-number">01</span>
            <h2>Customer intent</h2>
            {contract && (
              <button
                className="button ghost small"
                onClick={() => {
                  setEdit(true);
                  setConfirmed(false);
                }}
                disabled={!!busy}
              >
                Edit instruction
              </button>
            )}
          </div>
          {edit || !contract ? (
            <>
              <label className="field-label" htmlFor="mandate">
                What is the shopper allowed to buy?
              </label>
              <textarea
                id="mandate"
                className="mandate-input"
                value={mandate}
                onChange={(e) => editMandate(e.target.value)}
                rows={5}
                maxLength={6000}
                disabled={!!busy}
              />
              <div className="input-footer">
                <button
                  className="text-button"
                  onClick={() => editMandate(DEFAULT_MANDATE)}
                  disabled={!!busy}
                >
                  <RotateCcw size={12} />
                  Restore example
                </button>
                <span>{mandate.length.toLocaleString()} / 6,000</span>
              </div>
              <p className="field-hint">
                {status?.mode === "sandbox"
                  ? "Review the extracted constraints before authorizing a run."
                  : "Local simulation supports this fixed example. Other instructions require a configured AI compiler."}
              </p>
              <button
                className="button dark"
                onClick={compile}
                disabled={!!busy || !mandate.trim()}
              >
                {busy === "compile" ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <Braces size={15} />
                )}{" "}
                {busy === "compile"
                  ? "Compiling contract…"
                  : "Compile intent contract"}
                <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <blockquote className="confirmed-mandate">“{mandate}”</blockquote>
              <div className="compile-note">
                <Check size={14} />
                Contract prepared for your review.
              </div>
            </>
          )}
        </section>
        <section
          className={`contract-review ${confirmed ? "is-confirmed" : ""}`}
        >
          <div className="section-heading">
            <span className="section-number">02</span>
            <h2>Intent contract</h2>
            {contract && (
              <button
                className="icon-button"
                aria-label="View contract JSON"
                onClick={() =>
                  setEvidence({
                    title: "Intent contract",
                    subtitle: confirmed
                      ? "Confirmed and locked for the run."
                      : "Candidate constraints. Review before confirming.",
                    data: contract,
                  })
                }
              >
                <Braces size={16} />
              </button>
            )}
          </div>
          {!contract ? (
            <div className="contract-placeholder">
              <FileCheck2 size={28} />
              <h3>Waiting for a contract</h3>
              <p>
                Compile the example to review its exact constraints. Your
                confirmation is required before a run.
              </p>
            </div>
          ) : (
            <>
              <dl className="contract-facts">
                {contractRows(contract).map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
              {confirmed && compilerReceipt !== null && (
                <button
                  className="text-button"
                  onClick={() =>
                    setEvidence({
                      title: "Compilation and review history",
                      subtitle:
                        "Server-recorded original candidate, confirmed candidate and changed paths. This history does not authorize payment.",
                      data: compilerReceipt,
                    })
                  }
                >
                  <Braces size={14} /> View compilation and review history
                </button>
              )}
              <details className="contract-source-details">
                <summary>Trace constraints to the original words</summary>
                <dl>
                  {Array.isArray(contract.constraints) &&
                    contract.constraints.map(
                      (item: Record<string, unknown>, index) => (
                        <div key={String(item.id ?? index)}>
                          <dt className="mono">
                            {String(item.path ?? item.id)}
                          </dt>
                          <dd>
                            {typeof item.sourceText === "string" &&
                            item.sourceText
                              ? `“${item.sourceText}”`
                              : "No source phrase recorded; review against the full instruction."}
                          </dd>
                        </div>
                      ),
                    )}
                </dl>
              </details>
              {!confirmed && (
                <details className="constraint-editor">
                  <summary>Edit candidate constraints</summary>
                  <label className="field-label" htmlFor="constraint-json">
                    Constraint JSON
                  </label>
                  <textarea
                    id="constraint-json"
                    className="constraint-json mono"
                    rows={10}
                    spellCheck={false}
                    value={constraintDraft}
                    onChange={(event) => {
                      setConstraintDraft(event.target.value);
                      setDraftChanged(true);
                    }}
                  />
                  <button
                    className="button secondary small"
                    onClick={applyConstraintEdits}
                    disabled={!draftChanged || !!busy}
                  >
                    Apply edits
                  </button>
                  <p className="field-hint">
                    Confirmation validates these constraints on the server.
                    Source phrases should match the original instruction.
                  </p>
                </details>
              )}
              {unresolved.length > 0 && (
                <div className="unresolved-notice" role="alert">
                  <strong>Resolve these before running</strong>
                  <ul>
                    {unresolved.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <button
                    className="text-button"
                    onClick={() => {
                      setEdit(true);
                      setContract(null);
                    }}
                  >
                    Edit the instruction
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}
              {confirmed ? (
                <div className="contract-confirmed">
                  <Check size={16} />
                  <span>Confirmed. The contract stays fixed.</span>
                </div>
              ) : (
                <>
                  <p className="confirmation-hint">
                    Check these constraints against your instruction. Confirming
                    locks the contract for this test.
                  </p>
                  <button
                    className="button dark full"
                    onClick={confirm}
                    disabled={!!busy || unresolved.length > 0 || draftChanged}
                  >
                    {busy === "confirm" ? (
                      <LoaderCircle size={15} className="spin" />
                    ) : (
                      <Check size={15} />
                    )}{" "}
                    {busy === "confirm"
                      ? "Confirming…"
                      : draftChanged
                        ? "Apply edits before confirming"
                        : "Confirm these constraints"}
                  </button>
                </>
              )}
            </>
          )}
        </section>
      </div>
      <section className="fault-section">
        <div className="section-heading">
          <span className="section-number">03</span>
          <h2>Choose the test condition</h2>
          <span className="section-hint">
            Faults are deliberate and recorded.
          </span>
        </div>
        <fieldset className="fault-options" disabled={!!busy}>
          <legend className="sr-only">Injected fault</legend>
          {(
            [
              {
                value: "none",
                title: "No fault",
                detail: "Keep the merchant state unchanged.",
                icon: Check,
              },
              {
                value: "variant",
                title: "Wrong variant",
                detail: "The cart changes medium to small.",
                icon: GitVariantIcon,
              },
              {
                value: "shipping",
                title: "Shipping overrun",
                detail: "The delivered total exceeds $160.",
                icon: ShippingIcon,
              },
            ] as const
          ).map(({ value, title, detail, icon: Icon }) => (
            <label
              className={`fault-option ${fault === value ? "selected" : ""}`}
              key={value}
            >
              <input
                type="radio"
                name="fault"
                value={value}
                checked={fault === value}
                onChange={() => setFault(value)}
              />
              <Icon size={18} />
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
              <span className="radio-indicator" />
            </label>
          ))}
        </fieldset>
        <div className="run-action-row">
          <p>
            <FlaskConical size={15} />
            {status?.mode === "sandbox"
              ? "PayPal Sandbox. No real money."
              : "Local simulation. No PayPal payment is created."}
          </p>
          <button
            className="button dark"
            onClick={execute}
            disabled={!confirmed || !!busy}
          >
            {busy === "run" ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <Play size={14} />
            )}{" "}
            {busy === "run" ? "Running verification…" : "Run transaction test"}
          </button>
        </div>
        {!confirmed && (
          <p className="run-disabled-hint">
            Confirm the intent contract to enable a run.
          </p>
        )}
      </section>
      <ErrorNotice message={error} />
      {busy === "run" && (
        <div className="execution-notice" role="status">
          <LoaderCircle size={18} className="spin" />
          <div>
            <strong>The run is in progress.</strong>
            <p>
              The completed result will show observed checkpoints and the
              payment decision.
            </p>
          </div>
        </div>
      )}
      {run && (
        <div ref={resultRef} className="live-result-section">
          <div className="result-section-label">
            <span className="eyebrow">
              {isRunPending(run) ? "RUN IN PROGRESS" : "THE OBSERVED OUTCOME"}
            </span>
            <span>{faultLabels[run.fault] ?? run.fault}</span>
          </div>
          <RunResult
            run={run}
            compact
            onRecovered={(next) => {
              setRun(next);
              setRuns((current) => [
                next,
                ...current.filter((r) => r.id !== next.id),
              ]);
            }}
          />
        </div>
      )}
      <section className="recent-runs">
        <div className="section-heading">
          <h2>Recent runs</h2>
          <span className="count-label">{runs.length}</span>
        </div>
        {runs.length ? (
          <div className="runs-table-wrap">
            <table className="runs-table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Condition</th>
                  <th>Decision</th>
                  <th>Environment</th>
                  <th>
                    <span className="sr-only">Open run</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 8).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        className="run-link mono"
                        href={`/cases/${encodeURIComponent(item.id)}`}
                      >
                        {item.id.length > 23
                          ? `${item.id.slice(0, 10)}…${item.id.slice(-6)}`
                          : item.id}
                      </Link>
                    </td>
                    <td data-label="Condition">
                      {faultLabels[item.fault] ?? item.fault}
                      {item.parentId && (
                        <span className="inline-note">Recovery</span>
                      )}
                    </td>
                    <td data-label="Decision">
                      <StatusPill
                        verdict={
                          isRunPending(item)
                            ? "PENDING"
                            : item.decision?.verdict
                        }
                      />
                    </td>
                    <td data-label="Environment">
                      <span className="table-mode">
                        {item.mode === "sandbox"
                          ? "PayPal Sandbox"
                          : "Local simulation"}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/cases/${encodeURIComponent(item.id)}`}
                        aria-label={`Open evidence for run ${item.id}`}
                      >
                        <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="recent-empty">
            <CircleDot size={17} />
            <p>
              Your completed runs will appear here. Each keeps its original
              contract and evidence.
            </p>
          </div>
        )}
      </section>
      {runs.length > 0 && <ObservedCounts runs={runs} />}
      <EvidenceDrawer selection={evidence} onClose={() => setEvidence(null)} />
    </AppShell>
  );
}

function ObservedCounts({ runs }: { runs: Run[] }) {
  const unique = Array.from(new Map(runs.map((run) => [run.id, run])).values());
  const groups = new Map<
    string,
    {
      mode: string;
      scenario: string;
      total: number;
      evaluated: number;
      allow: number;
      deny: number;
      review: number;
      excluded: number;
    }
  >();
  for (const run of unique) {
    const scenario = `${faultLabels[run.fault] ?? run.fault}${run.parentId ? " · recovery" : ""}`;
    const key = `${run.mode}:${scenario}`;
    const group = groups.get(key) ?? {
      mode: run.mode === "sandbox" ? "PayPal Sandbox" : "Local simulation",
      scenario,
      total: 0,
      evaluated: 0,
      allow: 0,
      deny: 0,
      review: 0,
      excluded: 0,
    };
    group.total += 1;
    const verdict = run.decision?.verdict;
    if (
      !isRunPending(run) &&
      !["infra_failed", "canceled"].includes(run.status.toLowerCase()) &&
      ["ALLOW", "DENY", "REVIEW"].includes(verdict)
    ) {
      group.evaluated += 1;
      if (verdict === "ALLOW") group.allow += 1;
      else if (verdict === "DENY") group.deny += 1;
      else group.review += 1;
    } else group.excluded += 1;
    groups.set(key, group);
  }
  return (
    <section className="observed-counts">
      <div className="section-heading">
        <h2>Recorded checks by scenario</h2>
        <span className="section-hint">
          Actual counts. Separate environments.
        </span>
      </div>
      <div className="runs-table-wrap">
        <table className="runs-table counts-table">
          <thead>
            <tr>
              <th>Scenario / environment</th>
              <th>Recorded</th>
              <th>Allow / evaluated</th>
              <th>Deny / evaluated</th>
              <th>Review / evaluated</th>
              <th>Not evaluated</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(groups.entries()).map(([key, group]) => (
              <tr key={key}>
                <td>
                  <strong>{group.scenario}</strong>
                  <span className="table-mode">{group.mode}</span>
                </td>
                <td data-label="Recorded">{group.total}</td>
                <td data-label="Allow / evaluated">
                  {group.allow} / {group.evaluated}
                </td>
                <td data-label="Deny / evaluated">
                  {group.deny} / {group.evaluated}
                </td>
                <td data-label="Review / evaluated">
                  {group.review} / {group.evaluated}
                </td>
                <td data-label="Not evaluated">{group.excluded}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="counts-note">
        Counts describe accessible recorded contract decisions, not payment
        success or general reliability. Pending, canceled, and
        infrastructure-failed runs are excluded from the evaluated denominator.
      </p>
    </section>
  );
}

function GitVariantIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="7" r="2" />
      <path d="M6 7v10m12-8c0 5-6 3-12 7" />
    </svg>
  );
}
function ShippingIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M3 17h4m10 0h4V9l-4-4H3v12m14-12v7h4M7 17h6" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="15" cy="18" r="2" />
    </svg>
  );
}
