import type { TickerAnalysisDto } from "@/lib/api-contracts/swing-radar";
import { analysisResponse } from "@/lib/api-mock/analysis";
import { fetchJson } from "@/lib/repositories/api-client";
import type { TickerAnalysis } from "@/types/analysis";

export interface AnalysisPagePayload {
  generatedAt: string;
  item: TickerAnalysis;
}

export async function getAnalysisByTicker(ticker: string): Promise<AnalysisPagePayload | undefined> {
  const fallbackItem = analysisResponse.items.find((item) => item.ticker === ticker);

  if (!fallbackItem) {
    return undefined;
  }

  try {
    const item = await fetchJson<TickerAnalysisDto>(`/api/analysis/${ticker}`, {
      fallback: () => fallbackItem
    });

    return {
      generatedAt: analysisResponse.generatedAt,
      item
    };
  } catch {
    return {
      generatedAt: analysisResponse.generatedAt,
      item: fallbackItem
    };
  }
}
