import { formatPercent, formatPrice } from "@/lib/utils";
import type {
  HoldingActionBoard,
  HoldingActionItem,
  HoldingActionStatus,
  RecommendationTradePlan,
  SignalTone
} from "@/types/recommendation";

export interface HoldingActionBoardPositionInput {
  ticker: string;
  company: string;
  sector: string;
  quantity: number;
  averagePrice: number;
  enteredAt?: string;
  note?: string;
  signalTone?: SignalTone;
  tradePlan?: RecommendationTradePlan | null;
}

const HOLDING_SECTION_META: Record<
  HoldingActionStatus,
  {
    label: string;
    description: string;
  }
> = {
  exit_review: {
    label: "즉시 점검",
    description: "손절 기준을 이미 건드렸거나 구조가 약해져서 우선 확인해야 하는 보유입니다."
  },
  take_profit: {
    label: "부분 익절 검토",
    description: "1차 목표가 또는 충분한 수익 구간에 들어와 일부 이익을 챙길 수 있는 보유입니다."
  },
  tighten_stop: {
    label: "보호 가격 상향",
    description: "수익권이 확보돼 기존 손절보다 더 촘촘하게 관리할 수 있는 보유입니다."
  },
  time_stop_review: {
    label: "시간 손절 검토",
    description: "보유 기간 대비 확장이 약해 시간을 더 쓰기보다 재판정이 필요한 보유입니다."
  },
  hold: {
    label: "계획 유지",
    description: "아직은 기존 진입 계획과 손절 기준을 유지하며 관리할 보유입니다."
  }
};

const HOLDING_SECTION_ORDER: HoldingActionStatus[] = [
  "exit_review",
  "take_profit",
  "tighten_stop",
  "time_stop_review",
  "hold"
];

const TAKE_PROFIT_RETURN_THRESHOLD = 8;
const TIGHTEN_STOP_RETURN_THRESHOLD = 4;
const TIME_STOP_REVIEW_DAYS = 7;
const TIME_STOP_MIN_RETURN = 1.5;

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function resolveHoldingDays(enteredAt: string | undefined, generatedAt: string) {
  if (!enteredAt) {
    return undefined;
  }

  const enteredDate = new Date(`${enteredAt}T00:00:00+09:00`);
  const snapshotDate = new Date(generatedAt);
  if (Number.isNaN(enteredDate.getTime()) || Number.isNaN(snapshotDate.getTime())) {
    return undefined;
  }

  const diffMs = snapshotDate.getTime() - enteredDate.getTime();
  return diffMs >= 0 ? Math.floor(diffMs / 86_400_000) + 1 : undefined;
}

function resolveTradePlanPrice(tradePlan?: RecommendationTradePlan | null) {
  if (!tradePlan) {
    return null;
  }

  return tradePlan.currentPrice ?? null;
}

function resolveActionStatus({
  currentReturnPercent,
  currentPrice,
  stopPrice,
  targetPrice,
  holdingDays
}: {
  currentReturnPercent: number | null;
  currentPrice: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  holdingDays?: number;
}): HoldingActionStatus {
  if (currentPrice !== null && stopPrice !== null && currentPrice <= stopPrice) {
    return "exit_review";
  }

  if (
    (currentPrice !== null && targetPrice !== null && currentPrice >= targetPrice) ||
    (currentReturnPercent !== null && currentReturnPercent >= TAKE_PROFIT_RETURN_THRESHOLD)
  ) {
    return "take_profit";
  }

  if (
    typeof holdingDays === "number" &&
    holdingDays >= TIME_STOP_REVIEW_DAYS &&
    (currentReturnPercent === null || currentReturnPercent <= TIME_STOP_MIN_RETURN)
  ) {
    return "time_stop_review";
  }

  if (currentReturnPercent !== null && currentReturnPercent >= TIGHTEN_STOP_RETURN_THRESHOLD) {
    return "tighten_stop";
  }

  return "hold";
}

