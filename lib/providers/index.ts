import { fileDataProvider } from "@/lib/data-sources/file-provider";
import { mockDataProvider } from "@/lib/data-sources/mock-provider";
import { postgresDataProvider } from "@/lib/data-sources/postgres-provider";
import type {
  AnalysisResponseDto,
  RecommendationsResponseDto,
  TrackingResponseDto
} from "@/lib/api-contracts/swing-radar";
import type { ProviderExecutionMeta, SwingRadarDataProvider } from "@/lib/providers/types";
import {
  applyNewsCurationToAnalysis,
  applyNewsCurationToRecommendations,
  applyNewsCurationToTracking
} from "@/lib/server/news-curation";

const providerMap: Record<string, SwingRadarDataProvider> = {
  mock: mockDataProvider,
  file: fileDataProvider,
  postgres: postgresDataProvider
};

function resolveProvider(key: string | undefined): SwingRadarDataProvider {
  const normalized = key?.toLowerCase() ?? "mock";
  return providerMap[normalized] ?? mockDataProvider;
}

function resolveFallbackKey(primaryKey: string) {
  if (process.env.SWING_RADAR_FALLBACK_PROVIDER) {
    return process.env.SWING_RADAR_FALLBACK_PROVIDER;
  }

  return primaryKey === "postgres" ? "file" : "mock";
}

function cloneMeta(meta: ProviderExecutionMeta): ProviderExecutionMeta {
  return {
    configured: { ...meta.configured },
    fallback: meta.fallback ? { ...meta.fallback } : undefined,
    lastUsed: meta.lastUsed ? { ...meta.lastUsed } : undefined,
    fallbackTriggered: meta.fallbackTriggered
  };
}

async function overlayRecommendations(payload: RecommendationsResponseDto) {
  return applyNewsCurationToRecommendations(payload);
}

async function overlayAnalysis(payload: AnalysisResponseDto) {
  return applyNewsCurationToAnalysis(payload);
}

async function overlayTracking(payload: TrackingResponseDto) {
  return applyNewsCurationToTracking(payload);
}

export function getDataProvider(): SwingRadarDataProvider {
  const primaryKey = process.env.SWING_RADAR_DATA_PROVIDER?.toLowerCase() ?? "mock";
  const primary = resolveProvider(primaryKey);
  const fallbackKey = resolveFallbackKey(primaryKey).toLowerCase();
  const fallback = resolveProvider(fallbackKey);

  const primaryMeta = primary.getProviderMeta().configured;
  const fallbackMeta = fallback.getProviderMeta().configured;

  if (primary === fallback) {
    const state: ProviderExecutionMeta = {
      configured: primaryMeta,
      fallback: undefined,
      lastUsed: primaryMeta,
      fallbackTriggered: false
    };

    return {
      async getRecommendations() {
        const payload = await primary.getRecommendations();
        state.lastUsed = primaryMeta;
        state.fallbackTriggered = false;
        return overlayRecommendations(payload);
      },
      async getAnalysis() {
        const payload = await primary.getAnalysis();
        state.lastUsed = primaryMeta;
        state.fallbackTriggered = false;
        return overlayAnalysis(payload);
      },
      async getTracking() {
        const payload = await primary.getTracking();
        state.lastUsed = primaryMeta;
        state.fallbackTriggered = false;
        return overlayTracking(payload);
      },
      getProviderMeta() {
        return cloneMeta(state);
      }
    };
  }

  const state: ProviderExecutionMeta = {
    configured: primaryMeta,
    fallback: fallbackMeta,
    lastUsed: undefined,
    fallbackTriggered: false
  };

  async function executeWithFallback<T>(label: string, runPrimary: () => Promise<T>, runFallback: () => Promise<T>) {
    try {
      const payload = await runPrimary();
      state.lastUsed = primaryMeta;
      state.fallbackTriggered = false;
      return payload;
    } catch (error) {
      console.warn(`[provider-fallback] ${label} failed on ${primaryKey}, falling back to ${fallbackKey}`, error);
      const payload = await runFallback();
      state.lastUsed = fallbackMeta;
      state.fallbackTriggered = true;
      return payload;
    }
  }

  return {
    getRecommendations() {
      return executeWithFallback("recommendations", () => primary.getRecommendations(), () => fallback.getRecommendations()).then((payload) =>
        overlayRecommendations(payload)
      );
    },
    getAnalysis() {
      return executeWithFallback("analysis", () => primary.getAnalysis(), () => fallback.getAnalysis()).then((payload) =>
        overlayAnalysis(payload)
      );
    },
    getTracking() {
      return executeWithFallback("tracking", () => primary.getTracking(), () => fallback.getTracking()).then((payload) =>
        overlayTracking(payload)
      );
    },
    getProviderMeta() {
      return cloneMeta(state);
    }
  };
}
