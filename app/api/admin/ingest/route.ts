import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { ingestPayloadSchema } from "@/lib/server/ingest-schema";
import { ingestSnapshotBundle, loadSnapshotBundleFromDisk } from "@/lib/server/postgres-ingest";
import { recordAuditLog } from "@/lib/server/audit-log";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/ingest" }, async (context) => {
    assertAdminRequest(request);

    const unknownBody: unknown = await request.json().catch(() => null);
    const payload = unknownBody
      ? ingestPayloadSchema.parse(unknownBody)
      : {
          applySchema: false,
          ...(await loadSnapshotBundleFromDisk())
        };

    const result = await ingestSnapshotBundle(
      {
        recommendations: payload.recommendations,
        analysis: payload.analysis,
        tracking: payload.tracking
      },
      {
        applySchema: payload.applySchema,
        requestId: context.requestId,
        actor: "admin-api"
      }
    );

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        ingest: result
      },
      buildResponseMeta(context, 0)
    );
  });
}

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/ingest" }, async (context) => {
    try {
      assertAdminRequest(request);
    } catch (error) {
      await recordAuditLog({
        eventType: "admin_login_attempt",
        actor: "admin-api",
        status: "failure",
        requestId: context.requestId,
        summary: "Admin ingest authentication failed",
        metadata: { route: "/api/admin/ingest" }
      });
      throw error;
    }

    await recordAuditLog({
      eventType: "admin_login_attempt",
      actor: "admin-api",
      status: "success",
      requestId: context.requestId,
      summary: "Admin ingest endpoint accessed",
      metadata: { route: "/api/admin/ingest" }
    });

    return jsonOk(
      {
        ok: true,
        endpoint: "admin-ingest",
        methods: ["POST"],
        requestId: context.requestId
      },
      buildResponseMeta(context, 0)
    );
  });
}