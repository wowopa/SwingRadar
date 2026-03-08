import { jsonOk } from "@/lib/server/api-response";
import { parseSearchParams } from "@/lib/server/parse-query";
import { trackingQuerySchema } from "@/lib/server/query-schemas";
import { getTrackingSnapshot } from "@/lib/services/tracking-service";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/tracking" }, async (context) => {
    const query = parseSearchParams(new URL(request.url).searchParams, trackingQuerySchema);
    const payload = await getTrackingSnapshot(query);
    return jsonOk(payload, buildResponseMeta(context, 15));
  });
}