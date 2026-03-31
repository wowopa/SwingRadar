import { z } from "zod";

import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { recordAuditLog } from "@/lib/server/audit-log";
import {
  clearOpeningRecheckDecisions,
  listOpeningRecheckDecisions,
  saveOpeningRecheckDecision
} from "@/lib/server/opening-recheck-board";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

const decisionPayloadSchema = z.object({
  scanKey: z.string().trim().min(1).max(64),
  ticker: z.string().trim().min(1).max(16).regex(/^[A-Za-z0-9._-]+$/),
  status: z.enum(["pending", "passed", "watch", "avoid", "excluded"]),
  note: z.string().trim().max(1000).optional()
});

const clearPayloadSchema = z.object({
  scanKey: z.string().trim().min(1).max(64)
});

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/opening-recheck" }, async (context) => {
    assertAdminRequest(request);
    const scanKey = new URL(request.url).searchParams.get("scanKey")?.trim() ?? "";

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        scanKey,
        items: scanKey ? await listOpeningRecheckDecisions(scanKey) : {}
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function PUT(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/opening-recheck" }, async (context) => {
    assertAdminRequest(request);
    const body = decisionPayloadSchema.parse(await request.json());
    const decision = await saveOpeningRecheckDecision({
      scanKey: body.scanKey,
      ticker: body.ticker,
      status: body.status,
      note: body.note,
      updatedBy: "admin-editor"
    });

    await recordAuditLog({
      eventType: "opening_recheck_update",
      actor: "admin-api",
      status: "success",
      requestId: context.requestId,
      summary: `Opening recheck updated: ${body.ticker}`,
      metadata: {
        scanKey: body.scanKey,
        ticker: body.ticker,
        recheckStatus: body.status,
        note: body.note?.trim() ?? ""
      }
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        decision
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function DELETE(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/opening-recheck" }, async (context) => {
    assertAdminRequest(request);
    const body = clearPayloadSchema.parse(await request.json());
    await clearOpeningRecheckDecisions(body.scanKey);

    await recordAuditLog({
      eventType: "opening_recheck_update",
      actor: "admin-api",
      status: "warning",
      requestId: context.requestId,
      summary: `Opening recheck cleared for scan ${body.scanKey}`,
      metadata: {
        scanKey: body.scanKey
      }
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        cleared: true
      },
      buildResponseMeta(context, 0)
    );
  });
}
