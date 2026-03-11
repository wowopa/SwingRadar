import type { RecommendationsResponseDto } from "@/lib/api-contracts/swing-radar";
import { getDailyCandidates } from "@/lib/repositories/daily-candidates";
import { getDataProvider } from "@/lib/providers";
import type { RecommendationsQuery } from "@/lib/server/query-schemas";

export async function listRecommendations(query: RecommendationsQuery): Promise<RecommendationsResponseDto> {
  const [source, dailyCandidates] = await Promise.all([getDataProvider().getRecommendations(), getDailyCandidates()]);

  const featuredCandidateMap = new Map(
    (dailyCandidates?.topCandidates ?? []).map((candidate, index) => [
      candidate.ticker,
      {
        rank: index + 1,
        candidateScore: candidate.candidateScore,
        eventCoverage: candidate.eventCoverage,
        batch: candidate.batch
      }
    ])
  );

  let items = source.items.map((item) => {
    const candidate = featuredCandidateMap.get(item.ticker);
    return candidate
      ? {
          ...item,
          score: dailyCandidates?.topCandidates.find((entry) => entry.ticker === item.ticker)?.score ?? item.score,
          featuredRank: candidate.rank,
          candidateScore: candidate.candidateScore,
          eventCoverage: candidate.eventCoverage,
          candidateBatch: candidate.batch
        }
      : item;
  });

  if (query.signalTone) {
    items = items.filter((item) => item.signalTone === query.signalTone);
  }

  if (query.sort === "score_desc") {
    items.sort((left, right) => {
      const leftRank = left.featuredRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.featuredRank ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return right.score - left.score;
    });
  } else if (query.sort === "updatedAt_desc") {
    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } else if (query.sort === "hitRate_desc") {
    items.sort((a, b) => b.validation.hitRate - a.validation.hitRate);
  }

  if (query.limit) {
    items = items.slice(0, query.limit);
  }

  return {
    generatedAt: dailyCandidates?.generatedAt ?? source.generatedAt,
    items,
    dailyScan: dailyCandidates
      ? {
          generatedAt: dailyCandidates.generatedAt,
          batchSize: dailyCandidates.batchSize,
          concurrency: dailyCandidates.concurrency,
          topCandidatesLimit: dailyCandidates.topCandidatesLimit,
          totalTickers: dailyCandidates.totalTickers,
          totalBatches: dailyCandidates.totalBatches,
          succeededBatches: dailyCandidates.succeededBatches,
          failedBatches: dailyCandidates.failedBatches,
          topCandidates: dailyCandidates.topCandidates
        }
      : null
  };
}
