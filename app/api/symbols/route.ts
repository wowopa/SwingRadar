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

async function getFeaturedTickerOrder() {
  const provider = getDataProvider();

  const [recommendationsSource, dailyCandidatesSource, analysisSource] = await Promise.all([
    provider.getRecommendations().catch(() => null),
    getDailyCandidates().catch(() => null),
    provider.getAnalysis().catch(() => null)
  ]);

  return [
    ...(recommendationsSource?.items.map((item) => item.ticker) ?? []),
    ...(dailyCandidatesSource?.topCandidates.map((item) => item.ticker) ?? []),
    ...(analysisSource?.items.map((item) => item.ticker) ?? [])
  ];
}

export function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/symbols" }, async (context) => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const limit = Number(searchParams.get("limit") ?? "8");
    const [readyTickers, featuredTickerOrder] = await Promise.all([getLiveReadyTickerSet(), getFeaturedTickerOrder()]);
    const resolvedItems = symbolMaster.map((item) => ({
      ...item,
      status: readyTickers.has(item.ticker) ? "ready" : item.status
    }));
    const isSearchMode = Boolean(query.trim());
    const items = isSearchMode
      ? searchSymbolItems(resolvedItems, query, limit)
      : getFeaturedSymbolItems(resolvedItems, limit, featuredTickerOrder);

    return jsonOk(
      {
        items,
        query,
        mode: isSearchMode ? "search" : "featured",
        description: isSearchMode
          ? `티커, 종목명, 별칭, 섹터 일치도를 기준으로 최대 ${limit}개를 보여줍니다.`
          : `기본 결과는 오늘 후보, 관찰 종목, 분석 준비 종목을 우선해 최대 ${limit}개를 보여줍니다.`,
        limit
      },
      buildResponseMeta(context, 60)
    );
  });
}
