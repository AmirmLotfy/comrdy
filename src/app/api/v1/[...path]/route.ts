import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  sandboxApprove,
  sandboxCancel,
  sandboxWebhook,
} from "@/server/sandbox";
import * as service from "@/server/service";
import { transaction, claimQuota } from "@/server/store";
import { timingSafeEqual } from "node:crypto";
import { releaseLibrary } from "@/server/library";
import { status } from "@/server/config";
import { createCanonicalState } from "@/core/fixtures";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const route = path.join("/");
  const owner = req.cookies.get("comrdy-session")?.value ?? randomUUID();
  const respond = (body: unknown, code = 200) => {
    const res = NextResponse.json(body, {
      status: code,
      headers: { "Cache-Control": "no-store" },
    });
    res.cookies.set("comrdy-session", owner, {
      httpOnly: true,
      sameSite: "lax",
      secure: (process.env.APP_URL || req.url).startsWith("https:"),
      path: "/",
      maxAge: 86400 * 7,
    });
    return res;
  };
  try {
    if (req.method === "GET") {
      if (route === "library") return respond(await releaseLibrary());
      if (route === "status") return respond(status());
      if (route === "runs") return respond(await service.listRuns(owner));
      if (path[0] === "runs" && path[1] && path[2] === "events") {
        const first = await service.getRun(path[1], owner);
        const encoder = new TextEncoder();
        let timer: ReturnType<typeof setTimeout> | undefined;
        let cancelled = false;
        const began = Date.now();
        const stream = new ReadableStream({
          start(controller) {
            let previous = "";
            const send = async () => {
              if (cancelled) return;
              try {
                const run =
                  Date.now() - began < 100
                    ? first
                    : await service.getRun(path[1], owner);
                const data = JSON.stringify(run);
                if (data !== previous) {
                  controller.enqueue(
                    encoder.encode("event: run\ndata: " + data + "\n\n"),
                  );
                  previous = data;
                }
                if (
                  Date.now() - began > 25000 ||
                  [
                    "completed",
                    "blocked",
                    "infra_failed",
                    "inconclusive",
                    "payment_failed",
                    "canceled",
                  ].includes(run.status)
                ) {
                  controller.close();
                  return;
                }
                timer = setTimeout(send, 1000);
              } catch {
                controller.close();
              }
            };
            void send();
          },
          cancel() {
            cancelled = true;
            clearTimeout(timer);
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
          },
        });
      }
      if (path[0] === "runs" && path[1])
        return respond(await service.getRun(path[1], owner));
    }
    if (req.method === "POST") {
      if (route === "webhooks/paypal") {
        const raw = await req.text();
        if (raw.length > 1000000)
          return respond({ error: "Payload too large" }, 413);
        return respond(await sandboxWebhook(raw, req.headers));
      }
      const origin = req.headers.get("origin");
      const appOrigin = new URL(
        process.env.APP_URL ||
          req.nextUrl.protocol + "//" + req.headers.get("host"),
      ).origin;
      if (origin && origin !== appOrigin)
        return respond({ error: "Cross-origin mutation rejected" }, 403);
      if (Number(req.headers.get("content-length") || 0) > 20000)
        return respond({ error: "Request too large" }, 413);
      const raw = await req.text();
      if (raw.length > 20000)
        return respond({ error: "Request too large" }, 413);
      const body = raw ? JSON.parse(raw) : {};
      if (route === "merchant/cart") {
        return respond(
          await transaction((db) => {
            const run = db.runs[body.runId];
            const expected = String(run?.merchantToken || "");
            const supplied = String(body.token || "");
            if (
              !run ||
              !expected ||
              expected.length !== supplied.length ||
              !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
            )
              throw new Error("Invalid merchant session");
            if (run.status !== "shopping")
              throw new Error("Checkout is frozen");
            if (!["S", "M", "L"].includes(body.size))
              throw new Error("Invalid size");
            const state = structuredClone(createCanonicalState("none"));
            const variant = state.variant as Record<string, any>;
            variant.attributes.size = body.size;
            variant.id = "ocean-shell-blue-" + body.size.toLowerCase();
            variant.sku = "NP-OS-BLU-" + body.size;
            (state.policy as Record<string, any>).substitutionOccurred = false;
            const revision =
              Number(
                (run.merchant as { revision?: number } | undefined)?.revision ??
                  0,
              ) + 1;
            run.merchant = {
              size: body.size,
              totalMinor: 14800,
              revision,
              source: "Northpath merchant server",
              state,
            };
            return { size: body.size, totalMinor: 14800, revision };
          }),
        );
      }
      if (
        status().mode === "sandbox" &&
        (route === "compile" || route === "runs" || path[2] === "recover")
      ) {
        const expected = process.env.RUN_ACCESS_CODE || "";
        const supplied = req.headers.get("x-comrdy-access-code") || "";
        if (
          !expected ||
          Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
          !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
        )
          return respond(
            {
              error:
                "A live demo access code is required for metered execution.",
            },
            403,
          );
        await claimQuota(route === "compile" ? "compile" : "run");
      }
      if (route === "compile")
        return respond(await service.compile(body.mandate, owner));
      if (route === "confirm")
        return respond(await service.confirm(body.contract, owner));
      if (route === "runs")
        return respond(
          await service.start(body.contract, body.fault ?? "none", owner),
        );
      if (path[0] === "runs" && path[2] === "approve")
        return respond(await sandboxApprove(path[1], owner, body.orderId));
      if (path[0] === "runs" && path[2] === "cancel")
        return respond(await sandboxCancel(path[1], owner));
      if (path[0] === "runs" && path[2] === "recover")
        return respond(await service.recover(path[1], owner));
    }
    return respond({ error: "Route not found" }, 404);
  } catch (error) {
    return respond(
      { error: error instanceof Error ? error.message : "Request failed" },
      400,
    );
  }
}
export const GET = handle;
export const POST = handle;
