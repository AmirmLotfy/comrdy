"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type SortChangedEvent,
} from "ag-grid-community";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  Clock3,
  Database,
  Download,
  FileSearch,
  FlaskConical,
  GitBranch,
  Info,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "../_components/ui";
import { api } from "../_components/types";
import {
  buildEvidenceRows,
  evidenceCounts,
  evidenceCsv,
  filterEvidence,
  parseSource,
  type EvidenceFilters,
  type EvidenceRow,
  type SortField,
  type SourceRecords,
} from "./evidence";
import styles from "./workbench.module.css";

const modules = [AllCommunityModule];
const gridTheme = themeQuartz.withParams({
  accentColor: "#0b63f6",
  backgroundColor: "#ffffff",
  foregroundColor: "#142d43",
  headerBackgroundColor: "#edf4fb",
  borderColor: "#d9e3ed",
  rowHoverColor: "#f5f9fe",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  headerFontSize: 11,
  spacing: 6,
  wrapperBorderRadius: 4,
});
const initialFilters: EvidenceFilters = {
  query: "",
  source: "all",
  mode: "all",
  verdict: "all",
  scenario: "all",
  sort: "createdAt",
  direction: "desc",
};
const sortOptions: { value: SortField; label: string }[] = [
  { value: "createdAt", label: "Created time" },
  { value: "scenario", label: "Scenario" },
  { value: "modeLabel", label: "Mode" },
  { value: "verdict", label: "Verdict" },
  { value: "authorization", label: "Authorization fact" },
  { value: "capture", label: "Capture fact" },
  { value: "merchantOrder", label: "Merchant order" },
  { value: "sourceRevision", label: "Source revision" },
  { value: "relationship", label: "Original / recovery" },
  { value: "sourceLabel", label: "Evidence source" },
];
type LoadedSource = { data: SourceRecords | null; error: boolean };
type LoadedEvidence = {
  session: LoadedSource;
  library: LoadedSource;
  readAt: string;
};

function loadResult(result: PromiseSettledResult<unknown>): LoadedSource {
  if (result.status === "rejected") return { data: null, error: true };
  try {
    return { data: parseSource(result.value), error: false };
  } catch {
    return { data: null, error: true };
  }
}

function displayTime(value: string) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(value))
    : "Not recorded";
}

function shortId(value: string) {
  return value.length > 14 ? `${value.slice(0, 10)}…` : value;
}

function Verdict({ value }: { value: string }) {
  return (
    <span className={styles.verdict} data-verdict={value}>
      {value === "ALLOW" ? (
        <Check size={12} aria-hidden="true" />
      ) : value === "DENY" ? (
        <ShieldCheck size={12} aria-hidden="true" />
      ) : (
        <Info size={12} aria-hidden="true" />
      )}
      {value}
    </span>
  );
}

