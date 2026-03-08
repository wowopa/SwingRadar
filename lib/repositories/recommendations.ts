import type { RecommendationsResponseDto } from "@/lib/api-contracts/swing-radar";
import { recommendationsResponse } from "@/lib/api-mock/recommendations";
import { fetchJson } from "@/lib/repositories/api-client";

export async function getRecommendations(): Promise<RecommendationsResponseDto> {
  return fetchJson<RecommendationsResponseDto>("/api/recommendations", {
    fallback: () => recommendationsResponse
  });
}
