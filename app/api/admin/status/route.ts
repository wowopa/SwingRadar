import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { listAuditLogs } from "@/lib/server/audit-log";
import { buildOperationalIncidents } from "@/lib/server/operational-incidents";
import { getOperationalPolicy } from "@/lib/server/operations-policy";
import { loadDailyCycleReport, loadOpsHealthCheckReport } from "@/lib/server/ops-reports";
import { getHealthReport } from "@/lib/services/health-service";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/status" }, async (context) => {
    assertAdminRequest(request);
    const policy = getOperationalPolicy();
    const [health, opsHealthReport, dailyCycleReport, audits] = await Promise.all([
      getHealthReport(context.requestId),
      loadOpsHealthCheckReport(),
      loadDailyCycleReport(),
      listAuditLogs(policy.audit.adminListLimit)
    ]);
    const escalation = buildOperationalIncidents({ health, opsHealthReport, dailyCycleReport, audits });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        health,
        opsHealthReport,
        dailyCycleReport,
        incidents: escalation.incidents,
        overallStatus: escalation.overallStatus,
        operationalMode: process.env.SWING_RADAR_DATA_PROVIDER ?? "mock"
      },
      buildResponseMeta(context, 0)
    );
  });
}
