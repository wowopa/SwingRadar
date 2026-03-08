import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { listAuditLogs } from "@/lib/server/audit-log";
import { getOperationalPolicy } from "@/lib/server/operations-policy";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/audit" }, async (context) => {
    assertAdminRequest(request);
    const items = await listAuditLogs(getOperationalPolicy().audit.adminListLimit);

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        items
      },
      buildResponseMeta(context, 0)
    );
  });
}
