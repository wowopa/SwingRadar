import { ApiError } from "@/lib/server/api-error";
import { saveUniverseCandidateReview } from "@/lib/server/universe-candidate-reviews";
import { addSymbolToWatchlist } from "@/lib/server/watchlist-manager";
import { getSymbolByTicker } from "@/lib/symbols/master";

export async function promoteUniverseCandidate(input: {
  ticker: string;
  note?: string;
  updatedBy: string;
}) {
  const symbol = getSymbolByTicker(input.ticker);
  if (!symbol) {
    throw new ApiError(404, "UNIVERSE_CANDIDATE_NOT_FOUND", `Unknown universe candidate ticker: ${input.ticker}`);
  }

  const watchlistResult = await addSymbolToWatchlist(symbol);
  const normalizedNote = input.note?.trim();
  const review = await saveUniverseCandidateReview({
    ticker: input.ticker,
    status: "promoted",
    note:
      normalizedNote ||
      (watchlistResult.added
        ? "예외 편입 및 후속 파이프라인 반영 완료"
        : "이미 예외 편입 목록에 포함된 종목으로 편입 상태만 정리"),
    updatedBy: input.updatedBy
  });

  return {
    review,
    watchlist: watchlistResult
  };
}
