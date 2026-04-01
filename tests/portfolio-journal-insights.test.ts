import { describe, expect, it } from "vitest";

import {
  buildPortfolioCloseReview,
  buildPortfolioReviewAnalytics,
  buildPortfolioReviewCalendarDashboard,
  buildPortfolioReviewSummary,
  calculatePortfolioJournalGroupMetrics,
  groupPortfolioJournalByTicker,
  isClosingPortfolioTradeEventType
} from "@/lib/portfolio/journal-insights";
import type { PortfolioTradeEvent } from "@/types/recommendation";

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
});
