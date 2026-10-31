"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, GitCompareArrows, LoaderCircle } from "lucide-react";
import {
  AppShell,
  EmptyState,
  ErrorNotice,
  PageHeading,
} from "../../_components/ui";
import { RecordedPlayback, RunResult } from "../../_components/lineage";
import {
  api,
  faultLabels,
  isRunPending,
  type Run,
} from "../../_components/types";

export function CaseView({ id }: { id: string }) {
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelled, setCancelled] = useState(false);
  const approvalRequest = useRef<{ key: string; request: Promise<Run> } | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    const params = new URL(window.location.href).searchParams;
    const approved = params.get("paypal") === "approved";
    const orderId = params.get("token");
    setLoading(true);
    setError(null);
    setCancelled(
      params.get("paypal") === "canceled" ||
        params.get("paypal") === "cancelled",
    );
    const isCanceled = ["canceled", "cancelled"].includes(
      params.get("paypal") || "",
    );
    const approvalKey = `${id}:${orderId}:${isCanceled}`;
    if (
      ((approved && orderId) || isCanceled) &&
      approvalRequest.current?.key !== approvalKey
    )
      approvalRequest.current = {
        key: approvalKey,
        request: api<Run>(
          `/api/v1/runs/${encodeURIComponent(id)}/${isCanceled ? "cancel" : "approve"}`,
          {
            orderId,
          },
        ),
      };
    const request =
      ((approved && orderId) || isCanceled) && approvalRequest.current
        ? approvalRequest.current.request
        : api<Run>(`/api/v1/runs/${encodeURIComponent(id)}`);
    request
      .then((data) => {
        if (active) setRun(data);
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : "This run could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    if (!run || !isRunPending(run)) return;
    let active = true;
    const timer = window.setTimeout(
      () =>
        api<Run>(`/api/v1/runs/${encodeURIComponent(run.id)}`)
          .then((next) => {
            if (active) setRun(next);
          })
          .catch((err) => {
            if (active)
              setError(
                err instanceof Error
                  ? err.message
                  : "Could not refresh this run. Reload to continue.",
              );
          }),
      1800,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [run]);
  return (
    <AppShell section="Test lab" title="Transaction evidence">
      <Link className="back-link" href="/demo">
        <ArrowLeft size={14} />
        Back to the test lab
      </Link>
      <PageHeading
        eyebrow="TRANSACTION EVIDENCE"
        title="The decision, with its evidence."
        description={
          run
            ? `${faultLabels[run.fault] ?? run.fault}. Original observations stay attached to this run.`
            : "Inspect the confirmed intent, merchant observations, and payment boundary."
        }
        action={
          run && (
            <Link
              href={`/compare?left=${encodeURIComponent(run.id)}`}
              className="button secondary small"
            >
              <GitCompareArrows size={15} />
              Compare a run
            </Link>
          )
        }
      />
      {cancelled && (
        <div className="unresolved-notice" role="status">
          The PayPal approval window was cancelled. The recorded payment state
          below remains the source of truth.
        </div>
      )}
      <ErrorNotice message={error} />
      {loading ? (
        <div className="page-loading" role="status">
          <LoaderCircle size={20} className="spin" />
          Loading recorded evidence…
        </div>
      ) : run ? (
        <>
          <RunResult
            run={run}
            onRecovered={(next) =>
              router.push(`/cases/${encodeURIComponent(next.id)}`)
            }
          />
          {!isRunPending(run) && <RecordedPlayback key={run.id} run={run} />}
        </>
      ) : (
        <EmptyState title="This run is not available.">
          Open a run from the same demo session, or create a new transaction
          test.
        </EmptyState>
      )}
    </AppShell>
  );
}
