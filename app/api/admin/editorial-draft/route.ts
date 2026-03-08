import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { loadEditorialDraft, saveEditorialDraft } from "@/lib/server/editorial-draft";
import { editorialDraftSchema } from "@/lib/server/editorial-schema";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/editorial-draft" }, async (context) => {
    assertAdminRequest(request);
    const payload = await loadEditorialDraft();
    return jsonOk(payload, buildResponseMeta(context, 0));
  });
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/editorial-draft" }, async (context) => {
    assertAdminRequest(request);
    const body = editorialDraftSchema.parse(await request.json());
    const savedDraft = await saveEditorialDraft(body, "admin-editor", context.requestId);
    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        draft: savedDraft
      },
      buildResponseMeta(context, 0)
    );
  });
}