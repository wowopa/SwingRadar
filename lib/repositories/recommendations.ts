import type { RecommendationsResponseDto } from "@/lib/api-contracts/swing-radar";
import { recommendationsResponse } from "@/lib/api-mock/recommendations";
import { fetchJson } from "@/lib/repositories/api-client";
import { listRecommendations } from "@/lib/services/recommendations-service";

export async function getRecommendations(): Promise<RecommendationsResponseDto> {
  return fetchJson<RecommendationsResponseDto>("/api/recommendations", {
    fallback: async () => {
      if (typeof window === "undefined") {
        return listRecommendations({ sort: "score_desc" });
      }

      return recommendationsResponse;
    }
  });
}
