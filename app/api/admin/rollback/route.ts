import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { rollbackPublishedSnapshot } from "@/lib/server/editorial-draft";
import { editorialRollbackSchema } from "@/lib/server/editorial-schema";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/rollback" }, async (context) => {
    assertAdminRequest(request);
    const body = editorialRollbackSchema.parse(await request.json());
    const result = await rollbackPublishedSnapshot({
      historyId: body.historyId,
      requestId: context.requestId,
      actor: "admin-editor",
      ingestToPostgres: body.ingestToPostgres,
      rollbackReason: body.rollbackReason
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        rollback: result
      },
      buildResponseMeta(context, 0)
    );
  });
}