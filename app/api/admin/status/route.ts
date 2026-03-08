import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { loadDailyCycleReport, loadOpsHealthCheckReport } from "@/lib/server/ops-reports";
import { getHealthReport } from "@/lib/services/health-service";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/status" }, async (context) => {
    assertAdminRequest(request);
    const [health, opsHealthReport, dailyCycleReport] = await Promise.all([
      getHealthReport(context.requestId),
      loadOpsHealthCheckReport(),
      loadDailyCycleReport()
    ]);

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        health,
        opsHealthReport,
        dailyCycleReport,
        operationalMode: process.env.SWING_RADAR_DATA_PROVIDER ?? "mock"
      },
      buildResponseMeta(context, 0)
    );
  });
}
