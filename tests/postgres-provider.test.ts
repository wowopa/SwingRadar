import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPostgresPool: vi.fn()
}));

vi.mock("@/lib/server/postgres", () => ({
  getPostgresPool: mocks.getPostgresPool
}));

import { postgresDataProvider } from "@/lib/data-sources/postgres-provider";

describe("postgresDataProvider", () => {
  const originalDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("orders recommendation snapshots with numeric score casting", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          generated_at: "2026-03-09T00:00:00.000Z",
          payload: {
            ticker: "005930",
            company: "삼성전자",
            sector: "반도체",
            signalTone: "중립",
            score: 59.1,
            signalLabel: "관찰 신호",
            rationale: "테스트",
            invalidation: "160,000원 하회",
            invalidationDistance: -2.1,
            riskRewardRatio: "1.8",
            validationSummary: "테스트 요약",
            checkpoints: [],
            validation: {
              hitRate: 51.2,
              avgReturn: 3.1,
              sampleSize: 12,
              maxDrawdown: -4.4
            },
            observationWindow: "20거래일",
            updatedAt: "2026-03-09T00:00:00.000Z"
          }
        }
      ]
    });

    mocks.getPostgresPool.mockReturnValue({ query });

    const result = await postgresDataProvider.getRecommendations();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("order by (recommendation_snapshots.payload->>'score')::numeric desc nulls last")
    );
    expect(result.items[0]?.score).toBe(59.1);
  });

  it("throws a not found ApiError when recommendation snapshots are empty", async () => {
    mocks.getPostgresPool.mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] })
    });

    await expect(postgresDataProvider.getRecommendations()).rejects.toMatchObject({
      code: "RECOMMENDATIONS_EMPTY",
      status: 404
    });
  });
});
