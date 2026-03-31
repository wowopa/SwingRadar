import type { DailyCandidate } from "@/lib/repositories/daily-candidates";
import { formatPrice } from "@/lib/utils";
import type {
  OpeningRecheckDecision,
  OpeningChecklistItem,
  OperatingStage,
  Recommendation,
  RecommendationActionBucket,
  RecommendationTradePlan,
  SignalTone,
  TodayActionBoard,
  TodayActionBoardItem,
  TodayActionBoardStatus,
  TodayActionSummary,
  TodayOperatingWorkflow,
  TrackingDiagnostic
} from "@/types/recommendation";

type TrackingStage = Pick<TrackingDiagnostic, "isEntryEligible" | "isWatchEligible" | "stage">;

export type { RecommendationActionBucket };

export interface ActionSignalInput {
  signalTone: SignalTone;
  score?: number | null;
  activationScore?: number | null;
  featuredRank?: number | null;
  trackingDiagnostic?: Partial<TrackingStage> | null;
  actionBucket?: RecommendationActionBucket | null;
}

export interface RecommendationActionItem extends ActionSignalInput {
  ticker: string;
  company: string;
  score: number;
  signalLabel?: string;
  candidateScore?: number | null;
}

interface RecommendationTradePlanInput extends ActionSignalInput {
  invalidation: string;
  checkpoints: string[];
  observationWindow: string;
  riskRewardRatio?: string | null;
}

export interface ActionBucketMeta {
  label: string;
  shortLabel: string;
  description: string;
  variant: "positive" | "neutral" | "caution";
}

export type TodayOperatingSummary = TodayActionSummary;
export type DailyOperatingWorkflow = TodayOperatingWorkflow;

export interface TodayActionBoardCandidateInput {
  ticker: string;
  company: string;
  sector: string;
  signalTone: SignalTone;
  featuredRank?: number | null;
  candidateScore?: number | null;
  activationScore?: number | null;
  actionBucket?: RecommendationActionBucket | null;
  tradePlan?: RecommendationTradePlan | null;
  openingRecheck?: OpeningRecheckDecision | null;
}

export interface TodayActionBoardHoldingInput {
  ticker: string;
  company: string;
  sector: string;
}

const OPENING_RECHECK_WINDOW_LABEL = "장 시작 후 5~10분";
const MAX_ACCEPTABLE_GAP_PERCENT = 3;
const MIN_STOP_BUFFER_PERCENT = 1.5;
const MAX_SECTOR_ACTIVE_POSITIONS = 2;
const NON_MEANINGFUL_PORTFOLIO_SECTORS = new Set(["", "주권", "기타", "미분류"]);

const TODAY_ACTION_BOARD_SECTION_META: Record<
  TodayActionBoardStatus,
  {
    label: string;
    description: string;
  }
> = {
  buy_review: {
    label: "오늘 매수 검토",
    description: "장초 재판정을 통과했고 오늘 신규 매수 한도 안에 들어온 종목입니다."
  },
  watch: {
    label: "관찰 유지",
    description: "구조는 살아 있지만 오늘은 더 지켜보거나 한도 때문에 뒤로 미룬 종목입니다."
  },
  avoid: {
    label: "추격 금지",
    description: "갭상승이나 과열 등으로 오늘은 따라붙지 않는 종목입니다."
  },
  excluded: {
    label: "오늘 제외",
    description: "손절 기준 훼손 또는 구조 악화로 오늘 행동 보드에서 뺀 종목입니다."
  },
  pending: {
    label: "재판정 대기",
    description: "장초 재판정 저장 전이라 아직 실제 행동 보드에 올리지 않은 종목입니다."
  }
};

const TODAY_ACTION_BOARD_ORDER: TodayActionBoardStatus[] = ["buy_review", "watch", "avoid", "excluded", "pending"];

