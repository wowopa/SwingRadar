import { jsonOk } from "@/lib/server/api-response";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import {
  clearUserSessionCookie,
  getUserSessionCookieName,
  revokeUserSession
} from "@/lib/server/user-auth";

function readCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const entry of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = entry.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/auth/logout" }, async (context) => {
    await revokeUserSession(readCookieValue(request, getUserSessionCookieName()));
    const response = jsonOk(
      {
        ok: true,
        requestId: context.requestId
      },
      buildResponseMeta(context, 0)
    );
    clearUserSessionCookie(response);
    return response;
  });
}
