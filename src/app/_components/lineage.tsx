"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Copy,
  FileJson2,
  GitCompareArrows,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  api,
  approvalLink,
  capOf,
  currencyOf,
  expectedSize,
  isRunPending,
  money,
  type Run,
  type Snapshot,
} from "./types";
import { EnvironmentBadge, ErrorNotice, StatusPill } from "./ui";

const checkpointNames: Record<string, string> = {
  SELECTED: "Agent selection",
  CART: "Cart created",
  CHECKOUT: "Checkout",
  AUTHORIZED: "Authorization",
  CAPTURED: "Capture",
  VOIDED: "Void",
};
export function checkpointName(value: string) {
  return (
    checkpointNames[value] ??
    value
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase())
  );
}

export interface EvidenceSelection {
  title: string;
  subtitle?: string;
  data: unknown;
}

export function EvidenceDrawer({
  selection,
  onClose,
}: {
  selection: EvidenceSelection | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    if (selection && dialog && !dialog.open) {
      dialog.showModal();
      setCopied(false);
      setCopyError(false);
    } else if (!selection && dialog?.open) dialog.close();
  }, [selection]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(selection?.data, null, 2),
      );
      setCopied(true);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <dialog
      ref={ref}
      className="evidence-drawer"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          event.clientX < event.currentTarget.getBoundingClientRect().left
        )
          onClose();
      }}
      aria-labelledby="evidence-heading"
    >
      <div className="drawer-header">
        <span className="mini-label">
          <FileJson2 size={14} />
          SOURCE EVIDENCE
        </span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close evidence"
        >
          <X size={19} />
        </button>
      </div>
      <div className="drawer-body">
        <h2 id="evidence-heading">{selection?.title}</h2>
        {selection?.subtitle && <p className="muted">{selection.subtitle}</p>}
        <div className="code-toolbar">
          <span>Recorded payload</span>
          <button className="button ghost small" onClick={copy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}{" "}
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>
        <pre className="evidence-code">
          <code>{JSON.stringify(selection?.data, null, 2)}</code>
        </pre>
        {copyError && (
          <p role="alert" className="field-error">
            Copy is unavailable. Select the JSON above to copy it.
          </p>
        )}
        <p className="evidence-footnote">
          A recorded observation is evidence of this run only. Local simulation
          does not establish a PayPal payment outcome.
        </p>
      </div>
    </dialog>
  );
}