const ACTION_BUCKET_META: Record<RecommendationActionBucket, ActionBucketMeta> = {
  buy_now: {
    label: "장초 통과 시 매수 검토",
    shortLabel: "장초 매수 검토",
    description: "전일 기준 우선순위가 높고, 장초 재판정만 통과하면 오늘 매수까지 볼 수 있는 종목입니다.",
    variant: "positive"
  },
  watch_only: {
    label: "관찰만",
    shortLabel: "관찰만",
    description: "흐름은 좋지만 장초 재판정에서 확인 가격과 거래 반응을 더 봐야 하는 종목입니다.",
    variant: "neutral"
  },
  avoid: {
    label: "보류",
    shortLabel: "보류",
    description: "지금은 추격보다 관망이 더 나은 종목입니다.",
    variant: "caution"
  }
};

function comparePriority(left: RecommendationActionItem, right: RecommendationActionItem) {
  const leftRank = left.featuredRank ?? Number.MAX_SAFE_INTEGER;
  const rightRank = right.featuredRank ?? Number.MAX_SAFE_INTEGER;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const leftCandidate = left.candidateScore ?? Number.NEGATIVE_INFINITY;
  const rightCandidate = right.candidateScore ?? Number.NEGATIVE_INFINITY;
  if (leftCandidate !== rightCandidate) {
    return rightCandidate - leftCandidate;
  }

  if (left.score !== right.score) {
    return right.score - left.score;
  }

  return left.company.localeCompare(right.company, "ko");
}

function compareActionBoardPriority(left: TodayActionBoardCandidateInput, right: TodayActionBoardCandidateInput) {
  const leftRank = left.featuredRank ?? Number.MAX_SAFE_INTEGER;
  const rightRank = right.featuredRank ?? Number.MAX_SAFE_INTEGER;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const leftCandidate = left.candidateScore ?? Number.NEGATIVE_INFINITY;
  const rightCandidate = right.candidateScore ?? Number.NEGATIVE_INFINITY;
  if (leftCandidate !== rightCandidate) {
    return rightCandidate - leftCandidate;
  }

  const leftActivation = left.activationScore ?? Number.NEGATIVE_INFINITY;
  const rightActivation = right.activationScore ?? Number.NEGATIVE_INFINITY;
  if (leftActivation !== rightActivation) {
    return rightActivation - leftActivation;
  }

  return left.company.localeCompare(right.company, "ko");
}

function isMeaningfulPortfolioSector(sector: string) {
  return !NON_MEANINGFUL_PORTFOLIO_SECTORS.has(sector.trim());
}

function parsePriceText(value?: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/-?\d[\d,]*/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0].replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPriceLabel(value: number | null, fallback: string) {
  return value === null ? fallback : formatPrice(value);
}

function formatPriceRange(low: number | null, high: number | null, fallback: string) {
  if (low === null && high === null) {
    return fallback;
  }

  if (low !== null && high !== null) {
    return low === high ? formatPrice(low) : `${formatPrice(low)} ~ ${formatPrice(high)}`;
  }

  return formatPrice(low ?? high ?? 0);
}

function getDefaultHoldWindow(signalTone: SignalTone) {
  if (signalTone === "긍정") {
    return "5~15거래일";
  }

  if (signalTone === "중립") {
    return "3~10거래일";
  }

  return "1~7거래일";
}

function formatRiskRewardLabel(
  entryReference: number | null,
  stopPrice: number | null,
  targetPrice: number | null,
  fallback?: string | null
) {
  if (entryReference === null || stopPrice === null || targetPrice === null) {
    return fallback?.trim() ? fallback : "계산 중";
  }

  const risk = entryReference - stopPrice;
  const reward = targetPrice - entryReference;
  if (risk <= 0 || reward <= 0) {
    return fallback?.trim() ? fallback : "매력 낮음";
  }

  return `1 : ${(reward / risk).toFixed(1)}`;
}

function buildNextStep(bucket: RecommendationActionBucket, confirmationPrice: number | null, stopPrice: number | null) {
  if (bucket === "buy_now") {
    if (confirmationPrice !== null) {
      return `${OPENING_RECHECK_WINDOW_LABEL} 동안 ${formatPrice(confirmationPrice)} 돌파 또는 지지 반응을 다시 본 뒤 분할 진입을 검토합니다.`;
    }

    return `${OPENING_RECHECK_WINDOW_LABEL} 동안 확인 가격과 거래량이 함께 붙는지 먼저 보고 진입 여부를 결정합니다.`;
  }

  if (bucket === "watch_only") {
    if (confirmationPrice !== null) {
      return `${OPENING_RECHECK_WINDOW_LABEL} 안에 ${formatPrice(confirmationPrice)} 전후 반응을 볼 때까지는 관찰만 유지합니다.`;
    }

    return `${OPENING_RECHECK_WINDOW_LABEL} 안에 확인 가격과 거래 반응이 다시 살아나는지 기다립니다.`;
  }

  if (stopPrice !== null) {
    return `${formatPrice(stopPrice)} 부근 구조가 다시 정리되기 전까지는 신규 진입을 미룹니다.`;
  }

  return "지금은 새로 사기보다 보류가 더 나은 구간입니다.";
}

