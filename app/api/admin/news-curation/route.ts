import { jsonOk } from "@/lib/server/api-response";
import { assertAdminRequest } from "@/lib/server/admin-auth";
import { newsCurationSchema } from "@/lib/server/editorial-schema";
import { loadNewsCuration, saveNewsCuration } from "@/lib/server/news-curation";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/news-curation" }, async (context) => {
    assertAdminRequest(request);
    const document = await loadNewsCuration();
    return jsonOk({ document }, buildResponseMeta(context, 0));
  });
}

export async function POST(request: Request) {
  return withRouteTelemetry(request, { route: "/api/admin/news-curation" }, async (context) => {
    assertAdminRequest(request);
    const body = newsCurationSchema.parse(await request.json());
    const document = await saveNewsCuration(body, "admin-editor", context.requestId);
    return jsonOk(
      {
        ok: true,
        requestId: context.requestId,
        document
      },
      buildResponseMeta(context, 0)
    );
  });
}
