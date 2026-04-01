import type { RecommendationTradePlanDto } from "@/lib/api-contracts/swing-radar";
import type { PortfolioJournalGroup } from "@/lib/portfolio/journal-insights";
import { isClosingPortfolioTradeEventType } from "@/lib/portfolio/journal-insights";
import { formatPrice } from "@/lib/utils";
import type { PortfolioTradeEvent, PortfolioTradeEventType } from "@/types/recommendation";

type ComparableTradePlan = Pick<
  RecommendationTradePlanDto,
  "entryPriceLow" | "entryPriceHigh" | "confirmationPrice" | "stopPrice" | "targetPrice" | "holdWindowLabel" | "entryLabel"
>;

export interface PositionPlanComparisonItem {
  key: "entry" | "risk" | "target";
  label: string;
  planned: string;
  actual: string;
  statusLabel: string;
  tone: "positive" | "neutral" | "caution" | "secondary";
  note: string;
}

export interface PositionPlanComparison {
  headline: string;
  summary: string;
  items: PositionPlanComparisonItem[];
}

function formatEntryRange(tradePlan?: ComparableTradePlan | null) {
  if (!tradePlan) {
    return "계획 대기";
  }

  if (typeof tradePlan.entryPriceLow === "number" && typeof tradePlan.entryPriceHigh === "number") {
    return `${formatPrice(tradePlan.entryPriceLow)} ~ ${formatPrice(tradePlan.entryPriceHigh)}`;
  }

  if (typeof tradePlan.confirmationPrice === "number") {
    return `${formatPrice(tradePlan.confirmationPrice)} 확인`;
  }

  if (typeof tradePlan.entryPriceLow === "number") {
    return formatPrice(tradePlan.entryPriceLow);
  }

  return tradePlan.entryLabel ?? "계획 대기";
}

function findAscendingEntryEvent(events: PortfolioTradeEvent[]) {
  return [...events]
    .sort((left, right) => new Date(left.tradedAt).getTime() - new Date(right.tradedAt).getTime())
    .find((event) => event.type === "buy" || event.type === "add");
}

export function getPortfolioEntryEvent(group?: PortfolioJournalGroup | null) {
  return group ? findAscendingEntryEvent(group.events) ?? null : null;
}

export function getPortfolioLatestClosingEvent(group?: PortfolioJournalGroup | null) {
  if (!group) {
    return null;
  }

  return group.events.find((event) => isClosingPortfolioTradeEventType(event.type)) ?? null;
}

function isWithinRange(value: number, low?: number | null, high?: number | null) {
  if (typeof low === "number" && value < low) {
    return false;
  }

  if (typeof high === "number" && value > high) {
    return false;
  }

  return true;
}

function getEntryComparison(
  tradePlan: ComparableTradePlan | null | undefined,
  entryEvent: PortfolioTradeEvent | null,
  averagePrice?: number | null
): PositionPlanComparisonItem {
  const actualPrice = entryEvent?.price ?? averagePrice ?? null;

  if (actualPrice === null) {
    return {
      key: "entry",
      label: "진입 실행",
      planned: formatEntryRange(tradePlan),
      actual: "체결 기록 대기",
      statusLabel: "기록 대기",
      tone: "secondary",
      note: "아직 첫 진입 체결이 없어 계획과 실제를 비교할 수 없습니다."
    };
  }

  if (tradePlan && isWithinRange(actualPrice, tradePlan.entryPriceLow, tradePlan.entryPriceHigh)) {
    return {
      key: "entry",
      label: "진입 실행",
      planned: formatEntryRange(tradePlan),
      actual: formatPrice(actualPrice),
      statusLabel: "계획 범위 안",
      tone: "positive",
      note: "첫 진입 가격이 계획해 둔 범위 안에서 실행됐습니다."
    };
  }

  if (tradePlan && typeof tradePlan.entryPriceHigh === "number" && actualPrice > tradePlan.entryPriceHigh) {
    return {
      key: "entry",
      label: "진입 실행",
      planned: formatEntryRange(tradePlan),
      actual: formatPrice(actualPrice),
      statusLabel: "계획보다 위",
      tone: "caution",
      note: "계획 상단보다 높은 가격에 들어가 추격 진입 성격이 생겼을 수 있습니다."
    };
  }

  if (tradePlan && typeof tradePlan.entryPriceLow === "number" && actualPrice < tradePlan.entryPriceLow) {
    return {
      key: "entry",
      label: "진입 실행",
      planned: formatEntryRange(tradePlan),
      actual: formatPrice(actualPrice),
      statusLabel: "계획보다 아래",
      tone: "neutral",
      note: "낮은 가격에 진입해 리스크는 줄었지만 계획과 다른 반응일 수 있어 복기가 필요합니다."
    };
  }

  return {
    key: "entry",
    label: "진입 실행",
    planned: formatEntryRange(tradePlan),
    actual: formatPrice(actualPrice),
    statusLabel: "참고 비교",
    tone: "secondary",
    note: "계획 가격과 체결 가격을 함께 보며 이후 진입 규칙을 다듬는 참고 자료입니다."
  };
}