function buildStretchTarget(targetPrice: number | null, confirmationPrice: number | null, stopPrice: number | null) {
  if (targetPrice === null || confirmationPrice === null || stopPrice === null) {
    return null;
  }

  const extension = Math.max(targetPrice - confirmationPrice, confirmationPrice - stopPrice);
  return Math.round(targetPrice + extension);
}

function buildEntryPlan(
  bucket: RecommendationActionBucket,
  currentPrice: number | null,
  confirmationPrice: number | null
) {
  if (bucket === "buy_now") {
    const low =
      currentPrice !== null && confirmationPrice !== null
        ? Math.min(currentPrice, confirmationPrice)
        : (confirmationPrice ?? currentPrice);
    const high =
      currentPrice !== null && confirmationPrice !== null
        ? Math.max(currentPrice, confirmationPrice)
        : (confirmationPrice ?? currentPrice);

    return {
      entryPriceLow: low,
      entryPriceHigh: high,
      entryLabel: formatPriceRange(low, high, "확인 가격 전후"),
      entryReference: confirmationPrice ?? currentPrice
    };
  }

  if (bucket === "watch_only") {
    return {
      entryPriceLow: confirmationPrice,
      entryPriceHigh: confirmationPrice,
      entryLabel: confirmationPrice === null ? "확인 가격 재설정 필요" : `${formatPrice(confirmationPrice)} 돌파/지지 확인`,
      entryReference: confirmationPrice ?? currentPrice
    };
  }

  return {
    entryPriceLow: null,
    entryPriceHigh: null,
    entryLabel: "지금은 대기",
    entryReference: currentPrice ?? confirmationPrice
  };
}

export function getRecommendationActionMeta(bucket: RecommendationActionBucket) {
  return ACTION_BUCKET_META[bucket];
}

export function resolveRecommendationActionBucket(input: ActionSignalInput): RecommendationActionBucket {
  if (input.actionBucket) {
    return input.actionBucket;
  }

  if (input.trackingDiagnostic?.isEntryEligible || input.trackingDiagnostic?.stage === "진입 추적 가능") {
    return "buy_now";
  }

  if (input.trackingDiagnostic?.isWatchEligible || input.trackingDiagnostic?.stage === "자동 감시 가능") {
    return "watch_only";
  }

  if (input.signalTone === "긍정" && typeof input.activationScore === "number" && input.activationScore >= 68) {
    return "buy_now";
  }

  if (input.signalTone !== "주의" && typeof input.activationScore === "number" && input.activationScore >= 52) {
    return "watch_only";
  }

  if (input.signalTone === "긍정" && (input.featuredRank ?? Number.MAX_SAFE_INTEGER) <= 5) {
    return "watch_only";
  }

  if (input.signalTone !== "주의" && typeof input.score === "number" && input.score >= 60) {
    return "watch_only";
  }

  return "avoid";
}

export function bucketRecommendationActions(items: RecommendationActionItem[]) {
  const grouped: Record<RecommendationActionBucket, RecommendationActionItem[]> = {
    buy_now: [],
    watch_only: [],
    avoid: []
  };

  for (const item of items) {
    grouped[resolveRecommendationActionBucket(item)].push(item);
  }

  for (const bucket of Object.keys(grouped) as RecommendationActionBucket[]) {
    grouped[bucket].sort(comparePriority);
  }

  return grouped;
}

