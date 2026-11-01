"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  FlaskConical,
  LoaderCircle,
  Play,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { AppShell } from "../_components/ui";
import type {
  ReadinessReport,
  ReadinessResult,
  ReadinessScenario,
} from "../../core/readiness";
import { displayValue, dollarsToMinor, safeCsvCell } from "./format";
import styles from "./readiness.module.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const benchTheme = themeQuartz.withParams({
  accentColor: "#0b63f6",
  backgroundColor: "#ffffff",
  foregroundColor: "#0c1117",
  borderColor: "#d9dee5",
  headerBackgroundColor: "#edf4ff",
  headerTextColor: "#334155",
  fontFamily: "var(--font-geist-sans), sans-serif",
  fontSize: 13,
  rowHeight: 48,
  headerHeight: 42,
  wrapperBorderRadius: 4,
  cellHorizontalPadding: 14,
});

interface BenchRow {
  id: string;
  title: string;
  category: string;
  expectedGate: string;
  contractDecision: string;
  gateDecision: string;
  expectationStatus: string;
  blockingRules: string;
  evidenceKind: string;
  paymentActions: number;
}

function Decision({ value }: { value: string }) {
  const tone =
    value === "ALLOW"
      ? styles.allow
      : value === "DENY"
        ? styles.deny
        : value === "REVIEW"
          ? styles.review
          : styles.unrun;
  return <span className={`${styles.decision} ${tone}`}>{value}</span>;
}

function DecisionCell({ value }: ICellRendererParams<BenchRow, string>) {
  return <Decision value={value ?? "Not run"} />;
}

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportJson(report: ReadinessReport) {
  downloadFile(
    `comrdy-readiness-${report.mode}-${report.reportHash.slice(0, 10)}.json`,
    JSON.stringify(report, null, 2),
    "application/json",
  );
}

