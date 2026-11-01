import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEvidenceRows,
  csvCell,
  evidenceCounts,
  evidenceCsv,
  filterEvidence,
  parseSource,
  projectEvidence,
  type EvidenceFilters,
} from "../src/app/judges/evidence";

const base = (
  id: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id,
  mode: "sandbox",
  fault: "none",
  status: "completed",
  createdAt: "2026-11-01T12:00:00.000Z",
  decision: { verdict: "ALLOW", reason: "Fixture for projection tests." },
  payment: { status: "NOT_REQUESTED", authorizationId: null, captureId: null },
  ...extra,
});
const filters: EvidenceFilters = {
  query: "",
  source: "all",
  mode: "all",
  verdict: "all",
  scenario: "all",
  sort: "createdAt",
  direction: "desc",
};

test("judge evidence deduplicates the session union and preserves the published payload", () => {
  const session = parseSource({
    runs: [
      base("published", { decision: { verdict: "REVIEW" } }),
      base("private"),
      base("private"),
    ],
  });
  const library = parseSource({
    runs: [base("published", { decision: { verdict: "DENY" } })],
  });
  const rows = buildEvidenceRows(session, library);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((row) => row.id === "published")?.verdict, "DENY");
  assert.equal(rows.find((row) => row.id === "published")?.source, "published");
  assert.equal(rows.find((row) => row.id === "private")?.source, "session");
  assert.deepEqual(evidenceCounts(rows), {
    total: 2,
    published: 1,
    session: 1,
    unverified: 0,
    sandbox: 2,
    simulation: 0,
    recoveries: 0,
  });
});

test("judge partial sources retain evidence without inventing publication or ownership", () => {
  const session = parseSource({ runs: [base("available")] });
  const uncertain = buildEvidenceRows(session, null);
  assert.equal(uncertain[0].source, "unverified");
  assert.equal(
    uncertain[0].sourceLabel,
    "Session response · publication unknown",
  );
  assert.equal(evidenceCounts(uncertain).session, 0);
  const publicOnly = buildEvidenceRows(null, session);
  assert.equal(publicOnly[0].source, "published");
  assert.equal(evidenceCounts(publicOnly).published, 1);
  assert.deepEqual(buildEvidenceRows(null, null), []);
});

test("judge parsing discloses malformed entries and rejects an invalid source shape", () => {
  const parsed = parseSource({ runs: [base("valid"), null, {}, { id: " " }] });
  assert.equal(parsed.runs.length, 1);
  assert.equal(parsed.omitted, 3);
  assert.throws(() => parseSource({ error: "unavailable" }), /no run list/);
});

test("generic run and PayPal order states never become authorization or capture proof", () => {
  for (const status of [
    "completed",
    "blocked",
    "payment_failed",
    "canceled",
    "inconclusive",
  ]) {
    const row = projectEvidence(
      base("no-evidence", {
        status,
        payment: { status: "COMPLETED", orderId: "provider-order" },
      }),
      "session",
    );
    assert.equal(row.authorization, "Not recorded");
    assert.equal(row.capture, "Not recorded");
    assert.equal(row.merchantOrder, "Not recorded");
    assert.equal(row.paymentState, "COMPLETED");
  }
  const idOnly = projectEvidence(
    base("id-only", {
      payment: {
        status: "VOIDED",
        authorizationId: "authorization",
        captureId: "capture",
      },
    }),
    "session",
  );
  assert.equal(idOnly.authorization, "ID recorded · status unknown");
  assert.equal(idOnly.capture, "ID recorded · status unknown");
});

test("authorization and void facts require matching saved evidence and remain independent of capture", () => {
  const providerEvidence = {
    environment: "sandbox",
    caseId: "auth-case",
    authorizationId: "authorization",
    authorizationStatus: "CREATED",
  };
  const run = base("auth-case", {
    payment: {
      status: "PENDING",
      orderId: "order",
      authorizationId: "authorization",
      captureId: null,
    },
    evidence: { providerEvidence },
  });
  assert.equal(
    projectEvidence(run, "session").authorization,
    "CREATED · checkpoint",
  );
  const voided = projectEvidence(
    {
      ...run,
      evidence: {
        providerEvidence,
        voidEvidence: {
          id: "authorization",
          orderId: "order",
          status: "VOIDED",
        },
      },
    },
    "session",
  );
  assert.equal(voided.authorization, "VOIDED · saved readback");
  assert.equal(voided.capture, "Not recorded");
  assert.equal(voided.paymentState, "PENDING");
  assert.equal(
    projectEvidence(
      {
        ...run,
        evidence: {
          voidEvidence: { id: "another-authorization", status: "VOIDED" },
        },
      },
      "session",
    ).authorization,
    "Readback ID mismatch",
  );
  assert.equal(
    projectEvidence(
      {
        ...run,
        evidence: {
          providerEvidence: {
            environment: "sandbox",
            caseId: "another-case",
            authorizationId: "authorization",
            authorizationStatus: "CREATED",
          },
        },
      },
      "session",
    ).authorization,
    "Checkpoint binding mismatch",
  );
});

