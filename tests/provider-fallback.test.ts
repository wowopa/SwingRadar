import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGetRecommendations: vi.fn(),
  mockGetAnalysis: vi.fn(),
  mockGetTracking: vi.fn(),
  mockGetProviderMeta: vi.fn(),
  fileGetRecommendations: vi.fn(),
  fileGetAnalysis: vi.fn(),
  fileGetTracking: vi.fn(),
  fileGetProviderMeta: vi.fn(),
  postgresGetRecommendations: vi.fn(),
  postgresGetAnalysis: vi.fn(),
  postgresGetTracking: vi.fn(),
  postgresGetProviderMeta: vi.fn(),
  applyNewsCurationToRecommendations: vi.fn(),
  applyNewsCurationToAnalysis: vi.fn(),
  applyNewsCurationToTracking: vi.fn()
}));

vi.mock("@/lib/data-sources/mock-provider", () => ({
  mockDataProvider: {
    getRecommendations: mocks.mockGetRecommendations,
    getAnalysis: mocks.mockGetAnalysis,
    getTracking: mocks.mockGetTracking,
    getProviderMeta: mocks.mockGetProviderMeta
  }
}));

vi.mock("@/lib/data-sources/file-provider", () => ({
  fileDataProvider: {
    getRecommendations: mocks.fileGetRecommendations,
    getAnalysis: mocks.fileGetAnalysis,
    getTracking: mocks.fileGetTracking,
    getProviderMeta: mocks.fileGetProviderMeta
  }
}));

vi.mock("@/lib/data-sources/postgres-provider", () => ({
  postgresDataProvider: {
    getRecommendations: mocks.postgresGetRecommendations,
    getAnalysis: mocks.postgresGetAnalysis,
    getTracking: mocks.postgresGetTracking,
    getProviderMeta: mocks.postgresGetProviderMeta
  }
}));

vi.mock("@/lib/server/news-curation", () => ({
  applyNewsCurationToRecommendations: mocks.applyNewsCurationToRecommendations,
  applyNewsCurationToAnalysis: mocks.applyNewsCurationToAnalysis,
  applyNewsCurationToTracking: mocks.applyNewsCurationToTracking
}));

import { getDataProvider } from "@/lib/providers";

describe("getDataProvider", () => {
  const originalEnv = {
    dataProvider: process.env.SWING_RADAR_DATA_PROVIDER,
    fallbackProvider: process.env.SWING_RADAR_FALLBACK_PROVIDER
  };
  let warnSpy: ReturnType<typeof vi.spyOn>;

  const recommendationPayload = {
    generatedAt: "2026-03-08T00:00:00.000Z",
    items: [],
    dailyScan: null
  };
  const analysisPayload = {
    generatedAt: "2026-03-08T00:00:00.000Z",
    items: []
  };
  const trackingPayload = {
    generatedAt: "2026-03-08T00:00:00.000Z",
    history: [],
    details: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    process.env.SWING_RADAR_DATA_PROVIDER = "postgres";
    delete process.env.SWING_RADAR_FALLBACK_PROVIDER;

    mocks.mockGetProviderMeta.mockReturnValue({
      configured: { provider: "mockDataProvider", mode: "mock" },
      lastUsed: { provider: "mockDataProvider", mode: "mock" },
      fallbackTriggered: false
    });
    mocks.fileGetProviderMeta.mockReturnValue({
      configured: { provider: "fileDataProvider", mode: "file" },
      lastUsed: { provider: "fileDataProvider", mode: "file" },
      fallbackTriggered: false
    });
    mocks.postgresGetProviderMeta.mockReturnValue({
      configured: { provider: "postgresDataProvider", mode: "external" },
      lastUsed: { provider: "postgresDataProvider", mode: "external" },
      fallbackTriggered: false
    });

    mocks.applyNewsCurationToRecommendations.mockImplementation(async (payload) => payload);
    mocks.applyNewsCurationToAnalysis.mockImplementation(async (payload) => payload);
    mocks.applyNewsCurationToTracking.mockImplementation(async (payload) => payload);
  });

  afterEach(() => {
    warnSpy.mockRestore();

    if (originalEnv.dataProvider === undefined) {
      delete process.env.SWING_RADAR_DATA_PROVIDER;
    } else {
      process.env.SWING_RADAR_DATA_PROVIDER = originalEnv.dataProvider;
    }

    if (originalEnv.fallbackProvider === undefined) {
      delete process.env.SWING_RADAR_FALLBACK_PROVIDER;
    } else {
      process.env.SWING_RADAR_FALLBACK_PROVIDER = originalEnv.fallbackProvider;
    }
  });

  it("uses the primary provider when it succeeds", async () => {
    mocks.postgresGetRecommendations.mockResolvedValue(recommendationPayload);

    const provider = getDataProvider();
    const result = await provider.getRecommendations();

    expect(result).toEqual(recommendationPayload);
    expect(mocks.postgresGetRecommendations).toHaveBeenCalledTimes(1);
    expect(mocks.fileGetRecommendations).not.toHaveBeenCalled();
    expect(provider.getProviderMeta()).toMatchObject({
      configured: { provider: "postgresDataProvider", mode: "external" },
      fallback: { provider: "fileDataProvider", mode: "file" },
      lastUsed: { provider: "postgresDataProvider", mode: "external" },
      fallbackTriggered: false
    });
  });

  it("falls back to the secondary provider when the primary throws", async () => {
    const error = new Error("postgres unavailable");
    mocks.postgresGetAnalysis.mockRejectedValue(error);
    mocks.fileGetAnalysis.mockResolvedValue(analysisPayload);

    const provider = getDataProvider();
    const result = await provider.getAnalysis();

    expect(result).toEqual(analysisPayload);
    expect(mocks.postgresGetAnalysis).toHaveBeenCalledTimes(1);
    expect(mocks.fileGetAnalysis).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[provider-fallback] analysis failed on postgres, falling back to file",
      error
    );
    expect(provider.getProviderMeta()).toMatchObject({
      configured: { provider: "postgresDataProvider", mode: "external" },
      fallback: { provider: "fileDataProvider", mode: "file" },
      lastUsed: { provider: "fileDataProvider", mode: "file" },
      fallbackTriggered: true
    });
  });

  it("does not configure a fallback path when primary and fallback resolve to the same provider", async () => {
    process.env.SWING_RADAR_DATA_PROVIDER = "file";
    process.env.SWING_RADAR_FALLBACK_PROVIDER = "file";
    mocks.fileGetTracking.mockResolvedValue(trackingPayload);

    const provider = getDataProvider();
    const result = await provider.getTracking();

    expect(result).toEqual(trackingPayload);
    expect(mocks.fileGetTracking).toHaveBeenCalledTimes(1);
    expect(provider.getProviderMeta()).toMatchObject({
      configured: { provider: "fileDataProvider", mode: "file" },
      fallback: undefined,
      lastUsed: { provider: "fileDataProvider", mode: "file" },
      fallbackTriggered: false
    });
  });
});
