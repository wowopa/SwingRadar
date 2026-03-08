import type { TickerAnalysisDto } from "@/lib/api-contracts/swing-radar";
import { getDataProvider } from "@/lib/providers";
import { ApiError } from "@/lib/server/api-error";
import type { AnalysisQuery } from "@/lib/server/query-schemas";

export async function getTickerAnalysis(ticker: string, query: AnalysisQuery): Promise<TickerAnalysisDto> {
  const response = await getDataProvider().getAnalysis();
  const item = response.items.find((entry) => entry.ticker === ticker);

  if (!item) {
    throw new ApiError(404, "ANALYSIS_NOT_FOUND", `Analysis not found for ticker ${ticker}`);
  }

  return {
    ...item,
    newsImpact: query.includeNews === "false" ? [] : item.newsImpact,
    dataQuality: query.includeQuality === "false" ? [] : item.dataQuality
  };
}