function CaseDetail({ result }: { result: ReadinessResult }) {
  const failedFacts = result.facts.filter((fact) => fact.outcome !== "pass");
  return (
    <div className={styles.caseDetail}>
      <div className={styles.decisionStrip}>
        <div>
          <span>Contract decision</span>
          <Decision value={result.contract.decision} />
        </div>
        <ArrowRight size={16} aria-hidden="true" />
        <div>
          <span>Payment gate</span>
          <Decision value={result.gate.decision} />
        </div>
        <p>
          {result.gate.decision === "ALLOW"
            ? "Eligible under these synthetic inputs. No payment was attempted."
            : result.gate.decision === "REVIEW"
              ? "Capture blocked: required evidence is incomplete or stale."
              : "Capture blocked: an invariant or payment binding does not match."}
        </p>
      </div>
      {result.expectation ? (
        <p className={styles.expectation}>
          {result.matchedExpectation ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <span aria-hidden="true">!</span>
          )}
          {result.matchedExpectation
            ? "Matches the declared expectation"
            : "Unexpected result — inspect before relying on this case"}
          . Expected contract {result.expectation.contract}; payment gate{" "}
          {result.expectation.gate}.
        </p>
      ) : (
        <p className={styles.expectation}>
          What-if evaluation: no preset verdict or qualification result is
          assigned.
        </p>
      )}

      <div className={styles.detailColumns}>
        <div>
          <h3>What changed</h3>
          {result.changes.length ? (
            <dl className={styles.changes}>
              {result.changes.map((change) => (
                <div key={change.path}>
                  <dt>{change.path}</dt>
                  <dd>
                    <span>{displayValue(change.baseline)}</span>
                    <ArrowRight size={13} aria-label="changed to" />
                    <strong>{displayValue(change.actual)}</strong>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={styles.quiet}>
              All tracked facts match the baseline.
            </p>
          )}
        </div>
        <div>
          <h3>Why this gate result</h3>
          {result.gate.reasons.length ? (
            <ul className={styles.reasons}>
              {result.gate.reasons.map((reason, index) => (
                <li key={`${reason.code}-${index}`}>
                  <code>{reason.code}</code>
                  <p>{reason.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.quiet}>
              Every hard rule passes. The synthetic amount, authorization,
              merchant binding and evidence age also agree.
            </p>
          )}
        </div>
      </div>

      <details
        className={styles.facts}
        open={failedFacts.length > 0}
        key={result.inputHash}
      >
        <summary>
          Inspect {result.facts.length} constraint facts{" "}
          <span>{failedFacts.length} require attention</span>
        </summary>
        <div className={styles.factList}>
          {result.facts.map((fact) => (
            <article className={styles.fact} key={fact.invariantId}>
              <div className={styles.factHeading}>
                <code>{fact.path}</code>
                <span
                  className={
                    fact.outcome === "pass"
                      ? styles.factPass
                      : fact.outcome === "fail"
                        ? styles.factFail
                        : styles.factUnknown
                  }
                >
                  {fact.outcome}
                </span>
              </div>
              <p className={styles.factSource}>
                {fact.sourceText ? (
                  <>
                    Approved phrase: <q>{fact.sourceText}</q>
                  </>
                ) : (
                  "Explicit catalog policy: availability must be true."
                )}
              </p>
              <dl className={styles.factValues}>
                <div>
                  <dt>Expected · {fact.op}</dt>
                  <dd>{displayValue(fact.expected)}</dd>
                </div>
                <div>
                  <dt>Synthetic observation</dt>
                  <dd>{displayValue(fact.observed)}</dd>
                </div>
              </dl>
              <p className={styles.factMessage}>{fact.message}</p>
              <p className={styles.provenance}>
                {fact.invariantId} · {fact.sourceKind} · revision{" "}
                {fact.provenance.revision} · {fact.provenance.kind}
              </p>
            </article>
          ))}
        </div>
      </details>

      <details className={styles.provenanceDetails}>
        <summary>Input identity and evidence boundary</summary>
        <dl className={styles.hashes}>
          <div>
            <dt>Contract hash</dt>
            <dd>{result.contract.contractHash}</dd>
          </div>
          <div>
            <dt>Snapshot hash</dt>
            <dd>{result.contract.snapshotHash}</dd>
          </div>
          <div>
            <dt>Input hash</dt>
            <dd>{result.inputHash}</dd>
          </div>
          <div>
            <dt>Snapshot ID</dt>
            <dd>{result.input.snapshot.id}</dd>
          </div>
          <div>
            <dt>Merchant fixture time</dt>
            <dd>{result.input.snapshot.observedAt}</dd>
          </div>
          <div>
            <dt>Evaluation clock</dt>
            <dd>{result.input.evaluatedAt} · fixed test clock</dd>
          </div>
          <div>
            <dt>Provider source</dt>
            <dd>Synthetic authorization fixture. No PayPal request.</dd>
          </div>
        </dl>
        <p className={styles.quiet}>
          Hashes identify the test inputs. They do not attest merchant truth,
          resolve an authorization or certify a live checkout.
        </p>
      </details>
    </div>
  );
}

function Reproduction({ report }: { report: ReadinessReport }) {
  return (
    <details className={styles.reproduction}>
      <summary>Reproduce this synthetic evaluation</summary>
      <p>
        Schema {report.schemaVersion}. Run against the same code revision. The
        JSON includes all inputs, expected and actual decisions, and stable
        hashes.
      </p>
      <pre>
        <code>{report.reproduction.command}</code>
      </pre>
      <a href={report.reproduction.path} target="_blank" rel="noreferrer">
        Open the JSON response <ArrowRight size={13} />
      </a>
    </details>
  );
}

export function ReadinessBench({
  scenarios,
  schemaVersion,
}: {
  scenarios: readonly ReadinessScenario[];
  schemaVersion: string;
}) {
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [comparison, setComparison] = useState<ReadinessReport | null>(null);
  const [pending, setPending] = useState<"suite" | "compare" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("baseline");
  const [query, setQuery] = useState("");
  const [gateFilter, setGateFilter] = useState("all");
  const [mobileSort, setMobileSort] = useState("suite");
  const [total, setTotal] = useState("148.00");
  const [size, setSize] = useState("M");
  const [quantity, setQuantity] = useState("1");
  const [evidence, setEvidence] = useState("complete");
  const [comparisonDirty, setComparisonDirty] = useState(false);
  const grid = useRef<AgGridReact<BenchRow>>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const columns = useMemo<ColDef<BenchRow>[]>(
    () => [
      { field: "title", headerName: "Scenario", minWidth: 220, flex: 1.7 },
      { field: "category", headerName: "Boundary", minWidth: 150 },
      {
        field: "expectedGate",
        headerName: "Expected gate",
        minWidth: 140,
        cellRenderer: DecisionCell,
      },
      {
        field: "contractDecision",
        headerName: "Contract",
        minWidth: 125,
        cellRenderer: DecisionCell,
      },
      {
        field: "gateDecision",
        headerName: "Actual gate",
        minWidth: 125,
        cellRenderer: DecisionCell,
      },
      { field: "expectationStatus", headerName: "Expectation", minWidth: 150 },
      { field: "evidenceKind", headerName: "Evidence kind", hide: true },
      { field: "paymentActions", headerName: "Payment actions", hide: true },
    ],
    [],
  );
  const rows: BenchRow[] = useMemo(
    () =>
      scenarios.map((scenario) => {
        const result = report?.results.find((item) => item.id === scenario.id);
        return {
          id: scenario.id,
          title: scenario.title,
          category: scenario.category,
          expectedGate: scenario.expectedGate,
          contractDecision: result?.contract.decision ?? "Not run",
          gateDecision: result?.gate.decision ?? "Not run",
          expectationStatus: result
            ? result.matchedExpectation
              ? "Matched"
              : "Unexpected"
            : "Not checked",
          blockingRules:
            result?.gate.reasons.map((reason) => reason.code).join("; ") ?? "",
          evidenceKind: "deterministic-synthetic",
          paymentActions: 0,
        };
      }),
    [scenarios, report],
  );
  const gateRows = rows.filter(
    (row) => gateFilter === "all" || row.gateDecision === gateFilter,
  );
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const visibleRows = gateRows.filter((row) => {
    const text = [
      row.title,
      row.category,
      row.expectedGate,
      row.contractDecision,
      row.gateDecision,
      row.expectationStatus,
    ]
      .join(" ")
      .toLowerCase();
    return searchTerms.every((term) => text.includes(term));
  });
  const mobileRows = [...visibleRows].sort((left, right) =>
    mobileSort === "scenario"
      ? left.title.localeCompare(right.title)
      : mobileSort === "gate"
        ? left.gateDecision.localeCompare(right.gateDecision) ||
          left.title.localeCompare(right.title)
        : 0,
  );
  const selectedScenario =
    scenarios.find((item) => item.id === selectedId) ?? scenarios[0]!;
  const selectedResult = report?.results.find(
    (item) => item.id === selectedScenario.id,
  );

  async function evaluate(mode: "suite" | "compare", params: URLSearchParams) {
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setPending(mode);
    setError(null);
    try {
      const response = await fetch(`/readiness/run?${params.toString()}`, {
        cache: "no-store",
        signal: nextController.signal,
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error ?? "The readiness evaluation could not finish.",
        );
      if (
        body.schemaVersion !== schemaVersion ||
        body.evidenceKind !== "deterministic-synthetic" ||
        !Array.isArray(body.results)
      )
        throw new Error(
          "The readiness response was not the expected synthetic report.",
        );
      if (mode === "suite") setReport(body as ReadinessReport);
      else {
        setComparison(body as ReadinessReport);
        setComparisonDirty(false);
      }
    } catch (issue) {
      if (!nextController.signal.aborted)
        setError(
          issue instanceof Error
            ? issue.message
            : "The readiness evaluation could not finish.",
        );
    } finally {
      if (!nextController.signal.aborted) setPending(null);
    }
  }

  function runSuite() {
    void evaluate(
      "suite",
      new URLSearchParams({ schema: schemaVersion, mode: "suite" }),
    );
  }

  function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minor = dollarsToMinor(total);
    if (minor === null) {
      setError(
        "Enter a delivered total from $138.00 to $250.00, with no more than two decimal places.",
      );
      return;
    }
    void evaluate(
      "compare",
      new URLSearchParams({
        schema: schemaVersion,
        mode: "compare",
        totalMinor: String(minor),
        size,
        quantity,
        evidence,
      }),
    );
  }

  function exportCsv() {
    if (!report) return;
    grid.current?.api.exportDataAsCsv({
      fileName: `comrdy-readiness-visible-${report.reportHash.slice(0, 10)}.csv`,
      columnKeys: [
        "title",
        "category",
        "expectedGate",
        "contractDecision",
        "gateDecision",
        "expectationStatus",
        "evidenceKind",
        "paymentActions",
      ],
      exportedRows: "filteredAndSorted",
      processCellCallback: ({ value }) => safeCsvCell(value),
      processHeaderCallback: ({ column }) =>
        safeCsvCell(column.getColDef().headerName),
    });
  }

  return (
    <AppShell title="Readiness bench" section="Commerce Ready">
      <div className={styles.bench}>
        <header className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>COMMERCE READINESS / 01</p>
            <h1>Make the edge cases visible.</h1>
            <p className={styles.lede}>
              Run {scenarios.length} controlled scenarios through the same
              verification engine that guards checkout. Inspect what passed,
              what changed, and what still needs evidence.
            </p>
            <Link className={styles.textLink} href="/demo">
              Open the interactive test lab <ArrowRight size={15} />
            </Link>
          </div>
          <aside
            className={styles.contractNote}
            aria-label="The shared test contract"
          >
            <span className={styles.eyebrow}>ONE UNCHANGED CONTRACT</span>
            <strong>Ocean Shell · blue · M</strong>
            <dl>
              <div>
                <dt>Quantity</dt>
                <dd>1 item</dd>
              </div>
              <div>
                <dt>Delivered cap</dt>
                <dd>USD 160.00</dd>
              </div>
              <div>
                <dt>Policy</dt>
                <dd>No substitutions. No subscription.</dd>
              </div>
            </dl>
          </aside>
        </header>

        <div className={styles.scope}>
          <FlaskConical size={18} aria-hidden="true" />
          <p>
            <strong>Deterministic synthetic bench.</strong> Merchant and
            authorization facts are fixtures. No AI calls, PayPal requests,
            captures or voids occur here. These results are not a live merchant
            certification.
          </p>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error} Existing results, if shown, belong to the last completed
            evaluation.
          </div>
        )}

        <section
          className={styles.suite}
          aria-labelledby="readiness-suite-heading"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>01 / EXECUTE</p>
              <h2 id="readiness-suite-heading">Constraint coverage</h2>
            </div>
            <button
              className={styles.primaryButton}
              onClick={runSuite}
              disabled={pending !== null}
            >
              {pending === "suite" ? (
                <LoaderCircle
                  size={16}
                  className={styles.spin}
                  aria-hidden="true"
                />
              ) : (
                <Play size={16} aria-hidden="true" />
              )}
              {pending === "suite"
                ? "Evaluating…"
                : report
                  ? "Run suite again"
                  : `Run ${scenarios.length} scenarios`}
            </button>
          </div>
          <div
            className={styles.summary}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p>
              <strong>
                {report?.summary.executedCases ?? 0}/{scenarios.length}
              </strong>{" "}
              cases executed
            </p>
            {report ? (
              <>
                <p>
                  <strong>
                    {report.summary.matchedExpectations}/
                    {report.summary.checkedExpectations}
                  </strong>{" "}
                  expectations matched
                </p>
                <p>
                  <span className={styles.tealDot} />
                  {report.summary.allow} allow
                </p>
                <p>
                  <span className={styles.redDot} />
                  {report.summary.deny} deny
                </p>
                <p>
                  <span className={styles.amberDot} />
                  {report.summary.review} review
                </p>
              </>
            ) : (
              <p>
                Declared expectations are visible below. Actual decisions appear
                after execution.
              </p>
            )}
          </div>

          <div className={styles.tableTools}>
            <label className={styles.search}>
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Find a scenario</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a scenario…"
              />
            </label>
            <label className={styles.filter}>
              <span>Actual gate</span>
              <select
                value={gateFilter}
                onChange={(event) => setGateFilter(event.target.value)}
              >
                <option value="all">All results</option>
                <option value="Not run">Not run</option>
                <option value="ALLOW">Allow</option>
                <option value="DENY">Deny</option>
                <option value="REVIEW">Review</option>
              </select>
            </label>
            <div className={styles.exportTools}>
              <button
                className={styles.secondaryButton}
                disabled={!report || pending !== null}
                onClick={exportCsv}
              >
                <ArrowDownToLine size={14} aria-hidden="true" />
                Visible CSV
              </button>
              <button
                className={styles.secondaryButton}
                disabled={!report || pending !== null}
                onClick={() => report && exportJson(report)}
              >
                <ArrowDownToLine size={14} aria-hidden="true" />
                Full JSON
              </button>
            </div>
          </div>
          <p className={styles.tableCaption}>
            {visibleRows.length} of {scenarios.length} scenarios shown. Filters
            do not change the execution denominator. Select a row, then inspect
            below.
          </p>
          <div className={styles.grid} aria-label="Readiness scenario results">
            <AgGridReact<BenchRow>
              ref={grid}
              theme={benchTheme}
              rowData={gateRows}
              columnDefs={columns}
              defaultColDef={{ sortable: true, resizable: true, flex: 1 }}
              quickFilterText={query}
              quickFilterParser={(value) => value.split(/\s+/).filter(Boolean)}
              getRowId={({ data }) => data.id}
              rowSelection={{
                mode: "singleRow",
                checkboxes: false,
                enableClickSelection: true,
              }}
              onRowClicked={({ data }) => data && setSelectedId(data.id)}
              onSelectionChanged={({ api }) => {
                const selected = api.getSelectedRows()[0];
                if (selected) setSelectedId(selected.id);
              }}
              animateRows={false}
              overlayNoRowsTemplate="No scenarios match the current filters."
            />
          </div>
          <div className={styles.mobileRows}>
            <label className={styles.mobileSort}>
              <span>Sort scenarios</span>
              <select
                value={mobileSort}
                onChange={(event) => {
                  const next = event.target.value;
                  setMobileSort(next);
                  grid.current?.api.applyColumnState({
                    defaultState: { sort: null },
                    state:
                      next === "suite"
                        ? []
                        : [
                            {
                              colId:
                                next === "scenario" ? "title" : "gateDecision",
                              sort: "asc",
                            },
                          ],
                  });
                }}
              >
                <option value="suite">Suite order</option>
                <option value="scenario">Scenario name</option>
                <option value="gate">Actual gate</option>
              </select>
            </label>
            {mobileRows.length ? (
              mobileRows.map((row) => (
                <button
                  className={`${styles.mobileRow} ${row.id === selectedId ? styles.selected : ""}`}
                  key={row.id}
                  aria-pressed={row.id === selectedId}
                  onClick={() => setSelectedId(row.id)}
                >
                  <span className={styles.mobileTitle}>
                    <strong>{row.title}</strong>
                    <span>{row.category}</span>
                  </span>
                  <span className={styles.mobileDecisions}>
                    <span>
                      Expected <Decision value={row.expectedGate} />
                    </span>
                    <span>
                      Actual <Decision value={row.gateDecision} />
                    </span>
                  </span>
                  <span className={styles.mobileOutcome}>
                    {row.expectationStatus}
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </button>
              ))
            ) : (
              <p className={styles.noResults}>
                No scenarios match. Change the search or gate filter.
              </p>
            )}
          </div>
          <p className={styles.gridCredit}>
            AG Grid Community powers sorting, quick filtering and CSV export.
            JSON includes the complete reproduction inputs.
          </p>
        </section>

        <section
          className={styles.inspection}
          id="readiness-detail"
          aria-labelledby="readiness-detail-heading"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / INSPECT</p>
              <h2 id="readiness-detail-heading">{selectedScenario.title}</h2>
            </div>
            <label className={styles.scenarioPicker}>
              <span className="sr-only">Scenario to inspect</span>
              <select
                value={selectedScenario.id}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {scenarios.map((scenario) => (
                  <option value={scenario.id} key={scenario.id}>
                    {scenario.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className={styles.sectionDescription}>
            {selectedScenario.description}
          </p>
          {selectedResult ? (
            <CaseDetail result={selectedResult} />
          ) : (
            <div className={styles.notExecuted}>
              <span className={styles.sequence}>—</span>
              <div>
                <h3>This case has not run.</h3>
                <p>
                  Expected contract: {selectedScenario.expectedContract}.
                  Expected payment gate: {selectedScenario.expectedGate}. Run
                  the suite to inspect the actual facts and decisions.
                </p>
              </div>
            </div>
          )}
          {report && <Reproduction report={report} />}
        </section>

        <section
          className={styles.composer}
          aria-labelledby="readiness-composer-heading"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>03 / CHANGE THE INPUT</p>
              <h2 id="readiness-composer-heading">Try a bounded what-if.</h2>
            </div>
            <SlidersHorizontal size={20} aria-hidden="true" />
          </div>
          <p className={styles.sectionDescription}>
            Change checkout facts while keeping the confirmed contract fixed.
            Compare with the matching baseline; this does not add a new
            qualified scenario to the suite.
          </p>
          <form
            onSubmit={compare}
            className={styles.composerForm}
            onChange={() => setComparisonDirty(true)}
          >
            <label>
              <span>Delivered total · USD</span>
              <input
                type="number"
                inputMode="decimal"
                min="138"
                max="250"
                step="0.01"
                required
                disabled={pending !== null}
                value={total}
                onChange={(event) => setTotal(event.target.value)}
              />
              <small>$138.00–$250.00; shipping changes.</small>
            </label>
            <label>
              <span>Observed size</span>
              <select
                value={size}
                disabled={pending !== null}
                onChange={(event) => setSize(event.target.value)}
              >
                <option value="M">M · approved</option>
                <option value="S">S · substituted</option>
              </select>
            </label>
            <label>
              <span>Observed quantity</span>
              <select
                value={quantity}
                disabled={pending !== null}
                onChange={(event) => setQuantity(event.target.value)}
              >
                <option value="1">1 item</option>
                <option value="2">2 items</option>
              </select>
              <small>Quote held fixed to isolate quantity.</small>
            </label>
            <label>
              <span>Merchant evidence</span>
              <select
                value={evidence}
                disabled={pending !== null}
                onChange={(event) => setEvidence(event.target.value)}
              >
                <option value="complete">Complete and fresh</option>
                <option value="missing-total">Delivered total omitted</option>
                <option value="stale">Older than five minutes</option>
              </select>
            </label>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={pending !== null}
            >
              {pending === "compare" ? (
                <LoaderCircle
                  size={16}
                  className={styles.spin}
                  aria-hidden="true"
                />
              ) : (
                <ArrowRight size={16} aria-hidden="true" />
              )}
              {pending === "compare" ? "Comparing…" : "Evaluate what-if"}
            </button>
          </form>
          {comparison ? (
            <div className={styles.comparisonResult}>
              {comparisonDirty && (
                <p className={styles.staleNotice}>
                  Inputs have changed. The result below is from the previous
                  evaluation; evaluate again to update it.
                </p>
              )}
              <div className={styles.comparisonHeader}>
                <div>
                  <span>Matching baseline</span>
                  <Decision value={comparison.results[0]!.gate.decision} />
                </div>
                <ArrowRight size={18} aria-hidden="true" />
                <div>
                  <span>Evaluated what-if</span>
                  <Decision value={comparison.results[1]!.gate.decision} />
                </div>
                <button
                  className={styles.secondaryButton}
                  onClick={() => exportJson(comparison)}
                >
                  <ArrowDownToLine size={14} aria-hidden="true" />
                  Comparison JSON
                </button>
              </div>
              <CaseDetail result={comparison.results[1]!} />
              <Reproduction report={comparison} />
            </div>
          ) : (
            <p className={styles.composerHint}>
              No what-if evaluation yet. The original contract is never edited
              by these controls.
            </p>
          )}
        </section>

        <footer className={styles.boundaryFooter}>
          <span className={styles.eyebrow}>THE NEXT EVIDENCE BOUNDARY</span>
          <p>
            This bench checks deterministic behavior against synthetic inputs.
            Browser execution, provider authorization, capture and void
            reconciliation remain separate checks in the{" "}
            <Link href="/demo">test lab</Link>.
          </p>
        </footer>
      </div>
    </AppShell>
  );
}
