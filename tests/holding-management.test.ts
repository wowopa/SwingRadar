import { describe, expect, it } from "vitest";

import { buildHoldingActionBoard } from "@/lib/recommendations/holding-management";

describe("holding management board", () => {
  it("classifies holdings into exit, take-profit, and time-stop groups", () => {
    const board = buildHoldingActionBoard({
      generatedAt: "2026-03-31T00:30:00.000Z",
      profileName: "테스트 계정",
      positions: [
        {
          ticker: "AAA001",
          company: "Alpha",
          sector: "Tech",
          quantity: 10,
          averagePrice: 100_000,
          enteredAt: "2026-03-25",
          tradePlan: {
            currentPrice: 109_000,
            currentPriceLabel: "109,000원",
            entryLabel: "100,000원",
            stopLabel: "96,000원",
            stopPrice: 96_000,
            targetLabel: "108,000원",
            targetPrice: 108_000,
            stretchTargetLabel: "112,000원",
            holdWindowLabel: "5~10거래일",
            riskRewardLabel: "1 : 2.0",
            nextStep: "부분 익절"
          }
        },
        {
          ticker: "BBB001",
          company: "Beta",
          sector: "Bio",
          quantity: 8,
          averagePrice: 80_000,
          enteredAt: "2026-03-29",
          tradePlan: {
            currentPrice: 74_000,
            currentPriceLabel: "74,000원",
            entryLabel: "80,000원",
            stopLabel: "76,000원",
            stopPrice: 76_000,
            targetLabel: "87,000원",
            targetPrice: 87_000,
            stretchTargetLabel: "90,000원",
            holdWindowLabel: "5~10거래일",
            riskRewardLabel: "1 : 1.4",
            nextStep: "손절 검토"
          }
        },
        {
          ticker: "CCC001",
          company: "Gamma",
          sector: "Industrial",
          quantity: 12,
          averagePrice: 50_000,
          enteredAt: "2026-03-20",
          tradePlan: {
            currentPrice: 50_500,
            currentPriceLabel: "50,500원",
            entryLabel: "50,000원",
            stopLabel: "47,500원",
            stopPrice: 47_500,
            targetLabel: "55,000원",
            targetPrice: 55_000,
            stretchTargetLabel: "58,000원",
            holdWindowLabel: "5~10거래일",
            riskRewardLabel: "1 : 1.8",
            nextStep: "관찰"
          }
        }
      ]
    });

    expect(board?.summary.profileName).toBe("테스트 계정");
    expect(board?.summary.holdingCount).toBe(3);
    expect(board?.summary.takeProfitCount).toBe(1);
    expect(board?.summary.exitReviewCount).toBe(1);
    expect(board?.summary.timeStopReviewCount).toBe(1);
    expect(board?.summary.holdCount).toBe(0);
    expect(board?.sections[0]).toMatchObject({
      status: "exit_review",
      count: 1
    });
    expect(board?.sections[1]).toMatchObject({
      status: "take_profit",
      count: 1
    });
    expect(board?.sections[3]).toMatchObject({
      status: "time_stop_review",
      count: 1
    });
    expect(board?.items[0]).toMatchObject({
      ticker: "BBB001",
      actionStatus: "exit_review"
    });
    expect(board?.items[1]).toMatchObject({
      ticker: "AAA001",
      actionStatus: "take_profit"
    });
    expect(board?.items[2]).toMatchObject({
      ticker: "CCC001",
      actionStatus: "time_stop_review",
      holdingDays: 12
    });
  });
});
