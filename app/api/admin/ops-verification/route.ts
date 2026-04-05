import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { ApiError } from "@/lib/server/api-error";
import { recordAuditLog } from "@/lib/server/audit-log";
import { loadAutoHealReport, loadDailyCycleReport } from "@/lib/server/ops-reports";
import {
  buildOpsVerificationSummary,
  loadOpsVerificationDocument,
  saveOpsVerificationCheckpoint
} from "@/lib/server/ops-verification";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

const opsVerificationSchema = z.object({
  key: z.enum(["scheduler", "backup", "restore", "rollback", "smoke"]),
  note: z.string().trim().max(500).optional().default(""),
  checkedBy: z.string().trim().max(80).optional().or(z.literal("")).or(z.null()),
  checkedAt: z.string().trim().optional().or(z.literal("")).or(z.null())
});

async function buildPayload() {
  const [document, dailyCycleReport, autoHealReport] = await Promise.all([
    loadOpsVerificationDocument(),
    loadDailyCycleReport(),
    loadAutoHealReport()
  ]);

  return {
    document,
    summary: buildOpsVerificationSummary({
      document,
      dailyCycleReport,
      autoHealReport
    })
  };
}

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/ops-verification" }, async (context) => {
    assertAdminRequest(request);
    const payload = await buildPayload();

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        ...payload
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/ops-verification" }, async (context) => {
    assertAdminRequest(request);
    const payload = opsVerificationSchema.parse(await request.json());
    if (payload.checkedAt) {
      const checkedAt = new Date(payload.checkedAt);
      if (Number.isNaN(checkedAt.getTime())) {
        throw new ApiError(400, "OPS_VERIFICATION_INVALID_DATETIME", "Ops verification datetime is invalid.");
      }
    }
    const document = await saveOpsVerificationCheckpoint({
      key: payload.key,
      note: payload.note,
      checkedAt: payload.checkedAt || undefined,
      checkedBy: payload.checkedBy || "admin-dashboard"
    });
    const [dailyCycleReport, autoHealReport] = await Promise.all([loadDailyCycleReport(), loadAutoHealReport()]);
    const summary = buildOpsVerificationSummary({
      document,
      dailyCycleReport,
      autoHealReport
    });

    await recordAuditLog({
      eventType: "admin_ops_verification_saved",
      actor: "admin-api",
      status: "success",
      requestId: context.requestId,
      summary: `Updated ops verification checkpoint: ${payload.key}`,
      metadata: {
        key: payload.key,
        checkedAt: document[payload.key].checkedAt,
        checkedBy: document[payload.key].checkedBy
      }
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        document,
        summary
      },
      buildResponseMeta(context, 0)
    );
  });
}
