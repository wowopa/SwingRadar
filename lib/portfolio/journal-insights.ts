import type { PortfolioTradeEvent, PortfolioTradeEventType } from "@/types/recommendation";

export const closingPortfolioTradeEventTypes = new Set<PortfolioTradeEventType>([
  "exit_full",
  "stop_loss",
  "manual_exit"
]);

export interface PortfolioJournalGroupMetrics {
  remainingQuantity: number;
  investedCapital: number;
  averageCost: number;
  realizedPnl: number;
}

export interface PortfolioJournalGroup {
  ticker: string;
  company: string;
  sector: string;
  events: PortfolioTradeEvent[];
  latestEvent: PortfolioTradeEvent;
  firstEntryAt: string;
  holdingDays: number;
  partialExitCount: number;
  metrics: PortfolioJournalGroupMetrics;
}

export interface PortfolioCloseReview {
  headline: string;
  summary: string;
  strengths: string[];
  watchouts: string[];
}

export function isClosingPortfolioTradeEventType(type: PortfolioTradeEventType) {
  return closingPortfolioTradeEventTypes.has(type);
}

function diffHoldingDays(firstEntryAt: string, latestEventAt: string) {
  const firstDate = new Date(firstEntryAt);
  const latestDate = new Date(latestEventAt);

  if (Number.isNaN(firstDate.getTime()) || Number.isNaN(latestDate.getTime())) {
    return 0;
  }

  const diff = latestDate.getTime() - firstDate.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000)) + 1;
}

export function calculatePortfolioJournalGroupMetrics(events: PortfolioTradeEvent[]): PortfolioJournalGroupMetrics {
  let remainingQuantity = 0;
  let investedCapital = 0;
  let realizedPnl = 0;

  const ascendingEvents = [...events].sort((left, right) => {
    return new Date(left.tradedAt).getTime() - new Date(right.tradedAt).getTime();
  });

  for (const event of ascendingEvents) {
    const amount = event.price * event.quantity;
    const fees = event.fees ?? 0;

    if (event.type === "buy" || event.type === "add") {
      remainingQuantity += event.quantity;
      investedCapital += amount + fees;
      continue;
    }

    const averageCost = remainingQuantity > 0 ? investedCapital / remainingQuantity : 0;
    const reducingQuantity = Math.min(remainingQuantity, event.quantity);
    const costBasis = averageCost * reducingQuantity;

    realizedPnl += amount - fees - costBasis;
    remainingQuantity = Math.max(remainingQuantity - reducingQuantity, 0);
    investedCapital = Math.max(investedCapital - costBasis, 0);
  }

  return {
    remainingQuantity,
    investedCapital,
    averageCost: remainingQuantity > 0 ? investedCapital / remainingQuantity : 0,
    realizedPnl
  };
}

export function groupPortfolioJournalByTicker(events: PortfolioTradeEvent[]): PortfolioJournalGroup[] {
  const groups = new Map<string, PortfolioTradeEvent[]>();

  for (const event of events) {
    const current = groups.get(event.ticker) ?? [];
    current.push(event);
    groups.set(event.ticker, current);
  }

  return [...groups.entries()]
    .map(([ticker, tickerEvents]) => {
      const latestEvent = tickerEvents[0];
      const chronologicalEvents = [...tickerEvents].sort((left, right) => {
        return new Date(left.tradedAt).getTime() - new Date(right.tradedAt).getTime();
      });
      const firstEntryEvent =
        chronologicalEvents.find((event) => event.type === "buy" || event.type === "add") ?? chronologicalEvents[0];

      return {
        ticker,
        company: latestEvent?.company ?? ticker,
        sector: latestEvent?.sector ?? "미분류",
        events: tickerEvents,
        latestEvent,
        firstEntryAt: firstEntryEvent?.tradedAt ?? latestEvent?.tradedAt ?? new Date(0).toISOString(),
        holdingDays: diffHoldingDays(
          firstEntryEvent?.tradedAt ?? latestEvent?.tradedAt ?? new Date(0).toISOString(),
          latestEvent?.tradedAt ?? new Date(0).toISOString()
        ),
        partialExitCount: tickerEvents.filter((event) => event.type === "take_profit_partial").length,
        metrics: calculatePortfolioJournalGroupMetrics(tickerEvents)
      };
    })
    .sort((left, right) => {
      return new Date(right.latestEvent.tradedAt).getTime() - new Date(left.latestEvent.tradedAt).getTime();
    });
}