export function buildTodayOperatingSummary(items: RecommendationActionItem[]): TodayOperatingSummary {
  const grouped = bucketRecommendationActions(items);
  const bucketCounts = {
    buy_now: grouped.buy_now.length,
    watch_only: grouped.watch_only.length,
    avoid: grouped.avoid.length
  };

  if (bucketCounts.buy_now >= 2) {
    return {
      marketStance: "attack",
      marketStanceLabel: "공격 가능",
      summary: "오늘은 장초 재판정만 통과하면 매수 검토까지 볼 수 있는 종목이 몇 개 있습니다. 그래도 상위 1~2개만 선별해서 보는 날입니다.",
      maxNewPositions: 2,
      maxConcurrentPositions: 5,
      bucketCounts,
      focusNote: `장초 매수 검토 ${bucketCounts.buy_now}개, 관찰 ${bucketCounts.watch_only}개입니다. 보류 ${bucketCounts.avoid}개는 추격보다 제외에 가깝습니다.`
    };
  }

  if (bucketCounts.buy_now >= 1 || bucketCounts.watch_only >= 3) {
    return {
      marketStance: "selective",
      marketStanceLabel: "선별 매수",
      summary: "오늘은 장초 재판정을 통과한 종목 1개 정도만 신중하게 볼 만한 날입니다.",
      maxNewPositions: 1,
      maxConcurrentPositions: 4,
      bucketCounts,
      focusNote: `장초 매수 검토 ${bucketCounts.buy_now}개만 우선 검토하고, 나머지 ${bucketCounts.watch_only}개는 관찰 위주로 대응합니다.`
    };
  }

  return {
    marketStance: "watch",
    marketStanceLabel: "관찰 우위",
    summary: "오늘은 장초 재판정을 통과해도 신규 매수를 공격적으로 늘리지 않고, 기존 보유 관리와 관찰에 무게를 두는 편이 좋습니다.",
    maxNewPositions: 0,
    maxConcurrentPositions: 4,
    bucketCounts,
    focusNote: `관찰 후보 ${bucketCounts.watch_only}개가 있어도 보류 ${bucketCounts.avoid}개가 많아 추격 매수는 피하는 편이 좋습니다.`
  };
}

export function buildTodayOperatingWorkflow(summary: TodayOperatingSummary): DailyOperatingWorkflow {
  const actionDetail =
    summary.maxNewPositions > 0
      ? `장초 재판정을 통과한 종목만 최대 ${summary.maxNewPositions}개까지 분할 진입을 검토합니다. 동시 관리 종목은 총 ${summary.maxConcurrentPositions}개를 넘기지 않습니다.`
      : `오늘은 신규 매수보다 기존 보유 관리와 관찰 유지가 우선입니다. 동시 관리 종목은 총 ${summary.maxConcurrentPositions}개 기준으로 통제합니다.`;

  const steps: OperatingStage[] = [
    {
      key: "preopen_candidates",
      title: "장전 후보",
      summary: "전일 종가 기준으로 오늘 먼저 볼 종목만 좁힙니다.",
      detail: `매수 검토 ${summary.maxNewPositions}개 내외, 관찰 ${summary.bucketCounts.watch_only}개 중심으로 계획을 세웁니다. 이 단계의 종목은 아직 실제 매수 신호가 아닙니다.`
    },
    {
      key: "opening_recheck",
      title: "장초 재판정",
      summary: `${OPENING_RECHECK_WINDOW_LABEL} 동안 갭과 구조를 다시 확인합니다.`,
      detail: `시초가가 계획 진입가보다 ${MAX_ACCEPTABLE_GAP_PERCENT}% 이상 높게 뜨면 추격 금지로 돌리고, 손절 기준과 너무 가까우면 후보에서 제외합니다.`
    },
    {
      key: "today_action",
      title: "당일 행동",
      summary: "재판정 통과 종목만 실제 행동 후보로 옮깁니다.",
      detail: actionDetail
    }
  ];

  const openingChecklist: OpeningChecklistItem[] = [
    {
      key: "gap",
      title: "시초가가 계획 진입가보다 너무 높게 뜨지 않았는가",
      passLabel: `${MAX_ACCEPTABLE_GAP_PERCENT}% 이내면 재판정 계속`,
      failLabel: `${MAX_ACCEPTABLE_GAP_PERCENT}%를 넘겨 갭상승하면 추격 금지`
    },
    {
      key: "stop_buffer",
      title: "시초가와 손절 기준 사이에 최소한의 여유가 있는가",
      passLabel: `손절까지 ${MIN_STOP_BUFFER_PERCENT}% 이상 여유가 있으면 유지`,
      failLabel: "손절과 너무 가까우면 후보 제외"
    },
    {
      key: "confirmation",
      title: "장초 5~10분 안에 확인 가격과 거래 반응이 함께 붙는가",
      passLabel: "확인 가격 유지/돌파와 거래량 확인 시 매수 검토",
      failLabel: "반응이 약하면 관찰만 유지"
    },
    {
      key: "position_limit",
      title: "오늘 신규 매수 한도 안에 드는 종목인가",
      passLabel: `상위 ${Math.max(summary.maxNewPositions, 1)}개 안이면 행동 후보 유지`,
      failLabel: "한도를 넘기면 나머지는 보류"
    }
  ];

  return {
    basisLabel: "전일 종가 기준 장전 계획",
    staleDataNote: "오전 8시경 수신한 전일 데이터 기준입니다. 장초 재판정 전까지는 실제 매수 신호가 아니라 장전 계획으로 해석해야 합니다.",
    recheckWindowLabel: OPENING_RECHECK_WINDOW_LABEL,
    steps,
    openingChecklist
  };
}