function buildActionCopy({
  status,
  company,
  currentReturnPercent,
  holdingDays,
  averagePrice,
  stopPrice,
  targetPrice,
  tradePlan
}: {
  status: HoldingActionStatus;
  company: string;
  currentReturnPercent: number | null;
  holdingDays?: number;
  averagePrice: number;
  stopPrice: number | null;
  targetPrice: number | null;
  tradePlan?: RecommendationTradePlan | null;
}) {
  const returnLabel = currentReturnPercent === null ? "수익률 확인 필요" : formatPercent(currentReturnPercent);
  const holdWindowLabel = tradePlan?.holdWindowLabel ?? "5~10거래일";
  const protectiveStop = stopPrice !== null ? Math.max(stopPrice, averagePrice) : averagePrice;

  switch (status) {
    case "exit_review":
      return {
        actionLabel: "손절/이탈 점검",
        actionSummary: `${company}는 현재가가 손절 기준에 닿았거나 이미 하회한 상태입니다.`,
        actionReason:
          stopPrice !== null
            ? `현재가가 손절 기준 ${formatPrice(stopPrice)} 부근까지 밀려 기존 계획이 훼손됐습니다.`
            : "현재 흐름이 약해져 기존 보유 논리를 다시 확인해야 합니다.",
        nextAction: "장초 반등만 기대하기보다 손절 또는 비중 축소를 먼저 검토합니다.",
        guardLabel:
          stopPrice !== null ? `현재 손절 기준 ${formatPrice(stopPrice)}` : "기존 손절 기준 재확인"
      };
    case "take_profit":
      return {
        actionLabel: "부분 익절 검토",
        actionSummary: `${company}는 ${returnLabel} 구간으로 1차 이익을 챙길 수 있는 자리입니다.`,
        actionReason:
          targetPrice !== null
            ? `1차 목표 ${formatPrice(targetPrice)} 부근에 도달했거나 이미 넘겼습니다.`
            : `평균단가 대비 ${returnLabel} 구간이라 일부 이익을 먼저 확보할 만합니다.`,
        nextAction: "보유 수량의 일부를 정리하고 남은 물량은 더 높은 보호 가격으로 관리합니다.",
        guardLabel:
          targetPrice !== null ? `1차 목표 ${formatPrice(targetPrice)}` : `수익 구간 ${returnLabel}`
      };
    case "tighten_stop":
      return {
        actionLabel: "보호 가격 상향",
        actionSummary: `${company}는 수익권이 확보돼 손절 기준을 더 끌어올려도 되는 보유입니다.`,
        actionReason: `현재 수익률이 ${returnLabel}라 손실 전환을 막는 관리가 더 중요합니다.`,
        nextAction: `기존 손절보다 높게, 최소 ${formatPrice(protectiveStop)} 부근까지 보호 가격 상향을 검토합니다.`,
        guardLabel: `보호 가격 ${formatPrice(protectiveStop)}`
      };
    case "time_stop_review":
      return {
        actionLabel: "시간 손절 검토",
        actionSummary: `${company}는 보유 기간 대비 확장이 약해 시간을 더 쓸지 재판정이 필요합니다.`,
        actionReason: `진입 후 ${holdingDays ?? 0}일이 지났는데도 기대 수익이 ${returnLabel}에 머물러 ${holdWindowLabel} 운용 가정과 맞지 않습니다.`,
        nextAction: "구조가 다시 강해지지 않으면 비중 축소 또는 정리를 검토합니다.",
        guardLabel: `보유 ${holdingDays ?? 0}일 / 계획 ${holdWindowLabel}`
      };
    case "hold":
    default:
      return {
        actionLabel: "계획 유지",
        actionSummary: `${company}는 아직 기존 진입 계획과 손절 기준을 유지하며 볼 수 있는 보유입니다.`,
        actionReason:
          currentReturnPercent === null
            ? "현재 가격 데이터가 부족해 수익 구간 판정보다 기존 계획 유지가 우선입니다."
            : `현재 수익률 ${returnLabel}로 손절 또는 익절을 서두를 구간은 아닙니다.`,
        nextAction: "기존 손절 기준을 유지하고 1차 목표가 반응이 붙는지 계속 확인합니다.",
        guardLabel:
          stopPrice !== null
            ? `현재 손절 기준 ${formatPrice(stopPrice)}`
            : `평균단가 ${formatPrice(averagePrice)}`
      };
  }
}

