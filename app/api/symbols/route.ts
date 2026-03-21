import { jsonOk } from "@/lib/server/api-response";
import { getCachedSymbolMetaSnapshot, setCachedSymbolMetaSnapshot } from "@/lib/server/symbol-meta-cache";
import { buildResponseMeta, withRouteTelemetry } from "@/lib/server/telemetry";
import { getDataProvider } from "@/lib/providers";
import { getDailyCandidates } from "@/lib/repositories/daily-candidates";
import {
  getFeaturedSymbolItems,
  searchSymbolItems,
  symbolMaster
} from "@/lib/symbols/master";

async function loadSymbolMetaSnapshot() {
  const cached = getCachedSymbolMetaSnapshot();
  if (cached) {
    return cached;
  }

  const provider = getDataProvider();

  const [analysisSource, recommendationsSource, dailyCandidatesSource] = await Promise.all([
    provider.getAnalysis().catch(() => null),
    provider.getRecommendations().catch(() => null),
    getDailyCandidates().catch(() => null)
  ]);

  const readyTickers = new Set(
    [
      ...(analysisSource?.items.map((item) => item.ticker) ?? []),
      ...(recommendationsSource?.items.map((item) => item.ticker) ?? []),
      ...(dailyCandidatesSource?.topCandidates.map((item) => item.ticker) ?? [])
    ].filter(Boolean)
  );

  const featuredTickerOrder = [
    ...(recommendationsSource?.items.map((item) => item.ticker) ?? []),
    ...(dailyCandidatesSource?.topCandidates.map((item) => item.ticker) ?? []),
    ...(analysisSource?.items.map((item) => item.ticker) ?? [])
  ];

  const snapshot = { readyTickers, featuredTickerOrder };
  setCachedSymbolMetaSnapshot(snapshot);

  return snapshot;
}

export function GET(request: Request) {
  return withRouteTelemetry(request, { route: "/api/symbols" }, async (context) => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const limit = Number(searchParams.get("limit") ?? "8");
    const isSearchMode = Boolean(query.trim());
    const { readyTickers, featuredTickerOrder } = await loadSymbolMetaSnapshot();
    const resolvedItems = symbolMaster.map((item) => ({
      ...item,
      status: readyTickers.has(item.ticker) ? "ready" : item.status
    }));
    const items = isSearchMode
      ? searchSymbolItems(resolvedItems, query, limit)
      : getFeaturedSymbolItems(resolvedItems, limit, featuredTickerOrder);

    return jsonOk(
      {
        items,
        query,
        mode: isSearchMode ? "search" : "featured",
        description: isSearchMode
          ? "티커, 종목명, 별칭, 섹터 일치도를 기준으로 관련 종목을 보여줍니다."
          : "기본 결과는 오늘의 후보, 우선 볼 후보, 분석 준비 종목을 우선해 보여줍니다.",
        limit
      },
      buildResponseMeta(context, 60)
    );
  });
}