function getRiskComparison(
  tradePlan: ComparableTradePlan | null | undefined,
  latestClosingEvent: PortfolioTradeEvent | null,
  currentPrice?: number | null
): PositionPlanComparisonItem {
  if (typeof tradePlan?.stopPrice !== "number") {
    return {
      key: "risk",
      label: "손절 기준",
      planned: "미설정",
      actual: currentPrice ? `현재가 ${formatPrice(currentPrice)}` : "기록 대기",
      statusLabel: "기준 없음",
      tone: "secondary",
      note: "손절 기준이 없으면 포지션 복기와 비중 조절 기준이 흐려질 수 있습니다."
    };
  }

  if (latestClosingEvent?.type === "stop_loss") {
    return {
      key: "risk",
      label: "손절 기준",
      planned: formatPrice(tradePlan.stopPrice),
      actual: `${formatPrice(latestClosingEvent.price)} 손절`,
      statusLabel: "손절 실행",
      tone: "positive",
      note: "손절 기준을 실제 종료에 반영했습니다."
    };
  }

  if (typeof currentPrice === "number" && currentPrice < tradePlan.stopPrice) {
    return {
      key: "risk",
      label: "손절 기준",
      planned: formatPrice(tradePlan.stopPrice),
      actual: `현재가 ${formatPrice(currentPrice)}`,
      statusLabel: "기준 하회",
      tone: "caution",
      note: "현재 가격이 손절 기준 아래에 있어 즉시 점검이 필요합니다."
    };
  }

  return {
    key: "risk",
    label: "손절 기준",
    planned: formatPrice(tradePlan.stopPrice),
    actual: currentPrice ? `현재가 ${formatPrice(currentPrice)}` : "보유 유지",
    statusLabel: "기준 위",
    tone: "positive",
    note: "현재 가격이 아직 손절 기준 위에 있습니다."
  };
}

function didHitTarget(
  targetPrice: number,
  events: PortfolioTradeEvent[],
  latestClosingEvent: PortfolioTradeEvent | null,
  currentPrice?: number | null
) {
  const profitEvent = events.find((event) => {
    const isExit =
      event.type === "take_profit_partial" ||
      event.type === "exit_full" ||
      event.type === "manual_exit" ||
      event.type === "stop_loss";
    return isExit && event.price >= targetPrice;
  });

  if (profitEvent) {
    return profitEvent;
  }

  if (latestClosingEvent && latestClosingEvent.price >= targetPrice) {
    return latestClosingEvent;
  }

  if (typeof currentPrice === "number" && currentPrice >= targetPrice) {
    return { type: "current" as const, price: currentPrice };
  }

  return null;
}

