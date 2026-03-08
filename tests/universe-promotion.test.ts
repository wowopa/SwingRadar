import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSymbolByTicker: vi.fn(),
  addSymbolToWatchlist: vi.fn(),
  saveUniverseCandidateReview: vi.fn()
}));

vi.mock("@/lib/symbols/master", () => ({
  getSymbolByTicker: mocks.getSymbolByTicker
}));

vi.mock("@/lib/server/watchlist-manager", () => ({
  addSymbolToWatchlist: mocks.addSymbolToWatchlist
}));

vi.mock("@/lib/server/universe-candidate-reviews", () => ({
  saveUniverseCandidateReview: mocks.saveUniverseCandidateReview
}));

import { ApiError } from "@/lib/server/api-error";
import { promoteUniverseCandidate } from "@/lib/server/universe-promotion";

describe("promoteUniverseCandidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("adds the candidate to watchlist and marks the review as promoted", async () => {
    mocks.getSymbolByTicker.mockReturnValue({
      ticker: "005930",
      company: "삼성전자"
    });
    mocks.addSymbolToWatchlist.mockResolvedValue({
      added: true,
      entry: { ticker: "005930" },
      estimate: "ok",
      timings: { pipelineMs: 100, ingestMs: 40, totalMs: 140 }
    });
    mocks.saveUniverseCandidateReview.mockResolvedValue({
      ticker: "005930",
      status: "promoted",
      note: "watchlist 편입 실행",
      updatedAt: "2026-03-09T00:00:00.000Z",
      updatedBy: "admin-editor"
    });

    const result = await promoteUniverseCandidate({
      ticker: "005930",
      note: "watchlist 편입 실행",
      updatedBy: "admin-editor"
    });

    expect(mocks.addSymbolToWatchlist).toHaveBeenCalledTimes(1);
    expect(mocks.saveUniverseCandidateReview).toHaveBeenCalledWith({
      ticker: "005930",
      status: "promoted",
      note: "watchlist 편입 실행",
      updatedBy: "admin-editor"
    });
    expect(result).toMatchObject({
      review: {
        ticker: "005930",
        status: "promoted"
      },
      watchlist: {
        added: true
      }
    });
  });

  it("throws an ApiError when the candidate ticker is unknown", async () => {
    mocks.getSymbolByTicker.mockReturnValue(undefined);

    await expect(
      promoteUniverseCandidate({
        ticker: "UNKNOWN",
        updatedBy: "admin-editor"
      })
    ).rejects.toMatchObject<ApiError>({
      code: "UNIVERSE_CANDIDATE_NOT_FOUND",
      status: 404
    });
  });
});
