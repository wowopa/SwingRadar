import { describe, expect, it } from "vitest";

import {
  buildPortfolioCloseReview,
  buildPortfolioCloseReviewRuleDashboard,
  buildPortfolioOpeningCheckAnalytics,
  buildPortfolioPerformanceDashboard,
  buildPortfolioReviewAnalytics,
  buildPortfolioReviewCalendarDashboard,
  buildPortfolioReviewSummary,
  calculatePortfolioJournalGroupMetrics,
  filterPortfolioGroupsByDays,
  groupPortfolioJournalByTicker,
  isClosingPortfolioTradeEventType
} from "@/lib/portfolio/journal-insights";
import type { PortfolioCloseReviewEntry, PortfolioTradeEvent } from "@/types/recommendation";

function createEvent(overrides: Partial<PortfolioTradeEvent>): PortfolioTradeEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    ticker: overrides.ticker ?? "005930",
    company: overrides.company ?? "삼성전자",
    sector: overrides.sector ?? "반도체",
    type: overrides.type ?? "buy",
    quantity: overrides.quantity ?? 1,
    price: overrides.price ?? 70000,
    fees: overrides.fees ?? 0,
    tradedAt: overrides.tradedAt ?? "2026-03-31T09:00:00+09:00",
    note: overrides.note,
    createdAt: overrides.createdAt ?? "2026-03-31T09:00:00+09:00",
    createdBy: overrides.createdBy ?? "tester@example.com"
  };
}