test("capture finality, binding and merchant-order facts are projected separately", () => {
  const run = base("capture-case", {
    payment: {
      status: "COMPLETED",
      orderId: "order",
      authorizationId: "authorization",
      captureId: "capture",
    },
    evidence: {
      captureEvidence: {
        id: "capture",
        orderId: "order",
        authorizationId: "authorization",
        status: "COMPLETED",
        finalCapture: true,
      },
    },
  });
  const row = projectEvidence(run, "published");
  assert.equal(row.capture, "COMPLETED · final");
  assert.equal(row.authorization, "ID recorded · status unknown");
  assert.equal(row.merchantOrder, "Not recorded");
  const withOrder = projectEvidence(
    { ...run, merchantOrder: { id: "merchant-order", captureId: "capture" } },
    "published",
  );
  assert.equal(withOrder.merchantOrder, "Recorded · capture ID linked");
  assert.equal(
    projectEvidence(
      {
        ...run,
        merchantOrder: { id: "merchant-order", captureId: "different" },
      },
      "published",
    ).merchantOrder,
    "Recorded · link unverified",
  );
  const capture = {
    id: "capture",
    orderId: "order",
    authorizationId: "authorization",
    status: "COMPLETED",
    finalCapture: false,
  };
  assert.equal(
    projectEvidence(
      { ...run, evidence: { captureEvidence: capture } },
      "session",
    ).capture,
    "COMPLETED · non-final",
  );
  assert.equal(
    projectEvidence(
      {
        ...run,
        evidence: {
          captureEvidence: {
            ...capture,
            authorizationId: "wrong-authorization",
          },
        },
      },
      "session",
    ).capture,
    "Readback binding mismatch",
  );
  assert.equal(
    projectEvidence(
      {
        ...run,
        evidence: { captureEvidence: { ...capture, id: "wrong-capture" } },
      },
      "session",
    ).capture,
    "Readback ID mismatch",
  );
});

test("simulation remains simulation and filtering leaves the full-source denominator unchanged", () => {
  const rows = buildEvidenceRows(
    parseSource({
      runs: [
        base("original", {
          mode: "simulation",
          fault: "variant",
          decision: { verdict: "DENY" },
          payment: { status: "SIMULATED_VOID" },
        }),
        base("recovery", {
          parentId: "original",
          createdAt: "2026-11-01T13:00:00.000Z",
        }),
      ],
    }),
    parseSource({ runs: [] }),
  );
  assert.equal(rows[0].authorization, "Simulation only");
  assert.equal(rows[0].capture, "Simulated void");
  const visible = filterEvidence(rows, {
    ...filters,
    mode: "simulation",
    verdict: "DENY",
  });
  assert.equal(visible.length, 1);
  assert.equal(evidenceCounts(rows).total, 2);
  assert.equal(evidenceCounts(rows).sandbox, 1);
  assert.equal(evidenceCounts(rows).simulation, 1);
  assert.equal(evidenceCounts(rows).recoveries, 1);
  assert.equal(filterEvidence(rows, filters)[0].id, "recovery");
  assert.equal(
    filterEvidence(rows, { ...filters, query: "original" }).length,
    2,
  );
});

test("judge export is allowlisted, formula-safe and links cannot smuggle payment query parameters", () => {
  const row = projectEvidence(
    base('\t=HYPERLINK("example")', {
      parentId: "  +SUM(1,1)",
      contract: { buyerEmail: "PRIVATE_BUYER_MARKER" },
      events: [{ detail: "PRIVATE_EVENT_MARKER" }],
      payment: {
        status: "AUTHORIZED",
        authorizationId: "PRIVATE_PROVIDER_ID",
        approvalUrl: "https://sandbox.paypal.com/PRIVATE_APPROVAL_MARKER",
      },
    }),
    "session",
  );
  const csv = evidenceCsv([row]);
  assert.match(csv, /"'\t=HYPERLINK\(""example""\)"/);
  assert.match(csv, /"'  \+SUM\(1,1\)"/);
  assert.doesNotMatch(
    csv,
    /PRIVATE_BUYER_MARKER|PRIVATE_EVENT_MARKER|PRIVATE_PROVIDER_ID|PRIVATE_APPROVAL_MARKER/,
  );
  for (const value of [
    "=1+1",
    "+1",
    "-2",
    "@SUM(1)",
    " \t=1",
    "\u00a0=1",
    "\ufeff=1",
    "\ttext",
    "\rtext",
    "\ntext",
  ])
    assert.ok(csvCell(value).startsWith("\"'"));
  assert.equal(csvCell('plain,"text"'), '"plain,""text"""');
  const unsafeId = projectEvidence(
    base("id?paypal=approved&token=private"),
    "published",
  );
  const url = new URL(unsafeId.href, "https://example.invalid");
  assert.equal(url.search, "?playback=1");
  assert.equal(url.searchParams.has("token"), false);
});
