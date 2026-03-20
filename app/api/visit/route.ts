import { NextResponse } from "next/server";

import {
  createAccessStatsVisitorId,
  getAccessStatsCookieName,
  isTrackableSitePath,
  recordSiteVisit
} from "@/lib/server/access-stats";
import { withRouteTelemetry } from "@/lib/server/telemetry";

function readCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const entry of cookieHeader.split(";")) {
    const [rawName, ...rest] = entry.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/visit" }, async () => {
    let pathname = "/";

    try {
      const payload = (await request.json()) as { pathname?: string };
      if (typeof payload.pathname === "string" && isTrackableSitePath(payload.pathname)) {
        pathname = payload.pathname;
      }
    } catch {
      pathname = "/";
    }

    const cookieName = getAccessStatsCookieName();
    const existingVisitorId = readCookieValue(request, cookieName);
    const visitorId = existingVisitorId || createAccessStatsVisitorId();

    await recordSiteVisit({
      visitorId,
      pathname,
      userAgent: request.headers.get("user-agent")
    });

    const response = NextResponse.json({ ok: true });
    response.headers.set("cache-control", "no-store");

    if (!existingVisitorId) {
      response.cookies.set({
        name: cookieName,
        value: visitorId,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/"
      });
    }

    return response;
  });
}
