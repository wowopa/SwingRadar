import { jsonOk } from "@/lib/server/api-response";
import { parseSearchParams } from "@/lib/server/parse-query";
import { analysisQuerySchema } from "@/lib/server/query-schemas";
import { getTickerAnalysis } from "@/lib/services/analysis-service";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";

export async function GET(request: Request, contextArg: { params: Promise<{ ticker: string }> }) {
  return withRouteTelemetry(request, { route: "/api/analysis/[ticker]" }, async (context) => {
    const params = await contextArg.params;
    const query = parseSearchParams(new URL(request.url).searchParams, analysisQuerySchema);
    const payload = await getTickerAnalysis(params.ticker, query);
    return jsonOk(payload, buildResponseMeta(context, 30));
  });
}