export function getPortfolioJournalSummary(events: PortfolioTradeEvent[]) {
  const groups = groupPortfolioJournalByTicker(events);
  let activeCount = 0;
  let closedCount = 0;

  for (const group of groups) {
    if (isClosingPortfolioTradeEventType(group.latestEvent.type)) {
      closedCount += 1;
    } else {
      activeCount += 1;
    }
  }

  return {
    totalEvents: events.length,
    activeCount,
    closedCount,
    partialExitCount: events.filter((event) => event.type === "take_profit_partial").length,
    stopLossCount: events.filter((event) => event.type === "stop_loss").length
  };
}

export function findPortfolioJournalGroup(events: PortfolioTradeEvent[], ticker: string) {
  return groupPortfolioJournalByTicker(events).find((group) => group.ticker === ticker) ?? null;
}

export function buildPortfolioCloseReview(group: PortfolioJournalGroup): PortfolioCloseReview {
  const latestType = group.latestEvent.type;
  const strengths: string[] = [];
  const watchouts: string[] = [];

  if (group.partialExitCount > 0) {
    strengths.push("부분 익절 기록이 있어 수익 일부를 먼저 잠근 흐름을 확인할 수 있습니다.");
  }

  if (group.metrics.realizedPnl > 0) {
    strengths.push("실현 손익이 플러스 구간으로 마감됐습니다.");
  }

  if (latestType === "stop_loss") {
    watchouts.push("손절로 종료된 거래입니다. 진입 시점과 손절 거리 설정이 적절했는지 다시 점검해 보세요.");
  }

  if (latestType === "manual_exit") {
    watchouts.push("수동 종료로 마감했습니다. 계획과 달리 중간에 판단이 바뀐 이유를 남겨두면 다음 회고가 쉬워집니다.");
  }

  if (group.holdingDays >= 8 && latestType !== "exit_full") {
    watchouts.push("보유 기간이 길어진 편입니다. 시간 손절이나 교체 규칙을 함께 점검하는 편이 좋습니다.");
  }

  if (group.partialExitCount === 0 && group.metrics.realizedPnl > 0) {
    strengths.push("한 번에 마감한 거래입니다. 이후엔 부분 익절 규칙과 비교해 어떤 쪽이 더 안정적인지 확인해 볼 수 있습니다.");
  }

  let headline = "현재 진행 중인 포지션입니다.";
  let summary = "아직 종료되지 않은 포지션이라 종료 회고 대신 현재까지의 체결 흐름을 요약합니다.";

  if (latestType === "stop_loss") {
    headline = "손절로 종료된 거래입니다.";
    summary = "계획이 틀렸을 때 손실을 확정한 거래입니다. 다음에는 진입 타이밍과 손절 여유를 함께 비교하는 회고가 중요합니다.";
  } else if (latestType === "manual_exit") {
    headline = "수동 종료로 마감한 거래입니다.";
    summary = "규칙보다 운영 판단이 앞선 종료입니다. 어떤 이유로 계획을 바꿨는지 메모를 남겨두면 재현성이 높아집니다.";
  } else if (latestType === "exit_full") {
    headline = "전량 매도로 마감한 거래입니다.";
    summary = "포지션을 끝까지 정리한 거래입니다. 부분 익절 여부와 최종 청산 타이밍을 같이 보면 패턴이 더 잘 보입니다.";
  }

  return {
    headline,
    summary,
    strengths,
    watchouts
  };
}