export function JudgeWorkbench() {
  const [loaded, setLoaded] = useState<LoadedEvidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EvidenceFilters>(initialFilters);
  const [exportNotice, setExportNotice] = useState("");
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    // Both sources are GET-only and settle independently. Never discard a usable library.
    const results = await Promise.allSettled([
      api<unknown>("/api/v1/runs"),
      api<unknown>("/api/v1/library"),
    ]);
    if (current !== generation.current) return;
    setLoaded({
      session: loadResult(results[0]),
      library: loadResult(results[1]),
      readAt: new Date().toISOString(),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    return () => {
      generation.current += 1;
    };
  }, [reload]);

  const allRows = useMemo(
    () =>
      buildEvidenceRows(
        loaded?.session.data ?? null,
        loaded?.library.data ?? null,
      ),
    [loaded],
  );
  const counts = useMemo(() => evidenceCounts(allRows), [allRows]);
  const visibleRows = useMemo(
    () => filterEvidence(allRows, filters),
    [allRows, filters],
  );
  const omitted =
    (loaded?.session.data?.omitted ?? 0) + (loaded?.library.data?.omitted ?? 0);
  const partial = !!loaded && (loaded.session.error || loaded.library.error);
  const unavailable = !!loaded && loaded.session.error && loaded.library.error;
  const narrowed =
    !!filters.query ||
    filters.source !== "all" ||
    filters.mode !== "all" ||
    filters.verdict !== "all" ||
    filters.scenario !== "all";

  const columnDefs = useMemo<ColDef<EvidenceRow>[]>(() => {
    const columns: ColDef<EvidenceRow>[] = [
      {
        field: "scenario",
        headerName: "Scenario / record",
        minWidth: 240,
        pinned: "left",
        cellRenderer: ({ data }: ICellRendererParams<EvidenceRow>) =>
          data ? (
            <div className={styles.cellStack}>
              <Link href={data.href} className={styles.recordLink}>
                {data.scenario}
                <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
              <span className={styles.mono}>{shortId(data.id)}</span>
            </div>
          ) : null,
      },
      { field: "modeLabel", headerName: "Mode", minWidth: 155 },
      {
        field: "verdict",
        headerName: "Test verdict",
        minWidth: 130,
        cellRenderer: ({ value }: ICellRendererParams<EvidenceRow, string>) => (
          <Verdict value={value ?? "Not recorded"} />
        ),
      },
      {
        field: "authorization",
        headerName: "Authorization fact",
        minWidth: 235,
      },
      { field: "capture", headerName: "Capture fact", minWidth: 235 },
      { field: "merchantOrder", headerName: "Merchant order", minWidth: 220 },
      {
        field: "paymentState",
        headerName: "Reported payment state",
        minWidth: 215,
        sortable: false,
      },
      {
        field: "runState",
        headerName: "Run state",
        minWidth: 165,
        sortable: false,
      },
      {
        field: "sourceRevision",
        headerName: "Source revision",
        minWidth: 180,
        cellRenderer: ({ data }: ICellRendererParams<EvidenceRow>) =>
          data ? (
            <div className={styles.cellStack}>
              <span className={styles.mono} title={data.sourceRevision}>
                {data.sourceRevision === "Not recorded"
                  ? data.sourceRevision
                  : data.sourceRevision.slice(0, 12)}
              </span>
              <span>{data.revisionState}</span>
            </div>
          ) : null,
      },
      {
        field: "relationship",
        headerName: "Original / recovery",
        minWidth: 195,
        cellRenderer: ({ data }: ICellRendererParams<EvidenceRow>) =>
          data ? (
            <div className={styles.cellStack}>
              <span>{data.relationship}</span>
              {data.parentId && (
                <span className={styles.mono} title={data.parentId}>
                  From {shortId(data.parentId)}
                </span>
              )}
            </div>
          ) : null,
      },
      { field: "sourceLabel", headerName: "Evidence source", minWidth: 260 },
      {
        field: "createdAt",
        headerName: "Created (UTC)",
        minWidth: 200,
        valueFormatter: ({ value }) => displayTime(value ?? ""),
        comparator: (a: string, b: string) =>
          (Date.parse(a) || 0) - (Date.parse(b) || 0),
      },
    ];
    return columns.map((column) => ({
      ...column,
      sort: column.field === filters.sort ? filters.direction : null,
      sortIndex: column.field === filters.sort ? 0 : null,
    }));
  }, [filters.sort, filters.direction]);

  const onGridSort = useCallback((event: SortChangedEvent<EvidenceRow>) => {
    const active = event.api.getColumnState().find((column) => column.sort);
    if (!active || !sortOptions.some((option) => option.value === active.colId))
      return;
    const sort = active.colId as SortField;
    const direction = active.sort === "asc" ? "asc" : "desc";
    setFilters((current) =>
      current.sort === sort && current.direction === direction
        ? current
        : { ...current, sort, direction },
    );
  }, []);

  function exportCsv() {
    if (!visibleRows.length) return;
    const blob = new Blob(["\uFEFF", evidenceCsv(visibleRows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `comrdy-evidence-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportNotice(
      `Prepared a CSV download with ${visibleRows.length} ${visibleRows.length === 1 ? "record" : "records"}. Only the listed metadata and payment facts are included.`,
    );
  }

  return (
    <AppShell section="Review" title="Judge workbench">
      <div className={styles.workbench}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>COMRDY / JUDGE WORKBENCH</span>
            <h1>Commerce Ready.</h1>
            <p>
              A short path from purchase intent
              <br className={styles.desktopBreak} /> to inspectable evidence.
            </p>
            <div className={styles.heroMeta}>
              <span>
                <Clock3 size={14} aria-hidden="true" />
                Suggested review: 3 minutes
              </span>
              <span>Sandbox only</span>
            </div>
          </div>
          <div
            className={styles.boundaryMap}
            aria-label="The evidence boundary"
          >
            <span className={styles.mapTitle}>WHAT TO LOOK FOR</span>
            <div>
              <span>01</span>
              <p>
                Confirmed contract<small>The customer's hard constraints</small>
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                Observed checkout<small>The merchant's actual state</small>
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                Independent payment facts
                <small>Authorization · capture · merchant order</small>
              </p>
            </div>
          </div>
        </header>

        <section
          className={styles.reviewPath}
          aria-label="Suggested three-minute review path"
        >
          <a href="#saved-evidence" className={styles.pathCard}>
            <div className={styles.pathTop}>
              <span>01 / 60 SEC</span>
              <FileSearch size={20} aria-hidden="true" />
            </div>
            <h2>Inspect saved evidence.</h2>
            <p>
              Open a record. Read the verdict alongside the payment facts and
              source revision.
            </p>
            <span className={styles.pathAction}>
              Browse the records <ArrowRight size={16} aria-hidden="true" />
            </span>
          </a>
          <Link
            href="/readiness"
            className={`${styles.pathCard} ${styles.tealCard}`}
          >
            <div className={styles.pathTop}>
              <span>02 / 60 SEC</span>
              <ScanLine size={20} aria-hidden="true" />
            </div>
            <h2>Run the readiness bench.</h2>
            <p>
              Execute local contract and payment-binding checks. No live PayPal
              call or charge.
            </p>
            <span className={styles.pathAction}>
              Open executable checks <ArrowRight size={16} aria-hidden="true" />
            </span>
          </Link>
          <Link href="/demo" className={`${styles.pathCard} ${styles.iceCard}`}>
            <div className={styles.pathTop}>
              <span>03 / 60 SEC</span>
              <FlaskConical size={20} aria-hidden="true" />
            </div>
            <h2>Follow the checkout journey.</h2>
            <p>
              Compile intent, confirm the contract and start a test in the
              active lab environment.
            </p>
            <span className={styles.pathAction}>
              Open the test lab <ArrowRight size={16} aria-hidden="true" />
            </span>
          </Link>
        </section>

        <section
          className={styles.evidenceBoundary}
          aria-label="Evidence qualification boundary"
        >
          <Info size={18} aria-hidden="true" />
          <div>
            <strong>Configuration is not qualification.</strong>
            <p>
              {!loaded
                ? "The source checks below will show which saved records are available."
                : unavailable
                  ? "Neither evidence source could be loaded. No conclusion about available live evidence can be drawn."
                  : counts.sandbox === 0
                    ? `No saved Sandbox records are available in ${partial ? "the loaded source" : "these sources"}. Local checks and simulations do not establish live provider qualification.`
                    : `${counts.sandbox} ${counts.sandbox === 1 ? "record reports" : "records report"} Sandbox mode. Mode, verdict and payment status alone do not establish release qualification.`}
            </p>
          </div>
          <Link href="/docs#payment">
            Read the boundary <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </section>

        <section
          id="saved-evidence"
          className={styles.evidenceSection}
          aria-labelledby="evidence-title"
          aria-busy={loading}
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>ACTUAL RECORDS / READ-ONLY</p>
              <h2 id="evidence-title">Evidence workbench</h2>
              <p className={styles.sectionDescription}>
                Browse the available records. Open any record in saved playback.
              </p>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={loading}
              onClick={() => void reload()}
            >
              {loading ? (
                <LoaderCircle
                  size={15}
                  className={styles.spin}
                  aria-hidden="true"
                />
              ) : (
                <RefreshCw size={15} aria-hidden="true" />
              )}
              {loading ? "Reading sources…" : "Refresh sources"}
            </button>
          </div>

          <div className={styles.sourcePanels}>
            <SourcePanel
              kind="session"
              loaded={loaded?.session}
              loading={loading}
            />
            <SourcePanel
              kind="library"
              loaded={loaded?.library}
              loading={loading}
            />
          </div>
          {partial && (
            <p className={styles.partialNotice} role="status">
              <Info size={15} aria-hidden="true" />
              {unavailable
                ? "Both sources failed. Retry to inspect saved evidence."
                : loaded?.library.error
                  ? "Public library unavailable. Session-response records remain visible, but their publication status cannot be established."
                  : "Session history unavailable. Reviewed public records remain available below."}
            </p>
          )}
          {omitted > 0 && (
            <p className={styles.partialNotice} role="status">
              {omitted} source {omitted === 1 ? "entry was" : "entries were"}{" "}
              excluded because no usable record ID was supplied. Counts below
              include usable, deduplicated records only.
            </p>
          )}

          <dl
            className={styles.counts}
            aria-label="Counts across the complete available dataset"
          >
            <div>
              <dt>Unique saved records</dt>
              <dd>{loaded && !unavailable ? counts.total : "—"}</dd>
              <span>
                {unavailable ? "Sources unavailable" : "All available sources"}
              </span>
            </div>
            <div>
              <dt>Reviewed public records</dt>
              <dd>{loaded?.library.data ? counts.published : "—"}</dd>
              <span>
                {loaded?.library.error
                  ? "Source unavailable"
                  : "Published library"}
              </span>
            </div>
            <div>
              <dt>Session-only records</dt>
              <dd>
                {loaded?.session.data && loaded?.library.data
                  ? counts.session
                  : "—"}
              </dd>
              <span>
                {loaded?.library.error
                  ? "Publication unknown"
                  : "Excludes published IDs"}
              </span>
            </div>
            <div>
              <dt>Sandbox mode records</dt>
              <dd>{loaded && !unavailable ? counts.sandbox : "—"}</dd>
              <span>
                {loaded && !unavailable
                  ? `${counts.simulation} local ${counts.simulation === 1 ? "simulation" : "simulations"}`
                  : "Mode is not provider proof"}
              </span>
            </div>
          </dl>

          <div className={styles.filterPanel}>
            <div className={styles.searchRow}>
              <label className={styles.searchField}>
                <Search size={17} aria-hidden="true" />
                <span className={styles.srOnly}>Search saved evidence</span>
                <input
                  type="search"
                  placeholder="Search scenario, record ID or payment fact…"
                  value={filters.query}
                  onChange={(event) =>
                    setFilters({ ...filters, query: event.target.value })
                  }
                />
              </label>
              <button
                type="button"
                className={styles.exportButton}
                disabled={loading || visibleRows.length === 0}
                onClick={exportCsv}
              >
                <Download size={16} aria-hidden="true" />
                Export visible CSV
              </button>
            </div>
            <div className={styles.filters}>
              <label>
                <span>Source</span>
                <select
                  value={filters.source}
                  onChange={(event) =>
                    setFilters({
                      ...filters,
                      source: event.target.value as EvidenceFilters["source"],
                    })
                  }
                >
                  <option value="all">All sources</option>
                  <option value="published">Reviewed public library</option>
                  <option value="session">Session only</option>
                  <option value="unverified">Publication unknown</option>
                </select>
              </label>
              <label>
                <span>Mode</span>
                <select
                  value={filters.mode}
                  onChange={(event) =>
                    setFilters({
                      ...filters,
                      mode: event.target.value as EvidenceFilters["mode"],
                    })
                  }
                >
                  <option value="all">All modes</option>
                  <option value="sandbox">PayPal Sandbox</option>
                  <option value="simulation">Local simulation</option>
                  <option value="unknown">Not recorded</option>
                </select>
              </label>
              <label>
                <span>Test verdict</span>
                <select
                  value={filters.verdict}
                  onChange={(event) =>
                    setFilters({ ...filters, verdict: event.target.value })
                  }
                >
                  <option value="all">All verdicts</option>
                  <option>ALLOW</option>
                  <option>DENY</option>
                  <option>REVIEW</option>
                  <option>PENDING</option>
                  <option>Not recorded</option>
                </select>
              </label>
              <label>
                <span>Scenario</span>
                <select
                  value={filters.scenario}
                  onChange={(event) =>
                    setFilters({ ...filters, scenario: event.target.value })
                  }
                >
                  <option value="all">All scenarios</option>
                  <option>No injected fault</option>
                  <option>Variant changes to S</option>
                  <option>Shipping exceeds the cap</option>
                  <option>Unknown scenario</option>
                </select>
              </label>
            </div>
            <div className={styles.resultToolbar}>
              <p role="status">
                {loading && !loaded ? (
                  "Reading evidence sources…"
                ) : unavailable ? (
                  "Evidence sources unavailable"
                ) : (
                  <>
                    <strong>{visibleRows.length}</strong> shown /{" "}
                    <strong>{counts.total}</strong> unique records
                    {partial ? " from available sources" : ""}
                  </>
                )}
              </p>
              <div className={styles.sortControls}>
                <label>
                  <span>Sort by</span>
                  <select
                    value={filters.sort}
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        sort: event.target.value as SortField,
                      })
                    }
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={styles.sortDirection}
                  aria-label={
                    filters.direction === "desc"
                      ? "Sort ascending"
                      : "Sort descending"
                  }
                  title={
                    filters.direction === "desc"
                      ? "Sort ascending"
                      : "Sort descending"
                  }
                  onClick={() =>
                    setFilters({
                      ...filters,
                      direction: filters.direction === "desc" ? "asc" : "desc",
                    })
                  }
                >
                  {filters.direction === "desc" ? (
                    <ArrowDown size={15} aria-hidden="true" />
                  ) : (
                    <ArrowUp size={15} aria-hidden="true" />
                  )}
                </button>
                {narrowed && (
                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={() =>
                      setFilters({
                        ...initialFilters,
                        sort: filters.sort,
                        direction: filters.direction,
                      })
                    }
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading && !loaded ? (
            <div className={styles.emptyState} role="status">
              <LoaderCircle
                size={25}
                className={styles.spin}
                aria-hidden="true"
              />
              <h3>Reading the actual records.</h3>
              <p>Session history and the public library load independently.</p>
            </div>
          ) : allRows.length === 0 ? (
            <div className={styles.emptyState}>
              <Database size={29} strokeWidth={1.4} aria-hidden="true" />
              <h3>
                {unavailable
                  ? "The evidence sources are unavailable."
                  : "No saved evidence is available yet."}
              </h3>
              <p>
                {unavailable
                  ? "Refresh the sources to try again. Missing data is not a test result."
                  : "There are no records to inspect in the available sources. The readiness bench can run local checks; the test lab can create a recorded journey."}
              </p>
              <div className={styles.emptyActions}>
                {unavailable ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void reload()}
                    disabled={loading}
                  >
                    Retry sources <RefreshCw size={15} aria-hidden="true" />
                  </button>
                ) : (
                  <>
                    <Link href="/readiness" className={styles.secondaryButton}>
                      Run local checks{" "}
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <Link href="/demo" className={styles.textLink}>
                      Open the test lab{" "}
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className={styles.emptyState}>
              <Search size={26} aria-hidden="true" />
              <h3>No records match these filters.</h3>
              <p>
                The complete dataset still contains {counts.total} unique
                records.
              </p>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setFilters(initialFilters)}
              >
                Clear filters <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <div className={styles.desktopGrid}>
                <AgGridReact<EvidenceRow>
                  modules={modules}
                  theme={gridTheme}
                  rowData={visibleRows}
                  columnDefs={columnDefs}
                  defaultColDef={{
                    sortable: true,
                    resizable: true,
                    editable: false,
                    suppressMovable: true,
                    sortingOrder: ["asc", "desc"],
                    tooltipValueGetter: ({ value }) =>
                      typeof value === "string" ? value : "",
                  }}
                  getRowId={({ data }) => data.id}
                  rowHeight={68}
                  headerHeight={44}
                  suppressMultiSort
                  suppressCsvExport
                  suppressExcelExport
                  enableCellTextSelection
                  ensureDomOrder
                  animateRows={false}
                  onSortChanged={onGridSort}
                  onGridReady={({ api: gridApi }) =>
                    gridApi.setGridAriaProperty(
                      "label",
                      "Saved transaction evidence. Scroll horizontally for separate payment and provenance facts.",
                    )
                  }
                />
              </div>
              <div className={styles.mobileRecords}>
                {visibleRows.map((row) => (
                  <EvidenceCard key={row.id} row={row} />
                ))}
              </div>
            </>
          )}

          <div className={styles.evidenceFooter}>
            <p>
              <Info size={14} aria-hidden="true" />
              CSV contains only record metadata and summarized facts. No
              contracts, buyer data or approval links.
            </p>
            {loaded && <span>Read {displayTime(loaded.readAt)} UTC</span>}
          </div>
          {exportNotice && (
            <p className={styles.exportNotice} role="status">
              {exportNotice}
            </p>
          )}
        </section>

        <section
          className={styles.readingGuide}
          aria-labelledby="reading-guide-title"
        >
          <div>
            <span className={styles.eyebrow}>READ EACH FACT SEPARATELY</span>
            <h2 id="reading-guide-title">
              A verdict is one part
              <br />
              of the story.
            </h2>
            <Link href="/docs#evidence" className={styles.textLink}>
              Open the evidence guide{" "}
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <dl>
            <div>
              <dt>Test verdict</dt>
              <dd>
                Did the observed purchase satisfy the confirmed hard
                constraints?
              </dd>
            </div>
            <div>
              <dt>Authorization</dt>
              <dd>
                What does the saved authorization or void readback actually
                report?
              </dd>
            </div>
            <div>
              <dt>Capture</dt>
              <dd>
                Is there a distinct capture record, and what status and finality
                does it show?
              </dd>
            </div>
            <div>
              <dt>Merchant order</dt>
              <dd>
                Is an order recorded, and is its capture ID linked? A PayPal
                order alone is not capture proof.
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </AppShell>
  );
}

function SourcePanel({
  kind,
  loaded,
  loading,
}: {
  kind: "session" | "library";
  loaded: LoadedSource | undefined;
  loading: boolean;
}) {
  const library = kind === "library";
  return (
    <div
      className={styles.sourcePanel}
      data-state={loaded?.error ? "error" : loaded?.data ? "ready" : "loading"}
    >
      <div className={styles.sourceHeading}>
        <span>
          {library ? (
            <FileSearch size={17} aria-hidden="true" />
          ) : (
            <Database size={17} aria-hidden="true" />
          )}
          {library ? "Reviewed public library" : "Session response"}
        </span>
        <strong>
          {!loaded
            ? "Reading…"
            : loaded.error
              ? "Unavailable"
              : loading
                ? "Refreshing…"
                : `${loaded.data?.runs.length ?? 0} returned`}
        </strong>
      </div>
      <p>
        {library
          ? loaded?.data && loaded.data.runs.length === 0
            ? "No reviewed records are published in the available library."
            : "Published evidence is available to every reviewer. It does not grant private-session access."
          : "The session endpoint includes owned and published records. Published IDs are deduplicated below."}
      </p>
      {library && loaded?.data?.executionRevision && (
        <span className={styles.sourceRevision}>
          Exported execution{" "}
          <code title={loaded.data.executionRevision}>
            {loaded.data.executionRevision.slice(0, 12)}
          </code>
        </span>
      )}
    </div>
  );
}

function EvidenceCard({ row }: { row: EvidenceRow }) {
  return (
    <article className={styles.evidenceCard}>
      <div className={styles.cardHeading}>
        <div>
          <span className={styles.cardSource}>{row.sourceLabel}</span>
          <h3>
            <Link href={row.href}>
              {row.scenario}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </h3>
        </div>
        <Verdict value={row.verdict} />
      </div>
      <div className={styles.cardIdentity}>
        <span className={styles.mono}>{row.id}</span>
        <span>{row.modeLabel}</span>
      </div>
      <dl className={styles.cardFacts}>
        <div>
          <dt>Authorization</dt>
          <dd>{row.authorization}</dd>
        </div>
        <div>
          <dt>Capture</dt>
          <dd>{row.capture}</dd>
        </div>
        <div>
          <dt>Merchant order</dt>
          <dd>{row.merchantOrder}</dd>
        </div>
        <div>
          <dt>Reported payment state</dt>
          <dd>{row.paymentState}</dd>
        </div>
        <div>
          <dt>Run state</dt>
          <dd>{row.runState}</dd>
        </div>
        <div>
          <dt>Source revision</dt>
          <dd>
            <span className={styles.mono}>{row.sourceRevision}</span>
            <small>{row.revisionState}</small>
          </dd>
        </div>
        <div>
          <dt>Relationship</dt>
          <dd>
            {row.relationship}
            {row.parentId && (
              <small className={styles.mono}>Original: {row.parentId}</small>
            )}
          </dd>
        </div>
        <div>
          <dt>Created (UTC)</dt>
          <dd>{displayTime(row.createdAt)}</dd>
        </div>
      </dl>
      <Link href={row.href} className={styles.cardOpen}>
        <GitBranch size={15} aria-hidden="true" />
        Open saved evidence <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}
