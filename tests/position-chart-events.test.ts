import { describe, expect, it } from "vitest";

import { buildPositionChartEventDisplays, getPositionChartEventMeta } from "@/lib/portfolio/position-chart-events";
import type { PortfolioJournalGroup } from "@/lib/portfolio/journal-insights";
import type { PortfolioTradeEvent } from "@/types/recommendation";

function createEvent(overrides: Partial<PortfolioTradeEvent>): PortfolioTradeEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    ticker: overrides.ticker ?? "005930",
    company: overrides.company ?? "Samsung Electronics",
    sector: overrides.sector ?? "Semiconductor",
    type: overrides.type ?? "buy",
    quantity: overrides.quantity ?? 1,
    price: overrides.price ?? 70000,
    fees: overrides.fees ?? 0,
    tradedAt: overrides.tradedAt ?? "2026-04-01T09:00:00+09:00",
    note: overrides.note,
    createdAt: overrides.createdAt ?? "2026-04-01T09:00:00+09:00",
    createdBy: overrides.createdBy ?? "tester@example.com"
  };
}

function createGroup(events: PortfolioTradeEvent[]): PortfolioJournalGroup {
  return {
    ticker: "005930",
    company: "Samsung Electronics",
    sector: "Semiconductor",
    events,
    latestEvent: events[0],
    firstEntryAt: events.at(-1)?.tradedAt ?? "2026-04-01T09:00:00+09:00",
    holdingDays: 4,
    partialExitCount: events.filter((event) => event.type === "take_profit_partial").length,
    metrics: {
      remainingQuantity: 1,
      investedCapital: 70000,
      averageCost: 70000,
      realizedPnl: 0
    }
  };
}

describe("position chart events", () => {
  it("maps each trade event type to a distinct chart marker meta", () => {
    expect(getPositionChartEventMeta("buy")).toMatchObject({ shortLabel: "IN", tone: "buy", placement: "below" });
    expect(getPositionChartEventMeta("add")).toMatchObject({ shortLabel: "ADD", tone: "add", placement: "below" });
    expect(getPositionChartEventMeta("take_profit_partial")).toMatchObject({
      shortLabel: "TP",
      tone: "take",
      placement: "above"
    });
    expect(getPositionChartEventMeta("exit_full")).toMatchObject({ shortLabel: "OUT", tone: "exit", placement: "above" });
    expect(getPositionChartEventMeta("stop_loss")).toMatchObject({ shortLabel: "SL", tone: "stop", placement: "above" });
    expect(getPositionChartEventMeta("manual_exit")).toMatchObject({
      shortLabel: "MAN",
      tone: "manual",
      placement: "above"
    });
  });

  it("sorts visible chart events chronologically and filters out hidden dates", () => {
    const group = createGroup([
      createEvent({ type: "manual_exit", price: 73500, quantity: 2, tradedAt: "2026-04-04T09:20:00+09:00" }),
      createEvent({ type: "take_profit_partial", price: 73200, quantity: 1, tradedAt: "2026-04-03T09:10:00+09:00" }),
      createEvent({ type: "add", price: 71000, quantity: 1, tradedAt: "2026-04-02T09:05:00+09:00" }),
      createEvent({ type: "buy", price: 70000, quantity: 2, tradedAt: "2026-04-01T09:00:00+09:00" }),
      createEvent({ type: "stop_loss", price: 68000, quantity: 1, tradedAt: "2026-03-25T09:00:00+09:00" })
    ]);

    const displays = buildPositionChartEventDisplays(
      group,
      new Set(["2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04"])
    );

    expect(displays).toHaveLength(4);
    expect(displays.map((item) => item.shortLabel)).toEqual(["IN", "ADD", "TP", "MAN"]);
    expect(displays.map((item) => item.placement)).toEqual(["below", "below", "above", "above"]);
    expect(displays.map((item) => item.sequence)).toEqual([1, 2, 3, 4]);
    expect(displays.map((item) => item.dateLabel)).toEqual(["04.01", "04.02", "04.03", "04.04"]);
  });
});
