import { describe, expect, it } from "vitest";

import { buildPortfolioStateConsistencyReport } from "@/lib/portfolio/portfolio-state-consistency";
import { createEmptyPortfolioProfile } from "@/lib/server/portfolio-profile";

describe("buildPortfolioStateConsistencyReport", () => {
  it("returns aligned when holdings already match the journal lifecycle", () => {
    const profile = {
      ...createEmptyPortfolioProfile(),
      positions: [
        {
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          quantity: 5,
          averagePrice: 10_000,
          enteredAt: "2026-04-01"
        }
      ]
    };
    const journal = {
      events: [
        {
          id: "aaa-buy",
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          type: "buy" as const,
          quantity: 5,
          price: 10_000,
          fees: 0,
          tradedAt: "2026-04-01T09:00:00.000+09:00",
          createdAt: "2026-04-01T09:00:00.000+09:00",
          createdBy: "tester@example.com"
        }
      ],
      updatedAt: "2026-04-01T09:00:00.000+09:00",
      updatedBy: "tester@example.com"
    };

    expect(buildPortfolioStateConsistencyReport(profile, journal)).toMatchObject({
      status: "aligned",
      issueCount: 0
    });
  });

  it("reports stale, missing, quantity, and average price mismatches", () => {
    const profile = {
      ...createEmptyPortfolioProfile(),
      positions: [
        {
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          quantity: 5,
          averagePrice: 10_000,
          enteredAt: "2026-04-01"
        },
        {
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          quantity: 2,
          averagePrice: 18_000,
          enteredAt: "2026-04-01"
        },
        {
          ticker: "DDD001",
          company: "Delta",
          sector: "Retail",
          quantity: 4,
          averagePrice: 30_000,
          enteredAt: "2026-04-02"
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
          quantity: 3,
          price: 21_000,
          fees: 0,
          tradedAt: "2026-04-03T09:00:00.000+09:00",
          createdAt: "2026-04-03T09:00:00.000+09:00",
          createdBy: "tester@example.com"
        },
        {
          id: "bbb-add",
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          type: "add" as const,
          quantity: 2,
          price: 20_000,
          fees: 0,
          tradedAt: "2026-04-02T09:10:00.000+09:00",
          createdAt: "2026-04-02T09:10:00.000+09:00",
          createdBy: "tester@example.com"
        },
        {
          id: "bbb-buy",
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          type: "buy" as const,
          quantity: 1,
          price: 16_000,
          fees: 0,
          tradedAt: "2026-04-01T09:10:00.000+09:00",
          createdAt: "2026-04-01T09:10:00.000+09:00",
          createdBy: "tester@example.com"
        },
        {
          id: "aaa-exit",
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          type: "exit_full" as const,
          quantity: 5,
          price: 12_000,
          fees: 0,
          tradedAt: "2026-04-02T09:05:00.000+09:00",
          createdAt: "2026-04-02T09:05:00.000+09:00",
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
          tradedAt: "2026-04-01T09:00:00.000+09:00",
          createdAt: "2026-04-01T09:00:00.000+09:00",
          createdBy: "tester@example.com"
        }
      ],
      updatedAt: "2026-04-03T09:00:00.000+09:00",
      updatedBy: "tester@example.com"
    };

    const report = buildPortfolioStateConsistencyReport(profile, journal);

    expect(report.status).toBe("warning");
    expect(report.issueCount).toBe(4);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ticker: "AAA001", type: "stale_profile_position" }),
        expect.objectContaining({ ticker: "BBB001", type: "quantity_mismatch" }),
        expect.objectContaining({ ticker: "BBB001", type: "average_price_mismatch" }),
        expect.objectContaining({ ticker: "CCC001", type: "missing_profile_position" })
      ])
    );
  });
});