describe("portfolio journal insights", () => {
  it("calculates remaining quantity and realized pnl from mixed events", () => {
    const metrics = calculatePortfolioJournalGroupMetrics([
      createEvent({ type: "buy", quantity: 10, price: 70000, tradedAt: "2026-03-31T09:00:00+09:00" }),
      createEvent({ type: "take_profit_partial", quantity: 4, price: 76000, tradedAt: "2026-04-02T09:00:00+09:00" }),
      createEvent({ type: "exit_full", quantity: 6, price: 78000, tradedAt: "2026-04-04T09:00:00+09:00" })
    ]);

    expect(metrics.remainingQuantity).toBe(0);
    expect(metrics.realizedPnl).toBe(72000);
  });

  it("groups journal events and builds a close review for stop-loss exits", () => {
    const events = [
      createEvent({ type: "stop_loss", quantity: 5, price: 64000, tradedAt: "2026-04-03T09:00:00+09:00" }),
      createEvent({ type: "buy", quantity: 5, price: 70000, tradedAt: "2026-03-31T09:00:00+09:00" })
    ];

    const groups = groupPortfolioJournalByTicker(events);
    expect(groups).toHaveLength(1);
    expect(isClosingPortfolioTradeEventType(groups[0].latestEvent.type)).toBe(true);
    expect(groups[0].holdingDays).toBe(4);

    const review = buildPortfolioCloseReview(groups[0]);
    expect(review.headline).toBe("손절로 종료된 거래입니다.");
    expect(review.watchouts[0]).toContain("손절");
  });

  it("summarizes closed review patterns", () => {
    const groups = groupPortfolioJournalByTicker([
      createEvent({ ticker: "005930", company: "삼성전자", type: "stop_loss", quantity: 5, price: 64000, tradedAt: "2026-04-03T09:00:00+09:00" }),
      createEvent({ ticker: "005930", company: "삼성전자", type: "buy", quantity: 5, price: 70000, tradedAt: "2026-03-31T09:00:00+09:00" }),
      createEvent({ ticker: "000660", company: "SK하이닉스", type: "exit_full", quantity: 5, price: 135000, tradedAt: "2026-04-07T09:00:00+09:00" }),
      createEvent({ ticker: "000660", company: "SK하이닉스", type: "take_profit_partial", quantity: 2, price: 132000, tradedAt: "2026-04-05T09:00:00+09:00" }),
      createEvent({ ticker: "000660", company: "SK하이닉스", type: "buy", quantity: 5, price: 120000, tradedAt: "2026-03-31T09:00:00+09:00" })
    ]);

    const summary = buildPortfolioReviewSummary(groups);
    expect(summary.closedCount).toBe(2);
    expect(summary.profitableCount).toBe(1);
    expect(summary.lossCount).toBe(1);
    expect(summary.stopLossCount).toBe(1);
    expect(summary.patterns.find((pattern) => pattern.key === "partial_take")?.count).toBe(1);
  });

  it("builds monthly calendar and weekly review dashboard", () => {
    const groups = groupPortfolioJournalByTicker([
      createEvent({ ticker: "005930", company: "삼성전자", type: "stop_loss", quantity: 5, price: 64000, tradedAt: "2026-04-03T09:00:00+09:00", note: "손절 실행" }),
      createEvent({ ticker: "005930", company: "삼성전자", type: "buy", quantity: 5, price: 70000, tradedAt: "2026-03-31T09:00:00+09:00" }),
      createEvent({ ticker: "000660", company: "SK하이닉스", type: "exit_full", quantity: 5, price: 135000, tradedAt: "2026-04-07T09:00:00+09:00" }),
      createEvent({ ticker: "000660", company: "SK하이닉스", type: "take_profit_partial", quantity: 2, price: 132000, tradedAt: "2026-04-05T09:00:00+09:00" }),
      createEvent({ ticker: "000660", company: "SK하이닉스", type: "buy", quantity: 5, price: 120000, tradedAt: "2026-03-31T09:00:00+09:00" })
    ]);

    const dashboard = buildPortfolioReviewCalendarDashboard(groups);
    expect(dashboard.monthKey).toBe("2026-04");
    expect(dashboard.days.find((day) => day.dayOfMonth === 3)?.stopLossCount).toBe(1);
    expect(dashboard.days.find((day) => day.dayOfMonth === 7)?.closedCount).toBe(1);
    expect(dashboard.weeks[0]?.closedCount).toBeGreaterThan(0);
    expect(dashboard.behavior.memoCoverageRate).toBe(50);
    expect(dashboard.behavior.partialTakeUsageRate).toBe(50);
  });

  it("builds strategy and rule analytics from closed groups", () => {
    const groups = groupPortfolioJournalByTicker([
      createEvent({
        ticker: "005930",
        company: "?쇱꽦?꾩옄",
        type: "stop_loss",
        quantity: 5,
        price: 64000,
        tradedAt: "2026-04-03T09:00:00+09:00",
        note: "stop risk"
      }),
      createEvent({
        ticker: "005930",
        company: "?쇱꽦?꾩옄",
        type: "buy",
        quantity: 5,
        price: 70000,
        tradedAt: "2026-03-31T09:00:00+09:00"
      }),
      createEvent({
        ticker: "000660",
        company: "SK?섏씠?됱뒪",
        type: "exit_full",
        quantity: 5,
        price: 135000,
        tradedAt: "2026-04-07T09:00:00+09:00",
        note: "partial hold review"
      }),
      createEvent({
        ticker: "000660",
        company: "SK?섏씠?됱뒪",
        type: "take_profit_partial",
        quantity: 2,
        price: 132000,
        tradedAt: "2026-04-05T09:00:00+09:00"
      }),
      createEvent({
        ticker: "000660",
        company: "SK?섏씠?됱뒪",
        type: "buy",
        quantity: 5,
        price: 120000,
        tradedAt: "2026-03-31T09:00:00+09:00"
      })
    ]);

    const analytics = buildPortfolioReviewAnalytics(groups);
    expect(analytics.ruleMetrics.find((metric) => metric.key === "memo_coverage")?.value).toBe("100%");
    expect(analytics.ruleMetrics.find((metric) => metric.key === "partial_take")?.value).toBe("50%");
    expect(analytics.holdDistribution.find((bucket) => bucket.key === "swing_core")?.count).toBe(1);
    expect(analytics.holdDistribution.find((bucket) => bucket.key === "extended")?.count).toBe(1);
    expect(analytics.pnlDistribution.find((bucket) => bucket.key === "strong_gain")?.count).toBe(1);
    expect(analytics.tagInsights.find((tag) => tag.key === "risk_control")?.count).toBe(1);
    expect(analytics.tagInsights.find((tag) => tag.key === "scale_out")?.count).toBe(1);
  });

  it("builds account-level performance dashboard from closed groups", () => {
    const groups = groupPortfolioJournalByTicker([
      createEvent({
        ticker: "005930",
        company: "삼성전자",
        type: "stop_loss",
        quantity: 5,
        price: 64000,
        tradedAt: "2026-04-03T09:00:00+09:00",
        note: "stop risk"
      }),
      createEvent({
        ticker: "005930",
        company: "삼성전자",
        type: "buy",
        quantity: 5,
        price: 70000,
        tradedAt: "2026-03-31T09:00:00+09:00"
      }),
      createEvent({
        ticker: "000660",
        company: "SK하이닉스",
        type: "exit_full",
        quantity: 5,
        price: 135000,
        tradedAt: "2026-04-07T09:00:00+09:00",
        note: "partial hold review"
      }),
      createEvent({
        ticker: "000660",
        company: "SK하이닉스",
        type: "take_profit_partial",
        quantity: 2,
        price: 132000,
        tradedAt: "2026-04-05T09:00:00+09:00"
      }),
      createEvent({
        ticker: "000660",
        company: "SK하이닉스",
        type: "buy",
        quantity: 5,
        price: 120000,
        tradedAt: "2026-03-31T09:00:00+09:00"
      })
    ]);

    const dashboard = buildPortfolioPerformanceDashboard(groups);
    expect(dashboard.closedCount).toBe(2);
    expect(dashboard.winRate).toBe(50);
    expect(dashboard.stopLossRate).toBe(50);
    expect(dashboard.partialTakeUsageRate).toBe(50);
    expect(dashboard.weekly.length).toBeGreaterThan(0);
    expect(dashboard.monthly[0]?.key).toBe("2026-04");
    expect(dashboard.equityCurve.length).toBe(2);
    expect(dashboard.equityCurve.at(-1)?.cumulativePnl).toBe(dashboard.realizedPnlTotal);
    expect(dashboard.strategyTags.find((tag) => tag.key === "risk_control")?.count).toBe(1);
    expect(dashboard.strategyTags.find((tag) => tag.key === "scale_out")?.count).toBe(1);
    expect(dashboard.exitReasons.find((reason) => reason.key === "stop_loss")?.count).toBe(1);
    expect(dashboard.exitReasons.find((reason) => reason.key === "exit_full")?.realizedPnl).toBeGreaterThan(0);
  });

  it("groups repeated close review notes into rule candidates", () => {
    const closeReviews: Record<string, PortfolioCloseReviewEntry> = {
      "005930:1": {
        positionKey: "005930:1",
        ticker: "005930",
        closedAt: "2026-04-01T06:00:00.000Z",
        strengthsNote: "계획대로 첫 진입\n- 부분 익절을 지켰다",
        watchoutsNote: "추격 진입을 하지 않았다",
        nextRuleNote: "보류 상태에서는 당일 진입하지 않기",
        updatedAt: "2026-04-01T07:00:00.000Z",
        updatedBy: "tester@example.com"
      },
      "000660:1": {
        positionKey: "000660:1",
        ticker: "000660",
        closedAt: "2026-04-03T06:00:00.000Z",
        strengthsNote: "계획대로 첫 진입",
        watchoutsNote: "확인 가격 실패를 무시했다",
        nextRuleNote: "보류 상태에서는 당일 진입하지 않기",
        updatedAt: "2026-04-03T07:00:00.000Z",
        updatedBy: "tester@example.com"
      }
    };

    const dashboard = buildPortfolioCloseReviewRuleDashboard(closeReviews);

    expect(dashboard.reviewedCount).toBe(2);
    expect(dashboard.candidateCount).toBeGreaterThanOrEqual(4);
    expect(dashboard.candidates[0]).toMatchObject({
      category: "next_rule",
      text: "보류 상태에서는 당일 진입하지 않기",
      count: 2
    });
    expect(dashboard.candidates.find((candidate) => candidate.text === "계획대로 첫 진입")).toMatchObject({
      category: "strengths",
      count: 2
    });
  });

  it("filters closed groups by recent day windows", () => {
    const groups = groupPortfolioJournalByTicker([
      createEvent({
        ticker: "005930",
        company: "삼성전자",
        type: "exit_full",
        quantity: 5,
        price: 71000,
        tradedAt: "2026-03-28T09:00:00+09:00"
      }),
      createEvent({
        ticker: "005930",
        company: "삼성전자",
        type: "buy",
        quantity: 5,
        price: 70000,
        tradedAt: "2026-03-20T09:00:00+09:00"
      }),
      createEvent({
        ticker: "000660",
        company: "SK하이닉스",
        type: "exit_full",
        quantity: 5,
        price: 135000,
        tradedAt: "2025-12-01T09:00:00+09:00"
      }),
      createEvent({
        ticker: "000660",
        company: "SK하이닉스",
        type: "buy",
        quantity: 5,
        price: 120000,
        tradedAt: "2025-11-20T09:00:00+09:00"
      })
    ]);

    const filtered30 = filterPortfolioGroupsByDays(groups, 30, new Date("2026-04-02T00:00:00+09:00"));
    const filtered90 = filterPortfolioGroupsByDays(groups, 90, new Date("2026-04-02T00:00:00+09:00"));
    const filteredAll = filterPortfolioGroupsByDays(groups, "all", new Date("2026-04-02T00:00:00+09:00"));

    expect(filtered30).toHaveLength(1);
    expect(filtered90).toHaveLength(1);
    expect(filteredAll).toHaveLength(2);
  });

  it("matches user opening checks to closed trades and summarizes quality", () => {
    const groups = groupPortfolioJournalByTicker([
      createEvent({
        ticker: "005930",
        company: "?쇱꽦?꾩옄",
        type: "stop_loss",
        quantity: 5,
        price: 64000,
        tradedAt: "2026-04-03T09:00:00+09:00"
      }),
      createEvent({
        ticker: "005930",
        company: "?쇱꽦?꾩옄",
        type: "buy",
        quantity: 5,
        price: 70000,
        tradedAt: "2026-03-31T09:00:00+09:00"
      }),
      createEvent({
        ticker: "000660",
        company: "SK?섏씠?됱뒪",
        type: "exit_full",
        quantity: 5,
        price: 135000,
        tradedAt: "2026-04-07T09:00:00+09:00"
      }),
      createEvent({
        ticker: "000660",
        company: "SK?섏씠?됱뒪",
        type: "buy",
        quantity: 5,
        price: 120000,
        tradedAt: "2026-03-31T09:00:00+09:00"
      })
    ]);

    const analytics = buildPortfolioOpeningCheckAnalytics(groups, [
      {
        scanKey: "2026-03-31T08:30:00+09:00",
        updatedAt: "2026-03-31T09:06:00+09:00",
        items: {
          "005930": {
            ticker: "005930",
            status: "avoid",
            updatedAt: "2026-03-31T09:06:00+09:00",
            checklist: { gap: "overheated", confirmation: "mixed", action: "hold" }
          },
          "000660": {
            ticker: "000660",
            status: "passed",
            updatedAt: "2026-03-31T09:07:00+09:00",
            checklist: { gap: "normal", confirmation: "confirmed", action: "review" }
          }
        }
      }
    ]);

    expect(analytics?.matchedCount).toBe(2);
    expect(analytics?.overrideCount).toBe(1);
    expect(analytics?.profitableCount).toBe(1);
    expect(analytics?.lossCount).toBe(1);
    expect(analytics?.statusInsights.find((item) => item.status === "passed")?.winRate).toBe(100);
    expect(analytics?.statusInsights.find((item) => item.status === "avoid")?.lossCount).toBe(1);
    expect(analytics?.patterns[0]?.count).toBeGreaterThan(0);
    expect(analytics?.behaviorImpacts.find((item) => item.key === "override")?.count).toBe(1);
    expect(analytics?.behaviorImpacts.find((item) => item.key === "override")?.realizedPnl).toBeLessThan(0);
    expect(analytics?.behaviorImpacts.find((item) => item.key === "passed")?.winRate).toBe(100);
  });
});
