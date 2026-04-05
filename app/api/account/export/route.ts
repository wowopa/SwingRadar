import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { exportUserAccountData } from "@/lib/server/account-lifecycle";
import { requireUserSession } from "@/lib/server/user-auth";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/account/export" }, async (context) => {
    const session = await requireUserSession(request);
    const payload = await exportUserAccountData(session.user.id);

    const response = new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="swing-radar-account-${session.user.id}.json"`
      }
    });
    response.headers.set("x-request-id", context.requestId);
    response.headers.set("cache-control", "no-store");
    response.headers.set("server-timing", `app;dur=${buildResponseMeta(context, 0).durationMs ?? 0}`);
    return response;
  });
}
