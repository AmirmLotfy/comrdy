import {
  executeReadinessRequest,
  parseReadinessQuery,
  ReadinessInputError,
} from "../../../core/readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stateless synthetic evaluation only: no provider, store, session or payment imports. */
export function GET(request: Request) {
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    const query = parseReadinessQuery(new URL(request.url).searchParams);
    return Response.json(executeReadinessRequest(query), { headers });
  } catch (error) {
    if (error instanceof ReadinessInputError)
      return Response.json(
        { error: error.message, code: "READINESS_INPUT_INVALID" },
        { status: 400, headers },
      );
    return Response.json(
      {
        error: "The deterministic readiness evaluation could not finish.",
        code: "READINESS_EVALUATION_FAILED",
      },
      { status: 500, headers },
    );
  }
}
