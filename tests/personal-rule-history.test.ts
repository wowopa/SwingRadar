import { describe, expect, it } from "vitest";

import {
  buildPersonalRuleHistorySummaries,
  buildRecentRuleImpacts
} from "@/lib/portfolio/personal-rule-history";
import type { UserOpeningRecheckScanSnapshot } from "@/lib/server/user-opening-recheck-board";
import type { PortfolioPersonalRuleEntry } from "@/types/recommendation";

function createRule(overrides: Partial<PortfolioPersonalRuleEntry>): PortfolioPersonalRuleEntry {
  return {
    id: "rule-1",
    text: "추격 금지",
    sourceCategory: "watchouts",
    sourceLabel: "아쉬운 점",
    isActive: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    updatedBy: "tester@example.com",
    ...overrides
  };
}

function createScan(overrides: Partial<UserOpeningRecheckScanSnapshot>): UserOpeningRecheckScanSnapshot {
  return {
    scanKey: "2026-04-05",
    updatedAt: "2026-04-05T00:05:00.000Z",
    items: {},
    ...overrides
  };
}

describe("personal rule history helpers", () => {
  it("builds per-rule history across multiple scans", () => {
    const rules = [
      createRule({
        id: "rule-gap",
        text: "추격 금지"
      }),
      createRule({
        id: "rule-confirm",
        text: "확인 가격 실패면 당일 보류",
        isActive: false
      })
    ];
    const scans = [
      createScan({
        scanKey: "2026-04-05",
        updatedAt: "2026-04-05T00:05:00.000Z",
        items: {
          AAA001: {
            ticker: "AAA001",
            status: "watch",
            updatedAt: "2026-04-05T00:05:00.000Z",
            checklist: {
              gap: "elevated",
              confirmation: "confirmed",
              action: "review"
            }
          }
        }
      }),
      createScan({
        scanKey: "2026-04-02",
        updatedAt: "2026-04-02T00:05:00.000Z",
        items: {
          BBB001: {
            ticker: "BBB001",
            status: "avoid",
            updatedAt: "2026-04-02T00:05:00.000Z",
            checklist: {
              gap: "normal",
              confirmation: "mixed",
              action: "review"
            }
          }
        }
      }),
      createScan({
        scanKey: "2026-03-10",
        updatedAt: "2026-03-10T00:05:00.000Z",
        items: {
          CCC001: {
            ticker: "CCC001",
            status: "avoid",
            updatedAt: "2026-03-10T00:05:00.000Z",
            checklist: {
              gap: "overheated",
              confirmation: "confirmed",
              action: "review"
            }
          }
        }
      })
    ];
    const riskPatterns = [
      {
        id: "elevated:confirmed:review",
        title: "갭만 높고 확인은 된 케이스",
        count: 6,
        profitableCount: 2,
        lossCount: 4,
        winRate: 33
      }
    ];

    const histories = buildPersonalRuleHistorySummaries({
      openingCheckScans: scans,
      rules,
      openingCheckRiskPatterns: riskPatterns,
      referenceTime: Date.parse("2026-04-05T00:05:00.000Z")
    });

    expect(histories).toHaveLength(2);
    expect(histories[0]).toMatchObject({
      ruleId: "rule-gap",
      totalImpactCount: 2,
      recentImpactCount: 1,
      lastAppliedAt: "2026-04-05T00:05:00.000Z",
      recentTickers: ["AAA001"]
    });
    expect(histories[0]?.impacts[0]).toMatchObject({
      ticker: "AAA001",
      baseStatus: "watch",
      suggestedStatus: "avoid",
      riskPatternTitle: "갭만 높고 확인은 된 케이스"
    });

    expect(histories[1]).toMatchObject({
      ruleId: "rule-confirm",
      totalImpactCount: 1,
      recentImpactCount: 1,
      lastAppliedAt: "2026-04-02T00:05:00.000Z",
      recentTickers: ["BBB001"]
    });
    expect(histories[1]?.impacts[0]?.reason).toContain("확인 가격");
  });

  it("limits recent impact summaries to active rules inside the recent window", () => {
    const rules = [
      createRule({
        id: "rule-gap",
        text: "추격 금지",
        isActive: true
      }),
      createRule({
        id: "rule-confirm",
        text: "확인 가격 실패면 당일 보류",
        isActive: false
      })
    ];
    const scans = [
      createScan({
        scanKey: "2026-04-05",
        updatedAt: "2026-04-05T00:05:00.000Z",
        items: {
          AAA001: {
            ticker: "AAA001",
            status: "watch",
            updatedAt: "2026-04-05T00:05:00.000Z",
            checklist: {
              gap: "elevated",
              confirmation: "confirmed",
              action: "review"
            }
          }
        }
      }),
      createScan({
        scanKey: "2026-04-02",
        updatedAt: "2026-04-02T00:05:00.000Z",
        items: {
          BBB001: {
            ticker: "BBB001",
            status: "avoid",
            updatedAt: "2026-04-02T00:05:00.000Z",
            checklist: {
              gap: "normal",
              confirmation: "mixed",
              action: "review"
            }
          }
        }
      }),
      createScan({
        scanKey: "2026-03-10",
        updatedAt: "2026-03-10T00:05:00.000Z",
        items: {
          CCC001: {
            ticker: "CCC001",
            status: "avoid",
            updatedAt: "2026-03-10T00:05:00.000Z",
            checklist: {
              gap: "overheated",
              confirmation: "confirmed",
              action: "review"
            }
          }
        }
      })
    ];

    const impacts = buildRecentRuleImpacts({
      openingCheckScans: scans,
      rules,
      referenceTime: Date.parse("2026-04-05T00:05:00.000Z")
    });

    expect(impacts).toHaveLength(1);
    expect(impacts[0]).toMatchObject({
      ticker: "AAA001",
      baseStatus: "watch",
      suggestedStatus: "avoid"
    });
    expect(impacts[0]?.matchedRules).toHaveLength(1);
    expect(impacts[0]?.matchedRules[0]?.id).toBe("rule-gap");
  });
});
