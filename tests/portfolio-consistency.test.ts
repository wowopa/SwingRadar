import { describe, expect, it } from "vitest";

import { groupPortfolioJournalByTicker } from "@/lib/portfolio/journal-insights";
import { mergePortfolioProfileWithJournal } from "@/lib/portfolio/merge-profile-with-journal";
import {
  applyTradeEventToPortfolioProfile,
  createEmptyPortfolioProfile
} from "@/lib/server/portfolio-profile";

describe("portfolio state consistency", () => {
  it("keeps journal metrics aligned with synced profile through buy-add-partial-exit flows", () => {
    const baseProfile = {
      ...createEmptyPortfolioProfile(),
      totalCapital: 10_000_000,
      availableCash: 10_000_000
    };

    const lifecycleEvents = [
      {
        id: "buy-1",
        ticker: "005930",
        company: "삼성전자",
        sector: "반도체",
        type: "buy" as const,
        quantity: 10,
        price: 100_000,
        fees: 1_000,
        tradedAt: "2026-04-01T09:05:00.000+09:00",
        createdAt: "2026-04-01T09:05:00.000+09:00",
        createdBy: "tester@example.com"
      },
      {
        id: "add-1",
        ticker: "005930",
        company: "삼성전자",
        sector: "반도체",
        type: "add" as const,
        quantity: 5,
        price: 120_000,
        fees: 500,
        tradedAt: "2026-04-02T09:15:00.000+09:00",
        createdAt: "2026-04-02T09:15:00.000+09:00",
        createdBy: "tester@example.com"
      },
      {
        id: "partial-1",
        ticker: "005930",
        company: "삼성전자",
        sector: "반도체",
        type: "take_profit_partial" as const,
        quantity: 8,
        price: 130_000,
        fees: 1_500,
        tradedAt: "2026-04-03T10:10:00.000+09:00",
        createdAt: "2026-04-03T10:10:00.000+09:00",
        createdBy: "tester@example.com"
      },
      {
        id: "exit-1",
        ticker: "005930",
        company: "삼성전자",
        sector: "반도체",
        type: "exit_full" as const,
        quantity: 7,
        price: 110_000,
        fees: 1_000,
        tradedAt: "2026-04-05T09:20:00.000+09:00",
        createdAt: "2026-04-05T09:20:00.000+09:00",
        createdBy: "tester@example.com"
      }
    ];

    const openProfile = lifecycleEvents.slice(0, 3).reduce((profile, event) => {
      return applyTradeEventToPortfolioProfile(profile, event, "tester@example.com");
    }, baseProfile);
    const openGroup = groupPortfolioJournalByTicker(lifecycleEvents.slice(0, 3))[0];

    expect(openProfile.positions).toHaveLength(1);
    expect(openProfile.positions[0]?.quantity).toBe(openGroup?.metrics.remainingQuantity);
    expect(openProfile.positions[0]?.averagePrice).toBeCloseTo(openGroup?.metrics.averageCost ?? 0, 6);
    expect(openProfile.availableCash).toBe(9_437_000);

    const closedProfile = lifecycleEvents.reduce((profile, event) => {
      return applyTradeEventToPortfolioProfile(profile, event, "tester@example.com");
    }, baseProfile);
    const closedGroup = groupPortfolioJournalByTicker(lifecycleEvents)[0];

    expect(closedProfile.positions).toHaveLength(0);
    expect(closedProfile.availableCash).toBe(10_206_000);
    expect(closedGroup?.metrics.remainingQuantity).toBe(0);
    expect(Math.round(closedGroup?.metrics.realizedPnl ?? 0)).toBe(206_000);
  });

  it("removes stale profile positions when journal shows the position is already closed", () => {
    const profile = {
      ...createEmptyPortfolioProfile(),
      positions: [
        {
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          quantity: 5,
          averagePrice: 10_000,
          enteredAt: "2026-04-01",
          note: "stale"
        },
        {
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          quantity: 3,
          averagePrice: 20_000,
          enteredAt: "2026-04-02",
          note: "manual"
        }
      ]
    };

    const journal = {
      events: [
        {
          id: "ccc-buy",
          ticker: "CCC001",
          company: "Gamma",
          sector: "Power",
          type: "buy" as const,
          quantity: 2,
          price: 30_000,
          fees: 0,
          tradedAt: "2026-04-04T09:10:00.000+09:00",
          note: "active",
          createdAt: "2026-04-04T09:10:00.000+09:00",
          createdBy: "tester@example.com"
        },
        {
          id: "aaa-exit",
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          type: "exit_full" as const,
          quantity: 5,
          price: 11_000,
          fees: 0,
          tradedAt: "2026-04-03T09:20:00.000+09:00",
          note: "closed",
          createdAt: "2026-04-03T09:20:00.000+09:00",
          createdBy: "tester@example.com"
        },
        {
          id: "aaa-buy",
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          type: "buy" as const,
          quantity: 5,
          price: 10_000,
          fees: 0,
          tradedAt: "2026-04-01T09:10:00.000+09:00",
          note: "opened",
          createdAt: "2026-04-01T09:10:00.000+09:00",
          createdBy: "tester@example.com"
        }
      ],
      updatedAt: "2026-04-04T09:10:00.000+09:00",
      updatedBy: "tester@example.com"
    };

    const merged = mergePortfolioProfileWithJournal(profile, journal);

    expect(merged.positions.map((position) => position.ticker)).toEqual(["BBB001", "CCC001"]);
    expect(merged.positions.find((position) => position.ticker === "CCC001")).toMatchObject({
      quantity: 2,
      averagePrice: 30_000,
      enteredAt: "2026-04-04"
    });
    expect(merged.positions.find((position) => position.ticker === "BBB001")?.note).toBe("manual");
  });
});
