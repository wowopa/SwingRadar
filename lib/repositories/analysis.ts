import { analysisResponse } from "@/lib/api-mock/analysis";
import { resolveTickerAnalysis } from "@/lib/services/analysis-resolver";
import type { TickerAnalysis } from "@/types/analysis";

export interface AnalysisPagePayload {
  generatedAt: string;
  item: TickerAnalysis;
}

export async function getAnalysisByTicker(ticker: string): Promise<AnalysisPagePayload | undefined> {
  const resolved = await resolveTickerAnalysis(ticker);
  if (resolved) {
    return resolved;
  }

  const fallbackItem = analysisResponse.items.find((item) => item.ticker === ticker);
  if (!fallbackItem) {
    return undefined;
  }

  return {
    generatedAt: analysisResponse.generatedAt,
    item: fallbackItem
  };
}
