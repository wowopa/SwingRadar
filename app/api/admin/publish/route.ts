import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { publishEditorialDraft } from "@/lib/server/editorial-draft";
import { editorialPublishSchema } from "@/lib/server/editorial-schema";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/publish" }, async (context) => {
    assertAdminRequest(request);
    const body = editorialPublishSchema.parse(await request.json().catch(() => ({})));
    const result = await publishEditorialDraft({
      requestId: context.requestId,
      actor: "admin-editor",
      ingestToPostgres: body.ingestToPostgres,
      approvalStage: body.approvalStage
    });

    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        publish: result
      },
      buildResponseMeta(context, 0)
    );
  });
}