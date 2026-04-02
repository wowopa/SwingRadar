import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  loadPortfolioCloseReviewsForUser,
  savePortfolioCloseReviewForUser
} from "@/lib/server/portfolio-close-reviews";

describe("portfolio close review storage", () => {
  let tempDir = "";
  const previousReviewsFile = process.env.SWING_RADAR_USER_PORTFOLIO_CLOSE_REVIEWS_FILE;
  const previousDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-portfolio-close-reviews-"));
    process.env.SWING_RADAR_USER_PORTFOLIO_CLOSE_REVIEWS_FILE = path.join(tempDir, "portfolio-close-reviews.json");
    delete process.env.SWING_RADAR_DATABASE_URL;
  });

  afterEach(async () => {
    if (previousReviewsFile === undefined) {
      delete process.env.SWING_RADAR_USER_PORTFOLIO_CLOSE_REVIEWS_FILE;
    } else {
      process.env.SWING_RADAR_USER_PORTFOLIO_CLOSE_REVIEWS_FILE = previousReviewsFile;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = previousDatabaseUrl;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns an empty map when nothing is saved", async () => {
    const reviews = await loadPortfolioCloseReviewsForUser("user-1");
    expect(reviews).toEqual({});
  });

  it("stores normalized close reviews separately for each user", async () => {
    await savePortfolioCloseReviewForUser("user-1", {
      positionKey: "005930:2026-04-01T06:00:00.000Z",
      ticker: "005930",
      closedAt: "2026-04-01T15:00:00+09:00",
      strengthsNote: "  계획대로 첫 진입 후 익절  ",
      watchoutsNote: "  손절 기준은 조금 늦었다  ",
      nextRuleNote: "  보류 상태 강행 진입 금지  ",
      updatedBy: "tester@example.com"
    });

    const userReviews = await loadPortfolioCloseReviewsForUser("user-1");
    const otherReviews = await loadPortfolioCloseReviewsForUser("user-2");

    expect(Object.keys(userReviews)).toHaveLength(1);
    expect(userReviews["005930:2026-04-01T06:00:00.000Z"]).toMatchObject({
      positionKey: "005930:2026-04-01T06:00:00.000Z",
      ticker: "005930",
      closedAt: "2026-04-01T06:00:00.000Z",
      strengthsNote: "계획대로 첫 진입 후 익절",
      watchoutsNote: "손절 기준은 조금 늦었다",
      nextRuleNote: "보류 상태 강행 진입 금지",
      updatedBy: "tester@example.com"
    });
    expect(otherReviews).toEqual({});
  });
});
