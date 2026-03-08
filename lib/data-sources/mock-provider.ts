import { analysisResponse } from "@/lib/api-mock/analysis";
import { recommendationsResponse } from "@/lib/api-mock/recommendations";
import { trackingResponse } from "@/lib/api-mock/tracking";
import type { SwingRadarDataProvider } from "@/lib/providers/types";

export const mockDataProvider: SwingRadarDataProvider = {
  getRecommendations() {
    return Promise.resolve(recommendationsResponse);
  },
  getAnalysis() {
    return Promise.resolve(analysisResponse);
  },
  getTracking() {
    return Promise.resolve(trackingResponse);
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