function getTargetComparison(
  tradePlan: ComparableTradePlan | null | undefined,
  group: PortfolioJournalGroup | null | undefined,
  latestClosingEvent: PortfolioTradeEvent | null,
  currentPrice?: number | null
): PositionPlanComparisonItem {
  if (typeof tradePlan?.targetPrice !== "number") {
    return {
      key: "target",
      label: "1차 목표",
      planned: "미설정",
      actual: "추적 대기",
      statusLabel: "기준 없음",
      tone: "secondary",
      note: "부분 익절이나 목표 관리 기준을 잡으려면 최소 1차 목표가가 필요합니다."
    };
  }

  const hit = didHitTarget(tradePlan.targetPrice, group?.events ?? [], latestClosingEvent, currentPrice);
  if (hit) {
    return {
      key: "target",
      label: "1차 목표",
      planned: formatPrice(tradePlan.targetPrice),
      actual: hit.type === "current" ? `현재가 ${formatPrice(hit.price)}` : formatPrice(hit.price),
      statusLabel: "목표 확인",
      tone: "positive",
      note:
        hit.type === "take_profit_partial"
          ? "부분 익절 이벤트가 목표 가격 근처에서 기록됐습니다."
          : hit.type === "current"
            ? "현재 가격이 목표 구간에 닿아 부분 익절 여부를 점검할 수 있습니다."
            : "목표 가격 이상에서 실제 청산이 이뤄졌습니다."
    };
  }

  if (latestClosingEvent && latestClosingEvent.price < tradePlan.targetPrice) {
    return {
      key: "target",
      label: "1차 목표",
      planned: formatPrice(tradePlan.targetPrice),
      actual: `${formatPrice(latestClosingEvent.price)} 종료`,
      statusLabel: "목표 전 종료",
      tone: "neutral",
      note: "목표 도달 전에 종료된 거래라 종료 사유를 다시 복기할 가치가 있습니다."
    };
  }

  return {
    key: "target",
    label: "1차 목표",
    planned: formatPrice(tradePlan.targetPrice),
    actual: currentPrice ? `현재가 ${formatPrice(currentPrice)}` : "아직 미도달",
    statusLabel: "도달 전",
    tone: "secondary",
    note: "아직 1차 목표가에 닿지 않아 추세 유지 여부를 더 지켜봐야 합니다."
  };
}

export function buildPositionPlanComparison(options: {
  tradePlan?: ComparableTradePlan | null;
  journalGroup?: PortfolioJournalGroup | null;
  averagePrice?: number | null;
  currentPrice?: number | null;
}): PositionPlanComparison {
  const entryEvent = getPortfolioEntryEvent(options.journalGroup);
  const latestClosingEvent = getPortfolioLatestClosingEvent(options.journalGroup);
  const items = [
    getEntryComparison(options.tradePlan, entryEvent, options.averagePrice),
    getRiskComparison(options.tradePlan, latestClosingEvent, options.currentPrice),
    getTargetComparison(options.tradePlan, options.journalGroup, latestClosingEvent, options.currentPrice)
  ];

  const cautionCount = items.filter((item) => item.tone === "caution").length;
  const positiveCount = items.filter((item) => item.tone === "positive").length;

  if (cautionCount > 0) {
    return {
      headline: "계획 대비 다시 볼 지점이 있습니다.",
      summary: "진입 가격이나 손절 위치처럼 실제 실행이 계획과 어긋난 항목을 먼저 점검해 보세요.",
      items
    };
  }

  if (positiveCount >= 2) {
    return {
      headline: "계획과 실제 흐름이 비교적 잘 맞고 있습니다.",
      summary: "진입, 손절, 목표가 기준 중 핵심 항목이 계획과 크게 벗어나지 않았습니다.",
      items
    };
  }

  return {
    headline: "계획 대비 실제를 계속 기록해 두면 복기가 쉬워집니다.",
    summary: "아직 비교 정보가 충분하지 않거나 일부만 확인된 상태입니다.",
    items
  };
}

export function getPortfolioEventLabel(type: PortfolioTradeEventType) {
  switch (type) {
    case "buy":
      return "첫 매수";
    case "add":
      return "추가 매수";
    case "take_profit_partial":
      return "부분 익절";
    case "exit_full":
      return "전량 매도";
    case "stop_loss":
      return "손절";
    case "manual_exit":
      return "수동 종료";
    default:
      return "체결";
  }
}
