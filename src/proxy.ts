import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
/** Establish the anonymous owner before the page starts parallel API requests. */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.get("comrdy-session"))
    response.cookies.set("comrdy-session", randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: (process.env.APP_URL || request.url).startsWith("https:"),
      path: "/",
      maxAge: 86400 * 7,
    });
  return response;
}
export const config = {
  matcher: ["/", "/demo", "/cases/:path*", "/compare", "/docs", "/store"],
};
