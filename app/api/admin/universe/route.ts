import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { getDailyCandidates } from "@/lib/repositories/daily-candidates";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/universe" }, async (context) => {
    assertAdminRequest(request);
    const dailyCandidates = await getDailyCandidates();

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        dailyCandidates
      },
      buildResponseMeta(context, 0)
    );
  });
}
