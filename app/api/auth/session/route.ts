import { jsonOk } from "@/lib/server/api-response";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { getUserSessionFromRequest } from "@/lib/server/user-auth";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/auth/session" }, async (context) => {
    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        session: await getUserSessionFromRequest(request)
      },
      buildResponseMeta(context, 0)
    );
  });
}
