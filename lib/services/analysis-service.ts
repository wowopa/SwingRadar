import type { TickerAnalysisDto } from "@/lib/api-contracts/swing-radar";
import { ApiError } from "@/lib/server/api-error";
import type { AnalysisQuery } from "@/lib/server/query-schemas";
import { resolveTickerAnalysisForQuery } from "@/lib/services/analysis-resolver";
import { resolveTicker } from "@/lib/symbols/master";

export async function getTickerAnalysis(ticker: string, query: AnalysisQuery): Promise<TickerAnalysisDto> {
  const resolvedTicker = resolveTicker(ticker);
  const resolved = await resolveTickerAnalysisForQuery(resolvedTicker, query);

  if (!resolved) {
    throw new ApiError(404, "ANALYSIS_NOT_FOUND", `Analysis not found for ticker ${resolvedTicker}`);
  }

  return resolved.item;
}
