type RecordValue = Record<string, unknown>;
export type EvidenceSource = "published" | "session" | "unverified";

export interface SourceRecords {
  runs: RecordValue[];
  omitted: number;
  executionRevision: string | null;
  exportedAt: string | null;
}

export interface EvidenceRow {
  id: string;
  createdAt: string;
  scenario: string;
  mode: "sandbox" | "simulation" | "unknown";
  modeLabel: string;
  verdict: string;
  runState: string;
  paymentState: string;
  authorization: string;
  capture: string;
  merchantOrder: string;
  sourceRevision: string;
  revisionState: string;
  parentId: string;
  relationship: string;
  source: EvidenceSource;
  sourceLabel: string;
  href: string;
}

export type SortField =
  | "createdAt"
  | "scenario"
  | "modeLabel"
  | "verdict"
  | "authorization"
  | "capture"
  | "merchantOrder"
  | "sourceRevision"
  | "relationship"
  | "sourceLabel";
export interface EvidenceFilters {
  query: string;
  source: "all" | EvidenceSource;
  mode: "all" | EvidenceRow["mode"];
  verdict: string;
  scenario: string;
  sort: SortField;
  direction: "asc" | "desc";
}

const scenarios: Record<string, string> = {
  none: "No injected fault",
  variant: "Variant changes to S",
  shipping: "Shipping exceeds the cap",
};
const authorizationStates = new Set([
  "CREATED",
  "AUTHORIZED",
  "CAPTURED",
  "PARTIALLY_CAPTURED",
  "DENIED",
  "VOIDED",
  "PENDING",
  "EXPIRED",
]);
const captureStates = new Set([
  "COMPLETED",
  "DECLINED",
  "PARTIALLY_REFUNDED",
  "PENDING",
  "REFUNDED",
  "FAILED",
]);

function object(value: unknown): RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function safeState(value: unknown): string {
  const state = text(value).toUpperCase();
  return /^[A-Z][A-Z0-9_ -]{0,47}$/.test(state)
    ? state.replaceAll("_", " ")
    : "Not recorded";
}
function revision(value: unknown): string | null {
  return typeof value === "string" && /^[a-f0-9]{40}$/i.test(value)
    ? value
    : null;
}
function timestamp(value: unknown): string | null {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null;
}

export function parseSource(value: unknown): SourceRecords {
  const payload = object(value);
  if (!Array.isArray(payload.runs))
    throw new Error("Evidence source has no run list.");
  const runs = payload.runs.filter((value): value is RecordValue => {
    const row = object(value);
    return typeof row.id === "string" && row.id.trim().length > 0;
  });
  return {
    runs,
    omitted: payload.runs.length - runs.length,
    executionRevision: revision(payload.executionRevision),
    exportedAt: timestamp(payload.exportedAt),
  };
}

function paymentFacts(run: RecordValue, mode: EvidenceRow["mode"]) {
  const payment = object(run.payment);
  const evidence = object(run.evidence);
  const provider = object(evidence.providerEvidence);
  const voided = object(evidence.voidEvidence);
  const captured = object(evidence.captureEvidence);
  const order = object(run.merchantOrder);
  const authorizationId = text(payment.authorizationId);
  const captureId = text(payment.captureId);
  let authorization = "Not recorded";
  let capture = "Not recorded";

  if (mode === "simulation") {
    authorization = "Simulation only";
    capture =
      payment.status === "SIMULATED_CAPTURE"
        ? "Simulated capture"
        : payment.status === "SIMULATED_VOID"
          ? "Simulated void"
          : "Simulation only";
  } else {
    if (authorizationId) {
      if (text(voided.id) && voided.id !== authorizationId)
        authorization = "Readback ID mismatch";
      else if (
        voided.id === authorizationId &&
        text(voided.orderId) &&
        voided.orderId !== payment.orderId
      )
        authorization = "Readback binding mismatch";
      else if (
        voided.id === authorizationId &&
        authorizationStates.has(text(voided.status))
      )
        authorization = `${text(voided.status)} · saved readback`;
      else if (
        text(provider.authorizationId) &&
        (provider.authorizationId !== authorizationId ||
          provider.caseId !== run.id)
      )
        authorization = "Checkpoint binding mismatch";
      else if (
        provider.authorizationId === authorizationId &&
        provider.caseId === run.id &&
        provider.environment === "sandbox" &&
        authorizationStates.has(text(provider.authorizationStatus))
      )
        authorization = `${text(provider.authorizationStatus)} · checkpoint`;
      else authorization = "ID recorded · status unknown";
    } else if (text(voided.id) || text(provider.authorizationId))
      authorization = "Unbound evidence · inspect";

    if (captureId) {
      if (text(captured.id) && captured.id !== captureId)
        capture = "Readback ID mismatch";
      else if (
        captured.id === captureId &&
        ((text(captured.authorizationId) &&
          captured.authorizationId !== authorizationId) ||
          (text(captured.orderId) && captured.orderId !== payment.orderId))
      )
        capture = "Readback binding mismatch";
      else if (
        captured.id === captureId &&
        captureStates.has(text(captured.status))
      )
        capture = `${text(captured.status)} · ${captured.finalCapture === true ? "final" : captured.finalCapture === false ? "non-final" : "finality unconfirmed"}`;
      else capture = "ID recorded · status unknown";
    } else if (text(captured.id)) capture = "Unbound evidence · inspect";
  }
  const merchantOrder = text(order.id)
    ? mode === "simulation"
      ? "Recorded · simulation"
      : captureId && order.captureId === captureId
        ? "Recorded · capture ID linked"
        : "Recorded · link unverified"
    : "Not recorded";
  return {
    authorization,
    capture,
    merchantOrder,
    paymentState: safeState(payment.status),
  };
}

