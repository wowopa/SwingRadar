import { describe, expect, it } from "vitest";

import { buildPositionPlanComparison } from "@/lib/portfolio/position-detail";
import type { PortfolioJournalGroup } from "@/lib/portfolio/journal-insights";
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

function createGroup(events: PortfolioTradeEvent[]): PortfolioJournalGroup {
  return {
    ticker: "005930",
    company: "삼성전자",
    sector: "반도체",
    events,
    latestEvent: events[0],
    firstEntryAt: events.at(-1)?.tradedAt ?? "2026-03-31T09:00:00+09:00",
    holdingDays: 3,
    partialExitCount: events.filter((event) => event.type === "take_profit_partial").length,
    metrics: {
      remainingQuantity: 3,
      investedCapital: 210000,
      averageCost: 70000,
      realizedPnl: 12000
    }
  };
}

describe("position detail comparison", () => {
  it("marks entry as in-range when first buy fits the planned band", () => {
    const comparison = buildPositionPlanComparison({
      tradePlan: {
        entryPriceLow: 69000,
        entryPriceHigh: 71000,
        confirmationPrice: 70500,
        stopPrice: 67000,
        targetPrice: 75000,
        holdWindowLabel: "3~10거래일",
        entryLabel: "진입 구간"
      },
      journalGroup: createGroup([
        createEvent({ type: "take_profit_partial", price: 75200, tradedAt: "2026-04-02T09:00:00+09:00" }),
        createEvent({ type: "buy", price: 70000, tradedAt: "2026-03-31T09:00:00+09:00" })
      ]),
      averagePrice: 70000,
      currentPrice: 74800
    });

    expect(comparison.items[0].statusLabel).toBe("계획 범위 안");
    expect(comparison.items[0].tone).toBe("positive");
    expect(comparison.items[2].statusLabel).toBe("목표 확인");
  });

  it("flags caution when current price is below the stop price", () => {
    const comparison = buildPositionPlanComparison({
      tradePlan: {
        entryPriceLow: 69000,
        entryPriceHigh: 71000,
        confirmationPrice: 70500,
        stopPrice: 68000,
        targetPrice: 75000,
        holdWindowLabel: "3~10거래일",
        entryLabel: "진입 구간"
      },
      journalGroup: createGroup([createEvent({ type: "buy", price: 70500, tradedAt: "2026-03-31T09:00:00+09:00" })]),
      averagePrice: 70500,
      currentPrice: 67500
    });

    expect(comparison.items[1].statusLabel).toBe("기준 하회");
    expect(comparison.items[1].tone).toBe("caution");
    expect(comparison.headline).toContain("다시 볼 지점");
  });
});
