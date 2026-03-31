import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createEmptyPortfolioProfile,
  isPortfolioProfileConfigured,
  loadPortfolioProfileDocument,
  savePortfolioProfileDocument
} from "@/lib/server/portfolio-profile";

describe("portfolio profile storage", () => {
  let tempDir = "";
  const previousProfileFile = process.env.SWING_RADAR_PORTFOLIO_PROFILE_FILE;
  const previousDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-portfolio-profile-"));
    process.env.SWING_RADAR_PORTFOLIO_PROFILE_FILE = path.join(tempDir, "portfolio-profile.json");
    delete process.env.SWING_RADAR_DATABASE_URL;
  });

  afterEach(async () => {
    if (previousProfileFile === undefined) {
      delete process.env.SWING_RADAR_PORTFOLIO_PROFILE_FILE;
    } else {
      process.env.SWING_RADAR_PORTFOLIO_PROFILE_FILE = previousProfileFile;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.SWING_RADAR_DATABASE_URL;
    } else {
      process.env.SWING_RADAR_DATABASE_URL = previousDatabaseUrl;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns the default profile when no saved document exists", async () => {
    const profile = await loadPortfolioProfileDocument();

    expect(profile).toEqual(createEmptyPortfolioProfile());
    expect(isPortfolioProfileConfigured(profile)).toBe(false);
  });

  it("normalizes, deduplicates, and persists saved positions", async () => {
    const saved = await savePortfolioProfileDocument({
      name: "실전 운용",
      totalCapital: 50_000_000,
      availableCash: 12_000_000,
      maxRiskPerTradePercent: 0.8,
      maxConcurrentPositions: 5,
      sectorLimit: 2,
      positions: [
        {
          ticker: "005930",
          quantity: 10,
          averagePrice: 71_000,
          note: "core"
        },
        {
          ticker: "005930",
          quantity: 12,
          averagePrice: 72_000
        },
        {
          ticker: "INVALID",
          quantity: 0,
          averagePrice: 1_000
        }
      ],
      updatedAt: "2026-03-31T00:00:00.000Z",
      updatedBy: "admin-dashboard"
    });

    const loaded = await loadPortfolioProfileDocument();

    expect(saved.positions).toHaveLength(1);
    expect(saved.positions[0]).toMatchObject({
      ticker: "005930",
      company: "삼성전자",
      quantity: 12,
      averagePrice: 72_000
    });
    expect(saved.positions[0]?.sector).toBeTruthy();
    expect(loaded).toEqual(saved);
    expect(isPortfolioProfileConfigured(loaded)).toBe(true);
  });
});