export function projectEvidence(
  run: RecordValue,
  source: EvidenceSource,
): EvidenceRow {
  const id = text(run.id);
  const execution = object(run.execution);
  const mode =
    run.mode === "sandbox" || run.mode === "simulation" ? run.mode : "unknown";
  const decision = object(run.decision);
  const verdict = ["ALLOW", "DENY", "REVIEW", "PENDING"].includes(
    text(decision.verdict),
  )
    ? text(decision.verdict)
    : "Not recorded";
  const parentId = text(run.parentId);
  return {
    id,
    createdAt: timestamp(run.createdAt) ?? "",
    scenario: scenarios[text(run.fault)] ?? "Unknown scenario",
    mode,
    modeLabel:
      mode === "sandbox"
        ? "PayPal Sandbox"
        : mode === "simulation"
          ? "Local simulation"
          : "Not recorded",
    verdict,
    runState: safeState(run.status),
    ...paymentFacts(run, mode),
    sourceRevision: revision(execution.revision) ?? "Not recorded",
    revisionState:
      execution.dirty === true
        ? "Dirty source"
        : execution.dirty === false
          ? "Clean source recorded"
          : "Source state unknown",
    parentId,
    relationship: parentId ? "Recovery" : "Original",
    source,
    sourceLabel:
      source === "published"
        ? "Reviewed public library"
        : source === "session"
          ? "Session record"
          : "Session response · publication unknown",
    href: `/cases/${encodeURIComponent(id)}?playback=1`,
  };
}

export function buildEvidenceRows(
  session: SourceRecords | null,
  library: SourceRecords | null,
): EvidenceRow[] {
  const records = new Map<string, EvidenceRow>();
  // /runs is already a union. Membership alone is not an ownership assertion.
  for (const run of session?.runs ?? []) {
    const id = text(run.id);
    if (!records.has(id))
      records.set(id, projectEvidence(run, library ? "session" : "unverified"));
  }
  // The public payload wins for published IDs, even when the session union has a newer copy.
  for (const run of library?.runs ?? [])
    records.set(text(run.id), projectEvidence(run, "published"));
  return [...records.values()];
}

export function evidenceCounts(rows: EvidenceRow[]) {
  return {
    total: rows.length,
    published: rows.filter((row) => row.source === "published").length,
    session: rows.filter((row) => row.source === "session").length,
    unverified: rows.filter((row) => row.source === "unverified").length,
    sandbox: rows.filter((row) => row.mode === "sandbox").length,
    simulation: rows.filter((row) => row.mode === "simulation").length,
    recoveries: rows.filter((row) => !!row.parentId).length,
  };
}

export function filterEvidence(
  rows: EvidenceRow[],
  filters: EvidenceFilters,
): EvidenceRow[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return rows
    .filter(
      (row) =>
        (filters.source === "all" || row.source === filters.source) &&
        (filters.mode === "all" || row.mode === filters.mode) &&
        (filters.verdict === "all" || row.verdict === filters.verdict) &&
        (filters.scenario === "all" || row.scenario === filters.scenario) &&
        (!query ||
          [
            row.id,
            row.scenario,
            row.modeLabel,
            row.verdict,
            row.authorization,
            row.capture,
            row.merchantOrder,
            row.sourceRevision,
            row.parentId,
            row.relationship,
            row.sourceLabel,
            row.runState,
            row.paymentState,
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(query)),
    )
    .sort((a, b) => {
      const comparison =
        filters.sort === "createdAt"
          ? (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0)
          : a[filters.sort].localeCompare(b[filters.sort]);
      return (
        (filters.direction === "asc" ? comparison : -comparison) ||
        a.id.localeCompare(b.id)
      );
    });
}

/** A separate allowlist prevents grid columns or newly added API fields expanding exports. */
export const CSV_COLUMNS: readonly {
  title: string;
  field: keyof EvidenceRow;
}[] = [
  { title: "Run ID", field: "id" },
  { title: "Created at (UTC)", field: "createdAt" },
  { title: "Scenario", field: "scenario" },
  { title: "Mode", field: "modeLabel" },
  { title: "Source", field: "sourceLabel" },
  { title: "Verdict", field: "verdict" },
  { title: "Run state", field: "runState" },
  { title: "Reported payment state", field: "paymentState" },
  { title: "Authorization fact", field: "authorization" },
  { title: "Capture fact", field: "capture" },
  { title: "Merchant order fact", field: "merchantOrder" },
  { title: "Source revision", field: "sourceRevision" },
  { title: "Source state", field: "revisionState" },
  { title: "Relationship", field: "relationship" },
  { title: "Original run ID", field: "parentId" },
];

export function csvCell(value: string): string {
  // Escape formula prefixes even after whitespace, and control-character prefixes themselves.
  const escaped =
    /^[\s\u0000-\u001f]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value)
      ? `'${value}`
      : value;
  return `"${escaped.replaceAll('"', '""')}"`;
}

export function evidenceCsv(rows: EvidenceRow[]): string {
  return [
    CSV_COLUMNS.map((column) => csvCell(column.title)).join(","),
    ...rows.map((row) =>
      CSV_COLUMNS.map((column) => csvCell(row[column.field])).join(","),
    ),
  ].join("\r\n");
}