export function buildTodayActionBoard(
  candidates: TodayActionBoardCandidateInput[],
  summary: Pick<TodayOperatingSummary, "maxNewPositions" | "maxConcurrentPositions">,
  portfolio?: {
    activeHoldings?: TodayActionBoardHoldingInput[];
    sectorLimit?: number;
  }
): TodayActionBoard {
  const orderedCandidates = [...candidates].sort(compareActionBoardPriority);
  const sectorLimit = portfolio?.sectorLimit ?? MAX_SECTOR_ACTIVE_POSITIONS;
  const activeHoldings = portfolio?.activeHoldings ?? [];
  const activeHoldingTickers = new Set(activeHoldings.map((holding) => holding.ticker));
  const activeSectorCounts = activeHoldings.reduce<Record<string, number>>((acc, holding) => {
    const key = holding.sector.trim();
    if (!isMeaningfulPortfolioSector(key)) {
      return acc;
    }

    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const crowdedSectors = Object.entries(activeSectorCounts)
    .filter(([, count]) => count >= sectorLimit)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0], "ko");
    })
    .map(([sector, count]) => ({ sector, count }));
  const remainingPortfolioSlots = Math.max(summary.maxConcurrentPositions - activeHoldings.length, 0);
  const buyReviewLimit = Math.max(Math.min(summary.maxNewPositions, remainingPortfolioSlots), 0);
  const eligiblePassedCandidates = orderedCandidates.filter((candidate) => {
    if (candidate.openingRecheck?.status !== "passed") {
      return false;
    }

    if (activeHoldingTickers.has(candidate.ticker)) {
      return false;
    }

    return (activeSectorCounts[candidate.sector] ?? 0) < sectorLimit;
  });
  const passedCandidates = orderedCandidates.filter((candidate) => candidate.openingRecheck?.status === "passed");
  const buyReviewTickers = new Set(eligiblePassedCandidates.slice(0, buyReviewLimit).map((candidate) => candidate.ticker));

  const items = orderedCandidates.map<TodayActionBoardItem>((candidate) => {
    const openingRecheck = candidate.openingRecheck ?? undefined;
    const rawStatus = openingRecheck?.status ?? "pending";
    const isAlreadyHeld = activeHoldingTickers.has(candidate.ticker);
    const sectorHoldings = activeSectorCounts[candidate.sector] ?? 0;
    const sectorBlocked = isMeaningfulPortfolioSector(candidate.sector) && sectorHoldings >= sectorLimit;

    let boardStatus: TodayActionBoardStatus;
    let boardReason: string;
    let portfolioNote: string | undefined;

    if (rawStatus === "passed") {
      if (isAlreadyHeld) {
        boardStatus = "watch";
        boardReason = "이미 진행중인 포지션이라 신규 매수보다 기존 포지션 관리가 우선입니다.";
        portfolioNote = "이미 보유 중";
      } else if (sectorBlocked) {
        boardStatus = "watch";
        boardReason = `현재 ${candidate.sector} 보유가 ${sectorHoldings}개라 섹터 한도 ${sectorLimit}개를 넘어 신규 매수를 열지 않습니다.`;
        portfolioNote = `섹터 한도 ${sectorLimit}개`;
      } else if (buyReviewTickers.has(candidate.ticker) && buyReviewLimit > 0) {
        boardStatus = "buy_review";
        boardReason = "장초 재판정을 통과했고 오늘 신규 매수 한도 안에 들어 있습니다.";
        portfolioNote = `남은 포트폴리오 슬롯 ${remainingPortfolioSlots}개 기준`;
      } else {
        boardStatus = "watch";
        if (remainingPortfolioSlots <= 0) {
          boardReason = `현재 진행중 포지션 ${activeHoldings.length}개로 동시 관리 기준 ${summary.maxConcurrentPositions}개를 채워 신규 매수 여유가 없습니다.`;
          portfolioNote = "포트폴리오 슬롯 없음";
        } else {
          boardReason =
            buyReviewLimit > 0
              ? `장초 재판정은 통과했지만 오늘 신규 매수 한도 ${buyReviewLimit}개를 넘겨 관찰 유지로 남깁니다.`
              : "재판정을 통과해도 오늘은 신규 매수 한도가 없어 관찰 유지로 남깁니다.";
          portfolioNote = `신규 매수 한도 ${buyReviewLimit}개`;
        }
      }
    } else if (rawStatus === "watch") {
      boardStatus = "watch";
      boardReason = "확인 가격과 거래 반응을 조금 더 확인한 뒤 다시 판단합니다.";
    } else if (rawStatus === "avoid") {
      boardStatus = "avoid";
      boardReason = "갭상승 또는 과열 가능성이 있어 오늘은 추격하지 않습니다.";
    } else if (rawStatus === "excluded") {
      boardStatus = "excluded";
      boardReason = "손절 기준 훼손 또는 구조 약화로 오늘 후보에서 제외합니다.";
    } else {
      boardStatus = "pending";
      boardReason = "장초 재판정이 아직 저장되지 않아 실제 행동 후보로 확정하지 않았습니다.";
    }

    return {
      ticker: candidate.ticker,
      company: candidate.company,
      sector: candidate.sector,
      signalTone: candidate.signalTone,
      featuredRank: candidate.featuredRank ?? undefined,
      candidateScore: candidate.candidateScore ?? undefined,
      activationScore: candidate.activationScore ?? undefined,
      actionBucket: candidate.actionBucket ?? undefined,
      tradePlan: candidate.tradePlan ?? undefined,
      openingRecheck,
      boardStatus,
      boardReason,
      portfolioNote
    };
  });

  const sections = TODAY_ACTION_BOARD_ORDER.map((status) => {
    const sectionItems = items.filter((item) => item.boardStatus === status);
    const meta = TODAY_ACTION_BOARD_SECTION_META[status];

    return {
      status,
      label: meta.label,
      description: meta.description,
      count: sectionItems.length,
      items: sectionItems
    };
  });

  const buyReviewCount = sections.find((section) => section.status === "buy_review")?.count ?? 0;
  const watchCount = sections.find((section) => section.status === "watch")?.count ?? 0;
  const avoidCount = sections.find((section) => section.status === "avoid")?.count ?? 0;
  const excludedCount = sections.find((section) => section.status === "excluded")?.count ?? 0;
  const pendingCount = sections.find((section) => section.status === "pending")?.count ?? 0;
  const overflowPassedCount = Math.max(passedCandidates.length - buyReviewCount, 0);
  const remainingNewPositions = Math.max(buyReviewLimit - buyReviewCount, 0);

  let headline = `오늘 실제 매수 검토 ${buyReviewCount}개`;
  let note = "손절 기준과 비중이 정리된 종목만 실제 매수 검토 대상으로 남깁니다.";

  if (buyReviewCount === 0 && pendingCount > 0) {
    headline = `아직 재판정 대기 ${pendingCount}개`;
    note = "장초 재판정이 끝나기 전까지는 오늘 실제 매수 검토 종목을 확정하지 않습니다.";
  } else if (buyReviewCount === 0 && watchCount > 0) {
    headline = "오늘은 관찰 유지 우선";
    note = "재판정을 통과한 종목보다 더 지켜봐야 할 종목이 많아 신규 매수보다 관찰이 우선입니다.";
  } else if (buyReviewCount === 0 && avoidCount + excludedCount > 0) {
    headline = "오늘은 신규 매수보다 방어 우선";
    note = "보류 또는 제외 종목이 많아 오늘은 신규 매수를 공격적으로 늘리지 않는 편이 좋습니다.";
  }

  if (overflowPassedCount > 0) {
    note = `재판정을 통과한 종목이 더 있지만 신규 매수 한도 ${buyReviewLimit}개를 넘는 ${overflowPassedCount}개는 관찰 유지로 남깁니다.`;
  }

  return {
    summary: {
      headline,
      note,
      maxNewPositions: buyReviewLimit,
      remainingNewPositions,
      activeHoldingCount: activeHoldings.length,
      remainingPortfolioSlots,
      sectorLimit,
      crowdedSectors,
      buyReviewCount,
      watchCount,
      avoidCount,
      excludedCount,
      pendingCount
    },
    sections,
    items
  };
}

