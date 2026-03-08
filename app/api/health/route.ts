import { jsonOk } from "@/lib/server/api-response";
import { getHealthReport } from "@/lib/services/health-service";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/health" }, async (context) => {
    const payload = await getHealthReport(context.requestId);
    return jsonOk(payload, buildResponseMeta(context, 5));
  });
}