export function buildHoldingActionBoard({
  positions,
  generatedAt,
  profileName
}: {
  positions: HoldingActionBoardPositionInput[];
  generatedAt: string;
  profileName?: string | null;
}): HoldingActionBoard | undefined {
  if (!positions.length) {
    return undefined;
  }

  const items = positions
    .map<HoldingActionItem>((position) => {
      const currentPrice = resolveTradePlanPrice(position.tradePlan);
      const stopPrice = position.tradePlan?.stopPrice ?? null;
      const targetPrice = position.tradePlan?.targetPrice ?? null;
      const investedCapital = Math.round(position.averagePrice * position.quantity);
      const marketValue =
        currentPrice !== null ? Math.round(currentPrice * position.quantity) : undefined;
      const unrealizedPnlAmount =
        currentPrice !== null
          ? Math.round((currentPrice - position.averagePrice) * position.quantity)
          : undefined;
      const unrealizedPnlPercent =
        currentPrice !== null && position.averagePrice > 0
          ? roundToSingleDecimal(((currentPrice - position.averagePrice) / position.averagePrice) * 100)
          : undefined;
      const holdingDays = resolveHoldingDays(position.enteredAt, generatedAt);
      const status = resolveActionStatus({
        currentReturnPercent: unrealizedPnlPercent ?? null,
        currentPrice,
        stopPrice,
        targetPrice,
        holdingDays
      });
      const copy = buildActionCopy({
        status,
        company: position.company,
        currentReturnPercent: unrealizedPnlPercent ?? null,
        holdingDays,
        averagePrice: position.averagePrice,
        stopPrice,
        targetPrice,
        tradePlan: position.tradePlan
      });

      return {
        ticker: position.ticker,
        company: position.company,
        sector: position.sector,
        signalTone: position.signalTone,
        quantity: position.quantity,
        averagePrice: position.averagePrice,
        currentPrice,
        investedCapital,
        marketValue,
        unrealizedPnlAmount,
        unrealizedPnlPercent,
        enteredAt: position.enteredAt,
        holdingDays,
        note: position.note,
        actionStatus: status,
        actionLabel: copy.actionLabel,
        actionSummary: copy.actionSummary,
        actionReason: copy.actionReason,
        nextAction: copy.nextAction,
        guardLabel: copy.guardLabel,
        tradePlan: position.tradePlan ?? undefined
      };
    })
    .sort((left, right) => {
      const leftPriority = HOLDING_SECTION_ORDER.indexOf(left.actionStatus);
      const rightPriority = HOLDING_SECTION_ORDER.indexOf(right.actionStatus);
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const leftPnl = left.unrealizedPnlPercent ?? Number.NEGATIVE_INFINITY;
      const rightPnl = right.unrealizedPnlPercent ?? Number.NEGATIVE_INFINITY;
      if (left.actionStatus === "exit_review") {
        return leftPnl - rightPnl;
      }

      if (left.actionStatus === "take_profit" || left.actionStatus === "tighten_stop") {
        return rightPnl - leftPnl;
      }

      return left.company.localeCompare(right.company, "ko");
    });

  const sections = HOLDING_SECTION_ORDER.map((status) => {
    const sectionItems = items.filter((item) => item.actionStatus === status);
    const meta = HOLDING_SECTION_META[status];

    return {
      status,
      label: meta.label,
      description: meta.description,
      count: sectionItems.length,
      items: sectionItems
    };
  });

  const holdingCount = items.length;
  const investedCapital = items.reduce((sum, item) => sum + item.investedCapital, 0);
  const marketValue = items.reduce((sum, item) => sum + (item.marketValue ?? 0), 0);
  const unrealizedPnlAmount = items.reduce((sum, item) => sum + (item.unrealizedPnlAmount ?? 0), 0);
  const unrealizedPnlPercent =
    investedCapital > 0 ? roundToSingleDecimal((unrealizedPnlAmount / investedCapital) * 100) : undefined;
  const exitReviewCount = sections.find((section) => section.status === "exit_review")?.count ?? 0;
  const takeProfitCount = sections.find((section) => section.status === "take_profit")?.count ?? 0;
  const tightenStopCount = sections.find((section) => section.status === "tighten_stop")?.count ?? 0;
  const timeStopReviewCount = sections.find((section) => section.status === "time_stop_review")?.count ?? 0;
  const holdCount = sections.find((section) => section.status === "hold")?.count ?? 0;

  let headline = `보유 관리 ${holdingCount}개`;
  let note = "각 보유 종목을 손절, 익절, 시간 손절 기준으로 다시 나눠 오늘 무엇을 관리할지 먼저 보여줍니다.";

  if (exitReviewCount > 0) {
    headline = `즉시 점검 ${exitReviewCount}개`;
    note = "손절 기준을 이미 건드린 보유가 있어 신규 진입보다 기존 포지션 점검이 먼저입니다.";
  } else if (takeProfitCount > 0) {
    headline = `부분 익절 검토 ${takeProfitCount}개`;
    note = "수익 구간에 들어온 보유가 있어 일부 이익을 챙기고 남은 물량을 관리할 타이밍입니다.";
  } else if (timeStopReviewCount > 0) {
    headline = `시간 손절 재판정 ${timeStopReviewCount}개`;
    note = "보유 기간 대비 확장이 약한 종목이 있어 시간을 더 줄지 다시 판단해야 합니다.";
  } else if (tightenStopCount > 0) {
    headline = `보호 가격 상향 ${tightenStopCount}개`;
    note = "수익권이 확보된 종목이 있어 손절 기준을 끌어올리는 관리가 중요합니다.";
  }

  return {
    summary: {
      headline,
      note,
      profileName: profileName ?? undefined,
      holdingCount,
      investedCapital,
      marketValue: marketValue > 0 ? marketValue : undefined,
      unrealizedPnlAmount: marketValue > 0 ? unrealizedPnlAmount : undefined,
      unrealizedPnlPercent,
      takeProfitCount,
      tightenStopCount,
      exitReviewCount,
      timeStopReviewCount,
      holdCount
    },
    sections,
    items
  };
}