export function buildRecommendationTradePlan({
  item,
  candidate
}: {
  item: RecommendationTradePlanInput;
  candidate?: DailyCandidate | null;
}): RecommendationTradePlan {
  const bucket = resolveRecommendationActionBucket(item);
  const currentPrice = candidate?.currentPrice ?? null;
  const confirmationPrice = candidate?.confirmationPrice ?? parsePriceText(item.checkpoints[1] ?? item.checkpoints[0]);
  const stopPrice = candidate?.invalidationPrice ?? parsePriceText(item.invalidation);
  const targetPrice = candidate?.expansionPrice ?? parsePriceText(item.checkpoints[2] ?? item.checkpoints[1]);
  const stretchTargetPrice = buildStretchTarget(targetPrice, confirmationPrice, stopPrice);
  const entryPlan = buildEntryPlan(bucket, currentPrice, confirmationPrice);

  return {
    currentPrice,
    currentPriceLabel: formatPriceLabel(currentPrice, "현재가 확인 필요"),
    entryPriceLow: entryPlan.entryPriceLow ?? undefined,
    entryPriceHigh: entryPlan.entryPriceHigh ?? undefined,
    confirmationPrice: confirmationPrice ?? undefined,
    entryLabel: entryPlan.entryLabel,
    stopPrice: stopPrice ?? undefined,
    stopLabel: stopPrice === null ? item.invalidation : formatPrice(stopPrice),
    targetPrice: targetPrice ?? undefined,
    targetLabel: formatPriceLabel(targetPrice, "1차 목표 확인 필요"),
    stretchTargetPrice: stretchTargetPrice ?? undefined,
    stretchTargetLabel: formatPriceLabel(stretchTargetPrice, "추가 목표 확인"),
    holdWindowLabel: item.observationWindow || getDefaultHoldWindow(item.signalTone),
    riskRewardLabel: formatRiskRewardLabel(entryPlan.entryReference ?? null, stopPrice, targetPrice, item.riskRewardRatio),
    nextStep: buildNextStep(bucket, confirmationPrice, stopPrice)
  };
}

export function createRecommendationTradePlanInput(
  recommendation: Pick<
    Recommendation,
    | "signalTone"
    | "score"
    | "activationScore"
    | "featuredRank"
    | "trackingDiagnostic"
    | "actionBucket"
    | "invalidation"
    | "checkpoints"
    | "observationWindow"
    | "riskRewardRatio"
  >
): RecommendationTradePlanInput {
  return {
    signalTone: recommendation.signalTone,
    score: recommendation.score,
    activationScore: recommendation.activationScore,
    featuredRank: recommendation.featuredRank,
    trackingDiagnostic: recommendation.trackingDiagnostic,
    actionBucket: recommendation.actionBucket,
    invalidation: recommendation.invalidation,
    checkpoints: recommendation.checkpoints,
    observationWindow: recommendation.observationWindow || getDefaultHoldWindow(recommendation.signalTone),
    riskRewardRatio: recommendation.riskRewardRatio
  };
}
