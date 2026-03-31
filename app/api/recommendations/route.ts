import { jsonOk } from "@/lib/server/api-response";
import { parseSearchParams } from "@/lib/server/parse-query";
import { recommendationsQuerySchema } from "@/lib/server/query-schemas";
import { getUserSessionFromRequest } from "@/lib/server/user-auth";
import { listRecommendations } from "@/lib/services/recommendations-service";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/recommendations" }, async (context) => {
    const query = parseSearchParams(new URL(request.url).searchParams, recommendationsQuerySchema);
    const session = await getUserSessionFromRequest(request);
    const payload = await listRecommendations(query, { userId: session?.user.id });
    return jsonOk(payload, buildResponseMeta(context, 30));
  });
}
