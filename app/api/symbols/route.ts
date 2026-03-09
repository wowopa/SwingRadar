import { jsonOk } from "@/lib/server/api-response";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { getDataProvider } from "@/lib/providers";
import { getDailyCandidates } from "@/lib/repositories/daily-candidates";
import {
  getFeaturedSymbolItems,
  searchSymbolItems,
  symbolMaster
} from "@/lib/symbols/master";

async function getLiveReadyTickerSet() {
  const provider = getDataProvider();

  const [analysisSource, recommendationsSource, dailyCandidatesSource] = await Promise.all([
    provider.getAnalysis().catch(() => null),
    provider.getRecommendations().catch(() => null),
    getDailyCandidates().catch(() => null)
  ]);

  return new Set(
    [
      ...(analysisSource?.items.map((item) => item.ticker) ?? []),
      ...(recommendationsSource?.items.map((item) => item.ticker) ?? []),
      ...(dailyCandidatesSource?.topCandidates.map((item) => item.ticker) ?? [])
    ].filter(Boolean)
  );
}

export function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/symbols" }, async (context) => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const limit = Number(searchParams.get("limit") ?? "8");
    const readyTickers = await getLiveReadyTickerSet();
    const resolvedItems = symbolMaster.map((item) => ({
      ...item,
      status: readyTickers.has(item.ticker) ? "ready" : item.status
    }));
    const items = query.trim()
      ? searchSymbolItems(resolvedItems, query, limit)
      : getFeaturedSymbolItems(resolvedItems, limit);

    return jsonOk(
      {
        items,
        query
      },
      buildResponseMeta(context, 60)
    );
  });
}
