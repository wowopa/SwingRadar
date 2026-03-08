import { beforeEach, describe, expect, it, vi } from "vitest";

const getTrackingMock = vi.fn();

vi.mock("@/lib/providers", () => ({
  getDataProvider: () => ({
    getTracking: getTrackingMock
  })
}));

import { getTrackingSnapshot } from "@/lib/services/tracking-service";

describe("getTrackingSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTrackingMock.mockResolvedValue({
      generatedAt: "2026-03-08T00:00:00.000Z",
      history: [
        { id: "h1", ticker: "005930", company: "삼성전자", signalDate: "2026-03-01", signalTone: "긍정", entryScore: 80, result: "관찰 유지", mfe: 3, mae: -1, holdingDays: 5 },
        { id: "h2", ticker: "035420", company: "NAVER", signalDate: "2026-03-03", signalTone: "중립", entryScore: 60, result: "종료", mfe: 1, mae: -3, holdingDays: 2 }
      ],
      details: {
        h1: { historyId: "h1", summary: "s1", invalidationReview: "i1", afterActionReview: "a1", reviewChecklist: [], metrics: [], chartSnapshot: [], historicalNews: [], scoreLog: [] },
        h2: { historyId: "h2", summary: "s2", invalidationReview: "i2", afterActionReview: "a2", reviewChecklist: [], metrics: [], chartSnapshot: [], historicalNews: [], scoreLog: [] }
      }
    });
  });

  it("filters history and trims details to matching ids", async () => {
    const result = await getTrackingSnapshot({ ticker: "삼성", result: "관찰 유지", from: "2026-03-01", to: "2026-03-31", limit: 10 });

    expect(result.history.map((item) => item.id)).toEqual(["h1"]);
    expect(Object.keys(result.details)).toEqual(["h1"]);
  });

  it("applies limit after filtering", async () => {
    const result = await getTrackingSnapshot({ limit: 1 });

    expect(result.history).toHaveLength(1);
    expect(Object.keys(result.details)).toEqual(["h1"]);
  });
});