export function Lineage({
  run,
  onInspect,
  illustrative = false,
}: {
  run: Run;
  onInspect?: (evidence: EvidenceSelection) => void;
  illustrative?: boolean;
}) {
  const table = useRef<HTMLDivElement>(null);
  const size = expectedSize(run.contract);
  const cap = capOf(run.contract);
  const currency = currencyOf(run.contract);
  const snapshots = run.snapshots ?? [];
  const firstDrift = snapshots.findIndex(
    (s) =>
      (size !== undefined && s.size !== null && s.size !== size) ||
      (cap !== undefined &&
        typeof s.totalMinor === "number" &&
        s.totalMinor > cap),
  );
  const rows: {
    key: string;
    label: string;
    expected: string;
    value: (s: Snapshot) => string;
    invalid: (s: Snapshot) => boolean;
    unknown: (s: Snapshot) => boolean;
  }[] = [
    {
      key: "size",
      label: "Size",
      expected: size ?? "Not specified",
      value: (s) => s.size ?? "Unknown",
      invalid: (s) => size !== undefined && s.size !== null && s.size !== size,
      unknown: (s) => s.size === null || s.size === undefined,
    },
    {
      key: "total",
      label: "Final total",
      expected:
        cap === undefined ? "Not specified" : `≤ ${money(cap, currency)}`,
      value: (s) => money(s.totalMinor, currency),
      invalid: (s) =>
        cap !== undefined &&
        typeof s.totalMinor === "number" &&
        s.totalMinor > cap,
      unknown: (s) => s.totalMinor === null || s.totalMinor === undefined,
    },
  ];
  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    const buttons = Array.from(
      table.current?.querySelectorAll<HTMLButtonElement>(
        "[data-evidence-cell]",
      ) ?? [],
    );
    const index = buttons.indexOf(event.currentTarget);
    const step =
      event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowLeft"
          ? -1
          : event.key === "ArrowDown"
            ? snapshots.length
            : event.key === "ArrowUp"
              ? -snapshots.length
              : 0;
    if (step && buttons[index + step]) {
      event.preventDefault();
      buttons[index + step].focus();
    }
  }
  return (
    <div className="lineage-panel">
      <div className="panel-heading">
        <div>
          <h3>Constraint evidence</h3>
        </div>
        <span className="lineage-legend">
          <span className="legend-dot" />
          {illustrative ? "Illustrative example" : "Select a value to inspect"}
        </span>
      </div>
      <div className="lineage-scroll" ref={table}>
        <table className="lineage-table">
          <thead>
            <tr>
              <th scope="col">Constraint</th>
              <th scope="col" className="mandate-column">
                Confirmed intent
              </th>
              {snapshots.map((snapshot, i) => (
                <th scope="col" key={`${snapshot.checkpoint}-${i}`}>
                  <span className="checkpoint-index">
                    {String(i + 1).padStart(2, "0")}
                    <ArrowRight size={11} />
                  </span>
                  {checkpointName(snapshot.checkpoint)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td className="mandate-column">
                  <strong>{row.expected}</strong>
                </td>
                {snapshots.map((snapshot, index) => {
                  const invalid = row.invalid(snapshot);
                  const first =
                    invalid && index === snapshots.findIndex(row.invalid);
                  const content = (
                    <>
                      <span>{row.value(snapshot)}</span>
                      {first ? (
                        <span className="cell-annotation">First drift</span>
                      ) : invalid ? (
                        <span className="cell-annotation">Outside intent</span>
                      ) : row.unknown(snapshot) ? (
                        <span className="cell-annotation">
                          Evidence missing
                        </span>
                      ) : (
                        <span className="cell-source">Observed</span>
                      )}
                    </>
                  );
                  return (
                    <td
                      className={`${invalid ? (first ? "drift-cell" : "propagated-cell") : row.unknown(snapshot) ? "unknown-cell" : ""}`}
                      key={`${snapshot.checkpoint}-${index}`}
                    >
                      {onInspect ? (
                        <button
                          type="button"
                          data-evidence-cell
                          onKeyDown={navigate}
                          onClick={() =>
                            onInspect({
                              title: `${row.label} · ${checkpointName(snapshot.checkpoint)}`,
                              subtitle: `Source: ${snapshot.source}. Revision ${snapshot.revision}.`,
                              data: {
                                mode: run.mode,
                                expected: row.expected,
                                observed: row.value(snapshot),
                                snapshot,
                              },
                            })
                          }
                          className="lineage-value"
                        >
                          {content}
                        </button>
                      ) : (
                        <div className="lineage-value">{content}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lineage-mobile">
        <div className="mobile-contract-summary">
          <span>Confirmed intent</span>
          <strong>
            Size {size ?? "unspecified"} ·{" "}
            {cap === undefined
              ? "No total specified"
              : `≤ ${money(cap, currency)}`}
          </strong>
        </div>
        {snapshots.map((snapshot, index) => (
          <section
            className="checkpoint-card"
            key={`${snapshot.checkpoint}-${index}`}
            aria-label={checkpointName(snapshot.checkpoint)}
          >
            <header>
              <span className="mono">{String(index + 1).padStart(2, "0")}</span>
              <h4>{checkpointName(snapshot.checkpoint)}</h4>
              <span>Revision {snapshot.revision}</span>
            </header>
            {rows.map((row) => {
              const invalid = row.invalid(snapshot);
              const unknown = row.unknown(snapshot);
              const content = (
                <>
                  <span>{row.label}</span>
                  <span className="checkpoint-values">
                    <span>{row.expected}</span>
                    <ArrowRight size={14} />
                    <strong>{row.value(snapshot)}</strong>
                  </span>
                  <small>
                    {invalid
                      ? index === snapshots.findIndex(row.invalid)
                        ? "First drift"
                        : "Outside intent"
                      : unknown
                        ? "Evidence missing"
                        : "Observed"}
                    {onInspect && <ArrowUpRight size={12} />}
                  </small>
                </>
              );
              return onInspect ? (
                <button
                  key={row.key}
                  className={`checkpoint-fact ${invalid ? "invalid" : unknown ? "unknown" : ""}`}
                  onClick={() =>
                    onInspect({
                      title: `${row.label} · ${checkpointName(snapshot.checkpoint)}`,
                      subtitle: `Source: ${snapshot.source}. Revision ${snapshot.revision}.`,
                      data: {
                        mode: run.mode,
                        expected: row.expected,
                        observed: row.value(snapshot),
                        snapshot,
                      },
                    })
                  }
                >
                  {content}
                </button>
              ) : (
                <div
                  key={row.key}
                  className={`checkpoint-fact ${invalid ? "invalid" : unknown ? "unknown" : ""}`}
                >
                  {content}
                </div>
              );
            })}
          </section>
        ))}
      </div>
      <div className={`lineage-caption ${firstDrift >= 0 ? "has-drift" : ""}`}>
        {firstDrift >= 0 ? (
          <>
            <ArrowDownLeftIcon />
            <span>
              First observed divergence at{" "}
              <strong>
                {checkpointName(snapshots[firstDrift].checkpoint)}
              </strong>
              . The original intent stays unchanged.
            </span>
          </>
        ) : (
          <>
            <Check size={15} />
            <span>
              {snapshots.length
                ? "These observed values remain within the displayed constraints."
                : "Run a mission to collect merchant observations."}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function ArrowDownLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 8v10h10" />
    </svg>
  );
}

export function RunResult({
  run,
  onRecovered,
  compact = false,
}: {
  run: Run;
  onRecovered?: (run: Run) => void;
  compact?: boolean;
}) {
  const [evidence, setEvidence] = useState<EvidenceSelection | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState<Run | null>(null);
  const denied = run.decision?.verdict === "DENY";
  const allowed = run.decision?.verdict === "ALLOW";
  const simulated = run.mode !== "sandbox";
  const pending = isRunPending(run);
  const approveUrl = approvalLink(run);
  async function recover() {
    setRecovering(true);
    setRecoveryError(null);
    try {
      const next = await api<Run>(
        `/api/v1/runs/${encodeURIComponent(run.id)}/recover`,
        {},
      );
      setRecovered(next);
      onRecovered?.(next);
    } catch (error) {
      setRecoveryError(
        error instanceof Error ? error.message : "Recovery could not complete.",
      );
    } finally {
      setRecovering(false);
    }
  }
  return (
    <div className="run-result" aria-live="polite">
      <div
        className={`result-verdict ${pending ? "is-pending" : allowed ? "is-allowed" : denied ? "is-denied" : "is-review"}`}
      >
        <div className="verdict-symbol">
          {pending ? (
            <LoaderCircle size={22} className="spin" />
          ) : allowed ? (
            <Check size={22} />
          ) : denied ? (
            <ArrowDownLeftIcon />
          ) : (
            <CircleDot size={22} />
          )}
        </div>
        <div>
          <p className="mini-label">
            {pending
              ? "RUN IN PROGRESS"
              : simulated
                ? "LOCAL VERIFICATION RESULT"
                : "VERIFICATION RESULT"}
          </p>
          <h2>
            {pending
              ? run.status === "awaiting_approval"
                ? "Your Sandbox approval is needed."
                : "The transaction is still in progress."
              : allowed
                ? "The purchase matches the contract."
                : denied
                  ? "The payment can pass. The purchase cannot."
                  : "More evidence is needed."}
          </h2>
          <p>{run.decision?.reason || "The run is gathering evidence."}</p>
        </div>
        <StatusPill verdict={pending ? "PENDING" : run.decision?.verdict}>
          {pending
            ? run.status.replaceAll("_", " ")
            : allowed
              ? "Intent preserved"
              : denied
                ? "Capture blocked"
                : "Review required"}
        </StatusPill>
      </div>
      {approveUrl && run.status === "awaiting_approval" && (
        <div className="approval-callout">
          <div>
            <strong>Continue in PayPal Sandbox.</strong>
            <p>
              Approve this test authorization with a Sandbox buyer account.
              COMRDY will then verify the transaction before capture.
            </p>
          </div>
          <a
            className="button brand"
            href={approveUrl}
            target="_blank"
            rel="noreferrer"
          >
            Approve in PayPal Sandbox
            <ArrowUpRight size={12} />
          </a>
        </div>
      )}
      <div className="result-toolbar">
        <span className="run-id">
          RUN <code>{run.id}</code>
        </span>
        <EnvironmentBadge mode={run.mode} />
        <div className="result-toolbar-actions">
          <button
            className="button small secondary"
            onClick={() =>
              setEvidence({
                title: "Confirmed intent contract",
                subtitle: "The contract supplied to this run.",
                data: run.contract,
              })
            }
          >
            <Braces size={14} />
            Contract
          </button>
          {compact && (
            <Link
              href={`/cases/${encodeURIComponent(run.id)}`}
              className="button small ghost"
            >
              Full evidence
              <ArrowUpRight size={12} />
            </Link>
          )}
        </div>
      </div>
      <Lineage run={run} onInspect={setEvidence} />
      <div className="result-detail-grid">
        <section className="payment-panel">
          <div className="panel-heading">
            <div>
              <span className="mini-label">PAYMENT BOUNDARY</span>
              <h3>Authorization is not capture.</h3>
            </div>
            <CircleDot size={18} />
          </div>
          {simulated && (
            <div className="simulation-note">
              <FlaskIcon />
              <p>
                <strong>Local simulation.</strong> No PayPal authorization or
                capture has occurred.
              </p>
            </div>
          )}
          <dl className="payment-facts">
            <div>
              <dt>Environment</dt>
              <dd>{simulated ? "Local simulation" : "PayPal Sandbox"}</dd>
            </div>
            <div>
              <dt>
                {simulated ? "Simulated payment state" : "Provider state"}
              </dt>
              <dd>{run.payment?.status?.replaceAll("_", " ") || "Unknown"}</dd>
            </div>
            <div>
              <dt>Authorization ID</dt>
              <dd className="mono">
                {simulated
                  ? "Not sent to PayPal"
                  : run.payment?.authorizationId || "Not available"}
              </dd>
            </div>
            <div>
              <dt>Capture ID</dt>
              <dd className="mono">
                {simulated
                  ? "Not sent to PayPal"
                  : run.payment?.captureId || "No capture recorded"}
              </dd>
            </div>
          </dl>
          <button
            className="evidence-link"
            onClick={() =>
              setEvidence({
                title: "Payment evidence",
                subtitle: simulated
                  ? "This is simulated payment state, not a provider response."
                  : "Recorded PayPal Sandbox payment state.",
                data: {
                  mode: run.mode,
                  payment: run.payment,
                  evidence: run.evidence ?? null,
                },
              })
            }
          >
            Inspect payment evidence
            <ArrowRight size={14} />
          </button>
        </section>
        <section className="event-panel">
          <div className="panel-heading">
            <div>
              <span className="mini-label">RUN HISTORY</span>
              <h3>A trace you can inspect.</h3>
            </div>
            <span className="count-label">
              {run.events?.length ?? 0} events
            </span>
          </div>
          <ol className="event-timeline">
            {(run.events ?? []).map((event, i) => (
              <li key={`${event.time}-${i}`}>
                <span className="timeline-node" />
                <button
                  onClick={() =>
                    setEvidence({
                      title: event.title,
                      subtitle: event.detail,
                      data: { mode: run.mode, ...event },
                    })
                  }
                >
                  <span className="event-title">
                    {event.title}
                    <ChevronRight size={13} />
                  </span>
                  <span className="event-description">{event.detail}</span>
                  <time className="event-time">{formatTime(event.time)}</time>
                </button>
              </li>
            ))}
          </ol>
          {!run.events?.length && (
            <p className="muted panel-pad">No events have been recorded yet.</p>
          )}
        </section>
      </div>
      {!pending &&
        denied &&
        run.fault === "variant" &&
        !run.parentId &&
        !recovered && (
          <section className="recovery-panel">
            <div className="recovery-icon">
              <RotateCcw size={21} />
            </div>
            <div>
              <span className="mini-label">ONE BOUNDED RECOVERY</span>
              <h3>Get back to the original intent.</h3>
              <p>
                Restore the confirmed variant, then verify a fresh attempt. The
                size and spending limit remain unchanged.
              </p>
            </div>
            <button
              className="button dark"
              onClick={recover}
              disabled={recovering}
            >
              {recovering ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                <RotateCcw size={15} />
              )}{" "}
              {recovering
                ? "Reverifying…"
                : `Restore ${expectedSize(run.contract) ? `size ${expectedSize(run.contract)}` : "the variant"} & reverify`}
            </button>
          </section>
        )}
      <ErrorNotice message={recoveryError} />
      {(recovered || run.parentId) && (
        <div className="comparison-callout">
          <GitCompareArrows size={18} />
          <div>
            <strong>
              {recovered
                ? "A separate recovery attempt is recorded."
                : "This is a recovery attempt."}
            </strong>
            <span>The original run and its evidence remain available.</span>
          </div>
          <Link
            className="button secondary small"
            href={`/compare?left=${encodeURIComponent(run.parentId || run.id)}&right=${encodeURIComponent(recovered?.id || run.id)}`}
          >
            Compare attempts
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
      <EvidenceDrawer selection={evidence} onClose={() => setEvidence(null)} />
    </div>
  );
}

export function RecordedPlayback({ run }: { run: Run }) {
  const events = run.events ?? [];
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceSelection | null>(null);
  useEffect(() => {
    if (!playing || index >= events.length - 1) return;
    const timer = window.setTimeout(
      () => setIndex((current) => current + 1),
      1600,
    );
    return () => window.clearTimeout(timer);
  }, [playing, index, events.length]);
  const atEnd = index >= events.length - 1;
  const event = events[Math.min(index, events.length - 1)];
  if (!event) return null;
  return (
    <section className="recorded-playback">
      <div className="panel-heading">
        <div>
          <span className="mini-label">READ-ONLY PLAYBACK</span>
          <h3>Walk through the recorded events.</h3>
        </div>
        <span className="count-label">
          {index + 1} / {events.length}
        </span>
      </div>
      <div className="playback-body">
        <div className="playback-stage" aria-live="polite">
          <span className="playback-event-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <time>{formatTime(event.time)}</time>
            <h3>{event.title}</h3>
            <p>{event.detail}</p>
          </div>
          <button
            className="icon-button"
            aria-label="Inspect this recorded event"
            onClick={() =>
              setEvidence({
                title: event.title,
                subtitle: "Saved event playback; no new execution.",
                data: { mode: run.mode, ...event },
              })
            }
          >
            <Braces size={17} />
          </button>
        </div>
        <div className="playback-controls">
          <button
            className="icon-button"
            aria-label="Previous recorded event"
            disabled={index === 0}
            onClick={() => {
              setPlaying(false);
              setIndex((current) => Math.max(0, current - 1));
            }}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="button secondary small"
            onClick={() => {
              if (atEnd) {
                setIndex(0);
                setPlaying(true);
              } else setPlaying(!playing);
            }}
          >
            {playing && !atEnd ? <Pause size={13} /> : <Play size={13} />}{" "}
            {playing && !atEnd ? "Pause" : atEnd ? "Play again" : "Play events"}
          </button>
          <button
            className="icon-button"
            aria-label="Next recorded event"
            disabled={atEnd}
            onClick={() => {
              setPlaying(false);
              setIndex((current) => Math.min(events.length - 1, current + 1));
            }}
          >
            <ChevronRight size={17} />
          </button>
          <label className="sr-only" htmlFor="event-playback-position">
            Recorded event
          </label>
          <input
            id="event-playback-position"
            type="range"
            min={0}
            max={Math.max(0, events.length - 1)}
            value={index}
            aria-valuetext={event.title}
            onChange={(e) => {
              setPlaying(false);
              setIndex(Number(e.target.value));
            }}
          />
        </div>
        <p className="playback-disclaimer">
          Replays saved observations only. This does not call the agent or
          create another transaction.
        </p>
      </div>
      <EvidenceDrawer selection={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}
function FlaskIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path d="M9 3h6m-5 0v7L4 20h16l-6-10V3M8 15h8" />
    </svg>
  );
}
function formatTime(value: string) {
  const time = new Date(value);
  return Number.isNaN(time.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(time);
}
