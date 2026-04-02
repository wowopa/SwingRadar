import type { RecommendationTradePlanDto } from "@/lib/api-contracts/swing-radar";

import type { PortfolioTradeEventDialogPreset } from "@/components/portfolio/portfolio-trade-event-dialog";
import type { PortfolioTradeEventType } from "@/types/recommendation";

type PriceOption = {
  label: string;
  value: number;
};

type BuildTradePresetInput = {
  ticker: string;
  company: string;
  sector: string;
  type: PortfolioTradeEventType;
  quantity: number;
  currentPrice?: number | null;
  averagePrice?: number | null;
  tradePlan?: RecommendationTradePlanDto | null;
};

function pushPriceOption(items: PriceOption[], label: string, value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return;
  }

  if (items.some((item) => Math.abs(item.value - value) < 0.0001)) {
    return;
  }

  items.push({ label, value });
}

function buildPriceOptions({
  currentPrice,
  averagePrice,
  tradePlan
}: {
  currentPrice?: number | null;
  averagePrice?: number | null;
  tradePlan?: RecommendationTradePlanDto | null;
}) {
  const items: PriceOption[] = [];
  pushPriceOption(items, "현재가", currentPrice);
  pushPriceOption(items, "평단", averagePrice);
  pushPriceOption(items, "손절가", tradePlan?.stopPrice);
  pushPriceOption(items, "1차 목표", tradePlan?.targetPrice);
  return items;
}

function buildNoteTemplates(type: PortfolioTradeEventType) {
  switch (type) {
    case "add":
      return ["눌림 확인 후 추가 매수", "장초 확인 통과 후 추가", "평단 보강 목적 추가"];
    case "take_profit_partial":
      return ["1차 목표 도달 후 부분 익절", "이익 일부 확보", "반응 둔화로 일부 정리"];
    case "stop_loss":
      return ["손절 기준 이탈", "확인 가격 실패 후 손절", "보호 가격 이탈"];
    case "exit_full":
      return ["목표 구간 도달 후 전량 정리", "보유 계획 종료", "수동 전량 정리"];
    case "manual_exit":
      return ["장중 수동 정리", "계획 재검토 후 종료", "보유 우선순위 재배치"];
    default:
      return ["장초 확인 통과 후 첫 진입", "계획 진입 구간 진입", "시그널 확인 후 매수"];
  }
}

export function buildPortfolioTradeDialogPreset({
  ticker,
  company,
  sector,
  type,
  quantity,
  currentPrice,
  averagePrice,
  tradePlan
}: BuildTradePresetInput): PortfolioTradeEventDialogPreset {
  const priceOptions = buildPriceOptions({ currentPrice, averagePrice, tradePlan });
  const noteTemplates = buildNoteTemplates(type);
  const fallbackPrice =
    typeof currentPrice === "number" && Number.isFinite(currentPrice) && currentPrice > 0
      ? currentPrice
      : typeof averagePrice === "number" && Number.isFinite(averagePrice) && averagePrice > 0
        ? averagePrice
        : undefined;

  if (type === "take_profit_partial") {
    return {
      title: `${company} 부분 익절`,
      description: "부분 익절 체결을 빠르게 남기고 보유 수량과 가용 현금을 같이 갱신합니다.",
      saveButtonLabel: "부분 익절 저장",
      ticker,
      company,
      sector,
      type,
      quantity: quantity > 1 ? Math.max(1, Math.ceil(quantity / 2)) : quantity,
      price: fallbackPrice,
      note: "부분 익절 빠른 기록",
      noteTemplates,
      priceOptions,
      syncProfilePosition: true,
      maxQuantity: quantity,
      lockTicker: true,
      lockType: true
    };
  }

  if (type === "stop_loss") {
    return {
      title: `${company} 손절`,
      description: "손절 체결을 빠르게 남기고 남은 보유 수량과 가용 현금을 즉시 맞춥니다.",
      saveButtonLabel: "손절 저장",
      ticker,
      company,
      sector,
      type,
      quantity,
      price: tradePlan?.stopPrice ?? fallbackPrice,
      note: "손절 빠른 기록",
      noteTemplates,
      priceOptions,
      syncProfilePosition: true,
      maxQuantity: quantity,
      lockTicker: true,
      lockType: true
    };
  }

  if (type === "exit_full" || type === "manual_exit") {
    return {
      title: `${company} 전량 매도`,
      description: "전량 종료 체결을 빠르게 남기고 보유 종목에서 바로 반영합니다.",
      saveButtonLabel: "전량 매도 저장",
      ticker,
      company,
      sector,
      type,
      quantity,
      price: tradePlan?.targetPrice ?? fallbackPrice,
      note: "전량 매도 빠른 기록",
      noteTemplates,
      priceOptions,
      syncProfilePosition: true,
      maxQuantity: quantity,
      lockTicker: true,
      lockType: true
    };
  }

  return {
    title: `${company} 추가 매수`,
    description: "추가 매수를 바로 기록하고 평단과 보유 수량을 함께 갱신합니다.",
    saveButtonLabel: "추가 매수 저장",
    ticker,
    company,
    sector,
    type,
    price: fallbackPrice,
    note: "추가 매수 빠른 기록",
    noteTemplates,
    priceOptions,
    syncProfilePosition: true,
    maxQuantity: quantity,
    lockTicker: true,
    lockType: true
  };
}
