import { describe, expect, it } from "vitest";

import { buildTradeNoteTemplates } from "@/lib/portfolio/trade-note-templates";
import type { PortfolioTradeEvent } from "@/types/recommendation";

const events: PortfolioTradeEvent[] = [
  {
    id: "evt-1",
    ticker: "005930",
    company: "삼성전자",
    sector: "반도체",
    type: "take_profit_partial",
    quantity: 10,
    price: 81000,
    fees: 0,
    tradedAt: "2026-04-03T00:10:00.000Z",
    note: "1차 목표 도달, 부분 익절",
    createdAt: "2026-04-03T00:10:00.000Z",
    createdBy: "tester@example.com"
  },
  {
    id: "evt-2",
    ticker: "005930",
    company: "삼성전자",
    sector: "반도체",
    type: "add",
    quantity: 12,
    price: 79000,
    fees: 0,
    tradedAt: "2026-04-02T00:10:00.000Z",
    note: "눌림 확인 후 추가 매수",
    createdAt: "2026-04-02T00:10:00.000Z",
    createdBy: "tester@example.com"
  },
  {
    id: "evt-3",
    ticker: "000660",
    company: "SK하이닉스",
    sector: "반도체",
    type: "take_profit_partial",
    quantity: 5,
    price: 210000,
    fees: 0,
    tradedAt: "2026-04-01T00:10:00.000Z",
    note: "1차 목표 도달 후 30% 정리",
    createdAt: "2026-04-01T00:10:00.000Z",
    createdBy: "tester@example.com"
  }
];

describe("buildTradeNoteTemplates", () => {
  it("prioritizes same ticker and trade type notes", () => {
    const templates = buildTradeNoteTemplates(events, {
      ticker: "005930",
      type: "take_profit_partial"
    });

    expect(templates[0]).toBe("1차 목표 도달, 부분 익절");
    expect(templates).toContain("부분 익절");
    expect(templates).toContain("눌림 확인 후 추가 매수");
  });

  it("falls back to same type and recent notes when ticker is missing", () => {
    const templates = buildTradeNoteTemplates(events, {
      type: "take_profit_partial",
      limit: 4
    });

    expect(templates).toContain("1차 목표 도달, 부분 익절");
    expect(templates).toContain("부분 익절");
    expect(templates.length).toBeLessThanOrEqual(4);
  });
});
