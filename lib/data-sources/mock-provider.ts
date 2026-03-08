import { analysisResponse } from "@/lib/api-mock/analysis";
import { recommendationsResponse } from "@/lib/api-mock/recommendations";
import { trackingResponse } from "@/lib/api-mock/tracking";
import type { SwingRadarDataProvider } from "@/lib/providers/types";

export const mockDataProvider: SwingRadarDataProvider = {
  async getRecommendations() {
    return recommendationsResponse;
  },
  async getAnalysis() {
    return analysisResponse;
  },
  async getTracking() {
    return trackingResponse;
  },
  getProviderMeta() {
    return {
      configured: {
        provider: "mockDataProvider",
        mode: "mock"
      },
      lastUsed: {
        provider: "mockDataProvider",
        mode: "mock"
      },
      fallbackTriggered: false
    };
  }
};