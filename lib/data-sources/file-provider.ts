import { readFile } from "fs/promises";
import path from "path";

import type {
  AnalysisResponseDto,
  RecommendationsResponseDto,
  TrackingResponseDto
} from "@/lib/api-contracts/swing-radar";
import type { SwingRadarDataProvider } from "@/lib/providers/types";
import { ApiError } from "@/lib/server/api-error";
import { getDefaultLiveDataDir, resolveLiveDataDir } from "@/lib/server/live-snapshot-manifest";

async function readJsonFile<T>(filename: string): Promise<T> {
  const dataRoot = await resolveLiveDataDir();

  try {
    const file = await readFile(path.join(dataRoot, filename), "utf8");
    return JSON.parse(file) as T;
  } catch (error) {
    throw new ApiError(500, "DATA_SOURCE_READ_FAILED", `Failed to read data file: ${filename}`, {
      filename,
      dataRoot,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

export const fileDataProvider: SwingRadarDataProvider = {
  async getRecommendations() {
    return readJsonFile<RecommendationsResponseDto>("recommendations.json");
  },
  async getAnalysis() {
    return readJsonFile<AnalysisResponseDto>("analysis.json");
  },
  async getTracking() {
    return readJsonFile<TrackingResponseDto>("tracking.json");
  },
  getProviderMeta() {
    return {
      configured: {
        provider: "fileDataProvider",
        mode: "file"
      },
      lastUsed: {
        provider: "fileDataProvider",
        mode: "file"
      },
      fallbackTriggered: false,
      dataRoot: getDefaultLiveDataDir()
    };
  }
};
