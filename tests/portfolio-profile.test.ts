import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  applyTradeEventToPortfolioProfile,
  createEmptyPortfolioProfile,
  isPortfolioProfileConfigured,
  loadPortfolioProfileDocument,
  loadPortfolioProfileForUser,
  savePortfolioProfileDocument
  ,
  savePortfolioProfileForUser
} from "@/lib/server/portfolio-profile";

describe("portfolio profile storage", () => {
  let tempDir = "";
  const previousProfileFile = process.env.SWING_RADAR_PORTFOLIO_PROFILE_FILE;
  const previousUserProfilesFile = process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE;
  const previousDatabaseUrl = process.env.SWING_RADAR_DATABASE_URL;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-portfolio-profile-"));
    process.env.SWING_RADAR_PORTFOLIO_PROFILE_FILE = path.join(tempDir, "portfolio-profile.json");
    process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE = path.join(tempDir, "user-portfolio-profiles.json");
    delete process.env.SWING_RADAR_DATABASE_URL;
  });

  afterEach(async () => {
    if (previousProfileFile === undefined) {
      delete process.env.SWING_RADAR_PORTFOLIO_PROFILE_FILE;
    } else {
      process.env.SWING_RADAR_PORTFOLIO_PROFILE_FILE = previousProfileFile;
    }

    if (previousUserProfilesFile === undefined) {
      delete process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE;
    } else {
      process.env.SWING_RADAR_USER_PORTFOLIO_PROFILES_FILE = previousUserProfilesFile;
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
          enteredAt: "2026-03-20",
          note: "core"
        },
        {
          ticker: "005930",
          quantity: 12,
          averagePrice: 72_000,
          enteredAt: "2026-03-20"
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
      averagePrice: 72_000,
      enteredAt: "2026-03-20"
    });
    expect(saved.positions[0]?.sector).toBeTruthy();
    expect(loaded).toEqual(saved);
    expect(isPortfolioProfileConfigured(loaded)).toBe(true);
  });

  it("stores portfolio profiles separately for each user", async () => {
    const saved = await savePortfolioProfileForUser("user-1", {
      name: "개인 포트폴리오",
      totalCapital: 20_000_000,
      availableCash: 5_000_000,
      maxRiskPerTradePercent: 1,
      maxConcurrentPositions: 3,
      sectorLimit: 2,
      positions: [
        {
          ticker: "005930",
          quantity: 5,
          averagePrice: 70_000,
          enteredAt: "2026-03-20"
        }
      ],
      updatedAt: "2026-03-31T00:00:00.000Z",
      updatedBy: "tester@example.com"
    });

    const loadedUser = await loadPortfolioProfileForUser("user-1");
    const loadedOtherUser = await loadPortfolioProfileForUser("user-2");

    expect(saved.name).toBe("개인 포트폴리오");
    expect(loadedUser.positions).toHaveLength(1);
    expect(loadedUser.positions[0]).toMatchObject({
      ticker: "005930",
      enteredAt: "2026-03-20"
    });
    expect(loadedOtherUser).toEqual(createEmptyPortfolioProfile());
  });

  it("reduces remaining quantity and increases cash on a partial take profit sync", () => {
    const profile = {
      ...createEmptyPortfolioProfile(),
      totalCapital: 20_000_000,
      availableCash: 2_000_000,
      positions: [
        {
          ticker: "005930",
          company: "삼성전자",
          sector: "반도체",
          quantity: 10,
          averagePrice: 70_000,
          enteredAt: "2026-03-20"
        }
      ]
    };

    const next = applyTradeEventToPortfolioProfile(
      profile,
      {
        ticker: "005930",
        type: "take_profit_partial",
        quantity: 4,
        price: 75_000,
        fees: 1_000,
        tradedAt: "2026-04-02T00:00:00.000Z"
      },
      "tester@example.com"
    );

    expect(next.positions).toHaveLength(1);
    expect(next.positions[0]).toMatchObject({
      ticker: "005930",
      quantity: 6,
      averagePrice: 70_000
    });
    expect(next.availableCash).toBe(2_299_000);
  });

  it("removes the position on a full exit sync", () => {
    const profile = {
      ...createEmptyPortfolioProfile(),
      totalCapital: 20_000_000,
      availableCash: 2_000_000,
      positions: [
        {
          ticker: "005930",
          company: "삼성전자",
          sector: "반도체",
          quantity: 5,
          averagePrice: 70_000,
          enteredAt: "2026-03-20"
        }
      ]
    };

    const next = applyTradeEventToPortfolioProfile(
      profile,
      {
        ticker: "005930",
        type: "exit_full",
        quantity: 5,
        price: 74_000,
        fees: 1_000,
        tradedAt: "2026-04-02T00:00:00.000Z"
      },
      "tester@example.com"
    );

    expect(next.positions).toHaveLength(0);
    expect(next.availableCash).toBe(2_369_000);
  });
});
