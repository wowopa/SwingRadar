import type { TickerAnalysisDto } from "@/lib/api-contracts/swing-radar";
import { analysisResponse } from "@/lib/api-mock/analysis";
import { fetchJson } from "@/lib/repositories/api-client";
import type { TickerAnalysis } from "@/types/analysis";

export async function getAnalysisByTicker(ticker: string): Promise<TickerAnalysis | undefined> {
  const fallbackItem = analysisResponse.items.find((item) => item.ticker === ticker);

  if (!fallbackItem) {
    return undefined;
  }

  try {
    return await fetchJson<TickerAnalysisDto>(`/api/analysis/${ticker}`, {
      fallback: () => fallbackItem
    });
  } catch {
    return fallbackItem;
  }
}