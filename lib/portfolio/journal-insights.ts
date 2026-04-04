import {
  getOpeningActionIntentMeta,
  getOpeningConfirmationMeta,
  getOpeningGapMeta,
  getOpeningRecheckStatusMeta
} from "@/lib/recommendations/opening-recheck";
import type {
  OpeningRecheckDecision,
  OpeningRecheckStatus,
  PortfolioCloseReviewEntry,
  PortfolioTradeEvent,
  PortfolioTradeEventType
} from "@/types/recommendation";

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

export interface PortfolioReviewPattern {
  key: "stop_loss" | "manual_exit" | "partial_take" | "extended_hold";
  label: string;
  count: number;
  note: string;
  tone: "positive" | "neutral" | "caution" | "secondary";
}

export interface PortfolioReviewSummary {
  closedCount: number;
  realizedPnlTotal: number;
  profitableCount: number;
  lossCount: number;
  breakEvenCount: number;
  stopLossCount: number;
  manualExitCount: number;
  averageHoldingDays: number;
  patterns: PortfolioReviewPattern[];
}

export interface PortfolioReviewCalendarDay {
  date: string;
  dayOfMonth: number;
  weekday: number;
  realizedPnl: number;
  closedCount: number;
  profitableCount: number;
  lossCount: number;
  stopLossCount: number;
  partialTakeCount: number;
  memoCount: number;
}

export interface PortfolioReviewWeekSummary {
  weekKey: string;
  label: string;
  realizedPnl: number;
  closedCount: number;
  profitableCount: number;
  lossCount: number;
  stopLossCount: number;
  partialTakeCount: number;
  memoCoverageRate: number;
  averageHoldingDays: number;
}

export interface PortfolioReviewBehaviorSummary {
  memoCoverageRate: number;
  partialTakeUsageRate: number;
  quickCloseRate: number;
  extendedHoldRate: number;
}

export interface PortfolioReviewCalendarDashboard {
  monthKey: string | null;
  monthLabel: string;
  days: PortfolioReviewCalendarDay[];
  weeks: PortfolioReviewWeekSummary[];
  behavior: PortfolioReviewBehaviorSummary;
}

export interface PortfolioReviewRuleMetric {
  key: "memo_coverage" | "partial_take" | "winner_hold" | "loser_hold";
  label: string;
  value: string;
  note: string;
  tone: "positive" | "neutral" | "caution";
}

export interface PortfolioReviewDistributionItem {
  key: string;
  label: string;
  count: number;
  ratio: number;
  note: string;
  tone: "positive" | "neutral" | "caution" | "secondary";
}

export interface PortfolioReviewTagInsight {
  key: string;
  label: string;
  count: number;
  ratio: number;
  note: string;
}

export interface PortfolioReviewAnalytics {
  headline: string;
  summary: string;
  ruleMetrics: PortfolioReviewRuleMetric[];
  holdDistribution: PortfolioReviewDistributionItem[];
  pnlDistribution: PortfolioReviewDistributionItem[];
  tagInsights: PortfolioReviewTagInsight[];
}

export interface PortfolioCloseReviewRuleCandidate {
  id: string;
  text: string;
  count: number;
  category: "strengths" | "watchouts" | "next_rule";
  categoryLabel: string;
  tone: "positive" | "neutral" | "caution";
  note: string;
}

export interface PortfolioCloseReviewRuleDashboard {
  reviewedCount: number;
  candidateCount: number;
  summary: string;
  candidates: PortfolioCloseReviewRuleCandidate[];
}

export interface PortfolioPerformancePeriod {
  key: string;
  label: string;
  realizedPnl: number;
  closedCount: number;
  profitableCount: number;
  lossCount: number;
  winRate: number;
}

export interface PortfolioPerformanceTagInsight {
  key: string;
  label: string;
  count: number;
  realizedPnl: number;
  winRate: number;
  note: string;
}

export interface PortfolioPerformanceEquityPoint {
  key: string;
  label: string;
  realizedPnl: number;
  cumulativePnl: number;
  closedCount: number;
  tone: "positive" | "neutral" | "caution";
}

export interface PortfolioPerformanceExitReasonInsight {
  key: "exit_full" | "stop_loss" | "manual_exit";
  label: string;
  count: number;
  ratio: number;
  realizedPnl: number;
  winRate: number;
  note: string;
  tone: "positive" | "neutral" | "caution";
}

export interface PortfolioPerformanceDashboard {
  headline: string;
  summary: string;
  realizedPnlTotal: number;
  closedCount: number;
  profitableCount: number;
  lossCount: number;
  winRate: number;
  averageHoldingDays: number;
  stopLossRate: number;
  partialTakeUsageRate: number;
  weekly: PortfolioPerformancePeriod[];
  monthly: PortfolioPerformancePeriod[];
  equityCurve: PortfolioPerformanceEquityPoint[];
  strategyTags: PortfolioPerformanceTagInsight[];
  exitReasons: PortfolioPerformanceExitReasonInsight[];
  bestWeeklyPeriod?: PortfolioPerformancePeriod;
  worstWeeklyPeriod?: PortfolioPerformancePeriod;
}

export interface PortfolioOpeningCheckBehaviorImpact {
  key: "passed" | "watch" | "override";
  label: string;
  count: number;
  realizedPnl: number;
  averagePnl: number;
  winRate: number;
  note: string;
  tone: "positive" | "neutral" | "caution";
}

export interface PortfolioOpeningCheckScanSnapshot {
  scanKey: string;
  updatedAt: string;
  items: Record<string, ({ ticker: string } & OpeningRecheckDecision) | undefined>;
}

export interface PortfolioOpeningCheckStatusInsight {
  status: Exclude<OpeningRecheckStatus, "pending">;
  label: string;
  count: number;
  profitableCount: number;
  lossCount: number;
  flatCount: number;
  winRate: number;
  note: string;
}

export interface PortfolioOpeningCheckPatternInsight {
  id: string;
  title: string;
  count: number;
  profitableCount: number;
  lossCount: number;
  flatCount: number;
  winRate: number;
  note: string;
}

export interface PortfolioOpeningCheckAnalytics {
  headline: string;
  summary: string;
  matchedCount: number;
  unmatchedCount: number;
  overrideCount: number;
  profitableCount: number;
  lossCount: number;
  statusInsights: PortfolioOpeningCheckStatusInsight[];
  patterns: PortfolioOpeningCheckPatternInsight[];
  behaviorImpacts: PortfolioOpeningCheckBehaviorImpact[];
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

function formatDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getWeekStart(value: string) {
  const date = new Date(`${formatDateKey(value)}T00:00:00+09:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function formatMonthKey(value: string) {
  return formatDateKey(value).slice(0, 7);
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-");
  return `${year}년 ${Number(month)}월`;
}

function formatWeekLabel(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit"
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit"
  }).format(end);
  return `${startLabel} - ${endLabel}`;
}

function roundRatio(count: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

function formatHoldingDayValue(days: number | null) {
  if (days === null || Number.isNaN(days)) {
    return "-";
  }

  return `${Math.round(days)}일`;
}

function getGrossEntryCapital(group: PortfolioJournalGroup) {
  return group.events.reduce((sum, event) => {
    if (event.type === "buy" || event.type === "add") {
      return sum + event.price * event.quantity + (event.fees ?? 0);
    }

    return sum;
  }, 0);
}

function collectGroupNotes(group: PortfolioJournalGroup) {
  return group.events
    .map((event) => event.note?.trim())
    .filter((note): note is string => Boolean(note))
    .join(" ")
    .toLowerCase();
}

function hasAnyKeyword(source: string, keywords: readonly string[]) {
  return keywords.some((keyword) => source.includes(keyword));
}

function outcomeFromGroup(group: PortfolioJournalGroup) {
  if (group.metrics.realizedPnl > 0) {
    return "success" as const;
  }

  if (group.metrics.realizedPnl < 0) {
    return "failure" as const;
  }

  return "flat" as const;
}

function normalizeReviewRuleLine(value: string) {
  return value.replace(/^[-*•\s]+/, "").replace(/\s+/g, " ").trim();
}

function splitReviewRuleLines(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n+/)
    .map((line) => normalizeReviewRuleLine(line))
    .filter(Boolean);
}

const portfolioTagDefinitions = [
  {
    key: "opening_check",
    label: "장초/시초 메모",
    keywords: ["장초", "시초", "확인", "opening", "preopen", "gap"],
    note: "장초 확인과 시초 반응을 함께 적어둔 거래"
  },
  {
    key: "risk_control",
    label: "손절/리스크 메모",
    keywords: ["손절", "리스크", "보호", "stop", "risk", "loss"],
    note: "손절과 리스크 기준을 남긴 거래"
  },
  {
    key: "scale_out",
    label: "부분 익절 메모",
    keywords: ["부분 익절", "분할", "익절", "partial", "scale", "profit"],
    note: "부분 익절 계획을 남긴 거래"
  },
  {
    key: "hold_management",
    label: "보유/관찰 메모",
    keywords: ["보유", "관찰", "유지", "홀드", "hold", "watch", "manage"],
    note: "보유 관리 메모를 남긴 거래"
  }
] as const;

const closingReasonDefinitions = [
  {
    key: "exit_full",
    label: "전량 매도",
    tone: "positive" as const,
    note: "계획상 목표 도달 뒤 정리한 종료"
  },
  {
    key: "stop_loss",
    label: "손절 종료",
    tone: "caution" as const,
    note: "손실 제한을 위해 종료한 거래"
  },
  {
    key: "manual_exit",
    label: "수동 종료",
    tone: "neutral" as const,
    note: "계획 밖 판단으로 정리한 거래"
  }
] as const;

function flattenOpeningCheckDecisions(scans: PortfolioOpeningCheckScanSnapshot[]) {
  return scans.flatMap((scan) => {
    const signalDate = formatDateKey(scan.scanKey);

    return Object.values(scan.items)
      .filter((item): item is NonNullable<typeof item> => {
        return Boolean(item && item.status !== "pending");
      })
      .map((item) => ({
        scanKey: scan.scanKey,
        signalDate,
        ticker: item.ticker.toUpperCase(),
        decision: item
      }));
  });
}

function findMatchedOpeningDecision(
  group: PortfolioJournalGroup,
  decisionsByTicker: Map<string, ReturnType<typeof flattenOpeningCheckDecisions>>
) {
  const tickerDecisions = decisionsByTicker.get(group.ticker.toUpperCase()) ?? [];
  if (!tickerDecisions.length) {
    return null;
  }

  const entryDate = formatDateKey(group.firstEntryAt);
  return (
    tickerDecisions.find((entry) => entry.signalDate <= entryDate) ??
    tickerDecisions[tickerDecisions.length - 1] ??
    null
  );
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

export function buildPortfolioReviewSummary(groups: PortfolioJournalGroup[]): PortfolioReviewSummary {
  const closedGroups = groups.filter((group) => isClosingPortfolioTradeEventType(group.latestEvent.type));
  const realizedPnlTotal = closedGroups.reduce((sum, group) => sum + group.metrics.realizedPnl, 0);
  const profitableCount = closedGroups.filter((group) => group.metrics.realizedPnl > 0).length;
  const lossCount = closedGroups.filter((group) => group.metrics.realizedPnl < 0).length;
  const breakEvenCount = closedGroups.length - profitableCount - lossCount;
  const stopLossCount = closedGroups.filter((group) => group.latestEvent.type === "stop_loss").length;
  const manualExitCount = closedGroups.filter((group) => group.latestEvent.type === "manual_exit").length;
  const averageHoldingDays = closedGroups.length
    ? Math.round(
        closedGroups.reduce((sum, group) => sum + group.holdingDays, 0) / closedGroups.length
      )
    : 0;

  const patterns: PortfolioReviewPattern[] = [
    {
      key: "stop_loss",
      label: "손절 종료",
      count: stopLossCount,
      note: "손절로 닫힌 거래 수입니다. 진입과 손절 거리 규칙을 다시 보기 좋습니다.",
      tone: stopLossCount > 0 ? "caution" : "secondary"
    },
    {
      key: "manual_exit",
      label: "수동 종료",
      count: manualExitCount,
      note: "계획 외 판단으로 정리한 거래입니다. 메모 품질을 높이면 회고 가치가 커집니다.",
      tone: manualExitCount > 0 ? "neutral" : "secondary"
    },
    {
      key: "partial_take",
      label: "부분 익절 후 종료",
      count: closedGroups.filter((group) => group.partialExitCount > 0).length,
      note: "부분 익절이 실제 종료까지 이어진 거래입니다.",
      tone: closedGroups.some((group) => group.partialExitCount > 0) ? "positive" : "secondary"
    },
    {
      key: "extended_hold",
      label: "8일 이상 보유",
      count: closedGroups.filter((group) => group.holdingDays >= 8).length,
      note: "시간 손절이나 교체 규칙이 필요할 수 있는 종료 거래입니다.",
      tone: closedGroups.some((group) => group.holdingDays >= 8) ? "neutral" : "secondary"
    }
  ];

  return {
    closedCount: closedGroups.length,
    realizedPnlTotal,
    profitableCount,
    lossCount,
    breakEvenCount,
    stopLossCount,
    manualExitCount,
    averageHoldingDays,
    patterns
  };
}

export function buildPortfolioReviewCalendarDashboard(
  groups: PortfolioJournalGroup[]
): PortfolioReviewCalendarDashboard {
  const closedGroups = groups.filter((group) => isClosingPortfolioTradeEventType(group.latestEvent.type));

  if (!closedGroups.length) {
    return {
      monthKey: null,
      monthLabel: "기록 대기",
      days: [],
      weeks: [],
      behavior: {
        memoCoverageRate: 0,
        partialTakeUsageRate: 0,
        quickCloseRate: 0,
        extendedHoldRate: 0
      }
    };
  }

  const latestDateKey = formatDateKey(closedGroups[0].latestEvent.tradedAt);
  const monthKey = formatMonthKey(latestDateKey);
  const dayMap = new Map<string, PortfolioReviewCalendarDay>();
  const weekMap = new Map<
    string,
    {
      weekKey: string;
      label: string;
      realizedPnl: number;
      closedCount: number;
      profitableCount: number;
      lossCount: number;
      stopLossCount: number;
      partialTakeCount: number;
      memoCount: number;
      totalHoldingDays: number;
    }
  >();

  let memoCount = 0;
  let partialTakeGroupCount = 0;
  let quickCloseCount = 0;
  let extendedHoldCount = 0;

  for (const group of closedGroups) {
    const latestDate = formatDateKey(group.latestEvent.tradedAt);
    const groupMemoCount = group.events.some((event) => Boolean(event.note?.trim())) ? 1 : 0;
    const weekStart = getWeekStart(group.latestEvent.tradedAt);
    const weekKey = weekStart.toISOString().slice(0, 10);
    const existingDay = dayMap.get(latestDate);

    if (groupMemoCount > 0) {
      memoCount += 1;
    }
    if (group.partialExitCount > 0) {
      partialTakeGroupCount += 1;
    }
    if (group.holdingDays <= 3) {
      quickCloseCount += 1;
    }
    if (group.holdingDays >= 8) {
      extendedHoldCount += 1;
    }

    if (formatMonthKey(latestDate) === monthKey) {
      const currentDay =
        existingDay ??
        {
          date: latestDate,
          dayOfMonth: Number(latestDate.slice(-2)),
          weekday: new Date(`${latestDate}T00:00:00+09:00`).getDay(),
          realizedPnl: 0,
          closedCount: 0,
          profitableCount: 0,
          lossCount: 0,
          stopLossCount: 0,
          partialTakeCount: 0,
          memoCount: 0
        };

      currentDay.realizedPnl += group.metrics.realizedPnl;
      currentDay.closedCount += 1;
      currentDay.profitableCount += group.metrics.realizedPnl > 0 ? 1 : 0;
      currentDay.lossCount += group.metrics.realizedPnl < 0 ? 1 : 0;
      currentDay.stopLossCount += group.latestEvent.type === "stop_loss" ? 1 : 0;
      currentDay.partialTakeCount += group.partialExitCount > 0 ? 1 : 0;
      currentDay.memoCount += groupMemoCount;
      dayMap.set(latestDate, currentDay);
    }

    const existingWeek = weekMap.get(weekKey) ?? {
      weekKey,
      label: formatWeekLabel(weekStart),
      realizedPnl: 0,
      closedCount: 0,
      profitableCount: 0,
      lossCount: 0,
      stopLossCount: 0,
      partialTakeCount: 0,
      memoCount: 0,
      totalHoldingDays: 0
    };

    existingWeek.realizedPnl += group.metrics.realizedPnl;
    existingWeek.closedCount += 1;
    existingWeek.profitableCount += group.metrics.realizedPnl > 0 ? 1 : 0;
    existingWeek.lossCount += group.metrics.realizedPnl < 0 ? 1 : 0;
    existingWeek.stopLossCount += group.latestEvent.type === "stop_loss" ? 1 : 0;
    existingWeek.partialTakeCount += group.partialExitCount > 0 ? 1 : 0;
    existingWeek.memoCount += groupMemoCount;
    existingWeek.totalHoldingDays += group.holdingDays;
    weekMap.set(weekKey, existingWeek);
  }

  const weeks = [...weekMap.values()]
    .sort((left, right) => (left.weekKey < right.weekKey ? 1 : -1))
    .slice(0, 6)
    .map((week) => ({
      weekKey: week.weekKey,
      label: week.label,
      realizedPnl: week.realizedPnl,
      closedCount: week.closedCount,
      profitableCount: week.profitableCount,
      lossCount: week.lossCount,
      stopLossCount: week.stopLossCount,
      partialTakeCount: week.partialTakeCount,
      memoCoverageRate: week.closedCount ? Math.round((week.memoCount / week.closedCount) * 100) : 0,
      averageHoldingDays: week.closedCount ? Math.round(week.totalHoldingDays / week.closedCount) : 0
    }));

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    days: [...dayMap.values()].sort((left, right) => (left.date > right.date ? 1 : -1)),
    weeks,
    behavior: {
      memoCoverageRate: Math.round((memoCount / closedGroups.length) * 100),
      partialTakeUsageRate: Math.round((partialTakeGroupCount / closedGroups.length) * 100),
      quickCloseRate: Math.round((quickCloseCount / closedGroups.length) * 100),
      extendedHoldRate: Math.round((extendedHoldCount / closedGroups.length) * 100)
    }
  };
}

export function buildPortfolioReviewAnalytics(groups: PortfolioJournalGroup[]): PortfolioReviewAnalytics {
  const closedGroups = groups.filter((group) => isClosingPortfolioTradeEventType(group.latestEvent.type));

  if (!closedGroups.length) {
    return {
      headline: "종료 거래가 쌓이면 규칙 분석이 시작됩니다.",
      summary: "종료된 거래가 생기면 보유 기간, 손익 구간, 메모 패턴을 묶어서 어떤 행동이 잘 맞는지 다시 볼 수 있습니다.",
      ruleMetrics: [
        {
          key: "memo_coverage",
          label: "메모 기록률",
          value: "0%",
          note: "종료 거래 메모가 아직 없습니다.",
          tone: "neutral"
        },
        {
          key: "partial_take",
          label: "부분 익절 활용",
          value: "0%",
          note: "부분 익절을 쓴 종료 거래가 아직 없습니다.",
          tone: "neutral"
        },
        {
          key: "winner_hold",
          label: "수익 종료 평균 보유",
          value: "-",
          note: "수익 종료 데이터가 아직 없습니다.",
          tone: "positive"
        },
        {
          key: "loser_hold",
          label: "손실 종료 평균 보유",
          value: "-",
          note: "손실 종료 데이터가 아직 없습니다.",
          tone: "caution"
        }
      ],
      holdDistribution: [],
      pnlDistribution: [],
      tagInsights: []
    };
  }

  const memoGroups = closedGroups.filter((group) => {
    return group.events.some((event) => Boolean(event.note?.trim()));
  }).length;
  const partialTakeGroups = closedGroups.filter((group) => group.partialExitCount > 0).length;
  const winnerGroups = closedGroups.filter((group) => group.metrics.realizedPnl > 0);
  const loserGroups = closedGroups.filter((group) => group.metrics.realizedPnl < 0);

  const averageWinnerHoldDays = winnerGroups.length
    ? winnerGroups.reduce((sum, group) => sum + group.holdingDays, 0) / winnerGroups.length
    : null;
  const averageLoserHoldDays = loserGroups.length
    ? loserGroups.reduce((sum, group) => sum + group.holdingDays, 0) / loserGroups.length
    : null;

  const holdBucketDefinitions = [
    {
      key: "quick",
      label: "1-3일",
      tone: "neutral" as const,
      matcher: (group: PortfolioJournalGroup) => group.holdingDays <= 3,
      note: "짧게 끝난 거래"
    },
    {
      key: "swing_core",
      label: "4-7일",
      tone: "positive" as const,
      matcher: (group: PortfolioJournalGroup) => group.holdingDays >= 4 && group.holdingDays <= 7,
      note: "핵심 스윙 보유 구간"
    },
    {
      key: "extended",
      label: "8-14일",
      tone: "caution" as const,
      matcher: (group: PortfolioJournalGroup) => group.holdingDays >= 8 && group.holdingDays <= 14,
      note: "길어진 보유"
    },
    {
      key: "long_tail",
      label: "15일+",
      tone: "secondary" as const,
      matcher: (group: PortfolioJournalGroup) => group.holdingDays >= 15,
      note: "교체 규칙 점검 필요"
    }
  ];

  const holdDistribution = holdBucketDefinitions.map((bucket) => {
    const count = closedGroups.filter(bucket.matcher).length;
    return {
      key: bucket.key,
      label: bucket.label,
      count,
      ratio: roundRatio(count, closedGroups.length),
      note: bucket.note,
      tone: bucket.tone
    };
  });

  const pnlBucketDefinitions = [
    {
      key: "deep_loss",
      label: "-5% 이하",
      tone: "caution" as const,
      matcher: (ratio: number) => ratio <= -5,
      note: "손실 폭이 큰 종료"
    },
    {
      key: "small_loss",
      label: "-5% ~ 0%",
      tone: "neutral" as const,
      matcher: (ratio: number) => ratio > -5 && ratio < 0,
      note: "작게 끝난 손실"
    },
    {
      key: "small_gain",
      label: "0% ~ 5%",
      tone: "positive" as const,
      matcher: (ratio: number) => ratio >= 0 && ratio < 5,
      note: "작게 챙긴 수익"
    },
    {
      key: "strong_gain",
      label: "5% 이상",
      tone: "positive" as const,
      matcher: (ratio: number) => ratio >= 5,
      note: "확실히 챙긴 수익"
    }
  ];

  const pnlDistribution = pnlBucketDefinitions.map((bucket) => {
    const count = closedGroups.filter((group) => {
      const entryCapital = getGrossEntryCapital(group);
      const ratio = entryCapital > 0 ? (group.metrics.realizedPnl / entryCapital) * 100 : 0;
      return bucket.matcher(ratio);
    }).length;

    return {
      key: bucket.key,
      label: bucket.label,
      count,
      ratio: roundRatio(count, closedGroups.length),
      note: bucket.note,
      tone: bucket.tone
    };
  });

  const tagDefinitions = [
    {
      key: "opening_check",
      label: "장초/시초 메모",
      keywords: ["장초", "시초", "갭", "확인", "opening", "preopen", "gap"],
      note: "장초 확인 내용을 남긴 거래"
    },
    {
      key: "risk_control",
      label: "손절/리스크 메모",
      keywords: ["손절", "리스크", "보호", "컷", "stop", "risk", "loss"],
      note: "리스크 대응을 적어둔 거래"
    },
    {
      key: "scale_out",
      label: "부분 익절 메모",
      keywords: ["부분 익절", "분할", "익절", "partial", "scale", "profit"],
      note: "나눠서 챙긴 흐름이 적힌 거래"
    },
    {
      key: "hold_management",
      label: "보유/관찰 메모",
      keywords: ["보유", "관찰", "유지", "홀드", "hold", "watch", "manage"],
      note: "보유 유지 판단이 적힌 거래"
    }
  ];

  const tagInsights = tagDefinitions
    .map((tag) => {
      const count = closedGroups.filter((group) => {
        return hasAnyKeyword(collectGroupNotes(group), tag.keywords);
      }).length;

      return {
        key: tag.key,
        label: tag.label,
        count,
        ratio: roundRatio(count, closedGroups.length),
        note: tag.note
      };
    })
    .filter((tag) => tag.count > 0)
    .sort((left, right) => right.count - left.count);

  return {
    headline: "종료 거래에서 반복되는 규칙과 습관을 바로 읽을 수 있습니다.",
    summary: "보유 기간, 손익 구간, 메모 패턴을 함께 보면 어떤 스윙 행동이 자주 먹히고 어디서 자주 흔들리는지 더 빨리 보입니다.",
    ruleMetrics: [
      {
        key: "memo_coverage",
        label: "메모 기록률",
        value: `${roundRatio(memoGroups, closedGroups.length)}%`,
        note: "종료 거래 중 메모가 남아 있는 비율",
        tone: memoGroups === closedGroups.length ? "positive" : "neutral"
      },
      {
        key: "partial_take",
        label: "부분 익절 활용",
        value: `${roundRatio(partialTakeGroups, closedGroups.length)}%`,
        note: "부분 익절을 거친 종료 거래 비율",
        tone: partialTakeGroups > 0 ? "positive" : "neutral"
      },
      {
        key: "winner_hold",
        label: "수익 종료 평균 보유",
        value: formatHoldingDayValue(averageWinnerHoldDays),
        note: "수익으로 끝난 거래의 평균 보유 기간",
        tone: "positive"
      },
      {
        key: "loser_hold",
        label: "손실 종료 평균 보유",
        value: formatHoldingDayValue(averageLoserHoldDays),
        note: "손실로 끝난 거래의 평균 보유 기간",
        tone: "caution"
      }
    ],
    holdDistribution,
    pnlDistribution,
    tagInsights
  };
}

export function buildPortfolioCloseReviewRuleDashboard(
  closeReviews: Record<string, PortfolioCloseReviewEntry>
): PortfolioCloseReviewRuleDashboard {
  const reviewEntries = Object.values(closeReviews);
  if (!reviewEntries.length) {
    return {
      reviewedCount: 0,
      candidateCount: 0,
      summary: "아직 직접 저장한 종료 회고가 없어 반복되는 규칙 후보를 만들지 못했습니다.",
      candidates: []
    };
  }

  const categoryMeta: Record<
    PortfolioCloseReviewRuleCandidate["category"],
    { label: string; tone: PortfolioCloseReviewRuleCandidate["tone"]; order: number; note: string }
  > = {
    next_rule: {
      label: "다음 규칙",
      tone: "positive",
      order: 0,
      note: "다음에도 반복하거나 지켜야 할 규칙으로 가장 자주 남긴 문장"
    },
    watchouts: {
      label: "아쉬운 점",
      tone: "caution",
      order: 1,
      note: "반복해서 아쉽다고 적은 행동이나 패턴"
    },
    strengths: {
      label: "잘한 점",
      tone: "neutral",
      order: 2,
      note: "잘 지켰다고 자주 남긴 행동 기준"
    }
  };

  const candidateMap = new Map<
    string,
    { text: string; category: PortfolioCloseReviewRuleCandidate["category"]; count: number }
  >();

  for (const review of reviewEntries) {
    const entries: Array<[PortfolioCloseReviewRuleCandidate["category"], string[]]> = [
      ["strengths", splitReviewRuleLines(review.strengthsNote)],
      ["watchouts", splitReviewRuleLines(review.watchoutsNote)],
      ["next_rule", splitReviewRuleLines(review.nextRuleNote)]
    ];

    for (const [category, lines] of entries) {
      for (const line of lines) {
        const normalized = line.toLowerCase();
        const key = `${category}:${normalized}`;
        const current = candidateMap.get(key) ?? { text: line, category, count: 0 };
        current.count += 1;
        candidateMap.set(key, current);
      }
    }
  }

  const candidates = Array.from(candidateMap.entries())
    .map(([id, candidate]) => {
      const meta = categoryMeta[candidate.category];
      return {
        id,
        text: candidate.text,
        count: candidate.count,
        category: candidate.category,
        categoryLabel: meta.label,
        tone: meta.tone,
        note: meta.note
      } satisfies PortfolioCloseReviewRuleCandidate;
    })
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      const categoryDiff = categoryMeta[left.category].order - categoryMeta[right.category].order;
      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      return left.text.localeCompare(right.text, "ko");
    })
    .slice(0, 6);

  return {
    reviewedCount: reviewEntries.length,
    candidateCount: candidateMap.size,
    summary:
      candidates.length > 0
        ? `${reviewEntries.length}개의 종료 회고에서 반복된 문장을 규칙 후보로 묶었습니다. 가장 자주 남긴 문장부터 바로 확인할 수 있습니다.`
        : "종료 회고는 있지만 반복된 문장이 아직 적어 규칙 후보가 뚜렷하지 않습니다.",
    candidates
  };
}

export function buildPortfolioPerformanceDashboard(
  groups: PortfolioJournalGroup[]
): PortfolioPerformanceDashboard {
  const closedGroups = groups.filter((group) => isClosingPortfolioTradeEventType(group.latestEvent.type));
  const summary = buildPortfolioReviewSummary(closedGroups);
  const calendar = buildPortfolioReviewCalendarDashboard(closedGroups);

  if (!closedGroups.length) {
    return {
      headline: "종료 거래가 쌓이면 계좌 성과 흐름이 보입니다.",
      summary: "전량 매도, 손절, 수동 종료가 쌓이면 주간·월간 손익과 운용 리듬을 계좌 기준으로 바로 읽을 수 있습니다.",
      realizedPnlTotal: 0,
      closedCount: 0,
      profitableCount: 0,
      lossCount: 0,
      winRate: 0,
      averageHoldingDays: 0,
      stopLossRate: 0,
      partialTakeUsageRate: 0,
      weekly: [],
      monthly: [],
      equityCurve: [],
      strategyTags: [],
      exitReasons: []
    };
  }

  const monthlyMap = new Map<
    string,
    {
      key: string;
      label: string;
      realizedPnl: number;
      closedCount: number;
      profitableCount: number;
      lossCount: number;
    }
  >();

  for (const group of closedGroups) {
    const monthKey = formatMonthKey(group.latestEvent.tradedAt);
    const current = monthlyMap.get(monthKey) ?? {
      key: monthKey,
      label: formatMonthLabel(monthKey),
      realizedPnl: 0,
      closedCount: 0,
      profitableCount: 0,
      lossCount: 0
    };

    current.realizedPnl += group.metrics.realizedPnl;
    current.closedCount += 1;
    current.profitableCount += group.metrics.realizedPnl > 0 ? 1 : 0;
    current.lossCount += group.metrics.realizedPnl < 0 ? 1 : 0;
    monthlyMap.set(monthKey, current);
  }

  const weekly = calendar.weeks.map((week) => ({
    key: week.weekKey,
    label: week.label,
    realizedPnl: week.realizedPnl,
    closedCount: week.closedCount,
    profitableCount: week.profitableCount,
    lossCount: week.lossCount,
    winRate: roundRatio(week.profitableCount, week.closedCount)
  }));

  const monthly = [...monthlyMap.values()]
    .sort((left, right) => left.key.localeCompare(right.key))
    .slice(-6)
    .map((month) => ({
      key: month.key,
      label: month.label,
      realizedPnl: month.realizedPnl,
      closedCount: month.closedCount,
      profitableCount: month.profitableCount,
      lossCount: month.lossCount,
      winRate: roundRatio(month.profitableCount, month.closedCount)
    }));

  let cumulativePnl = 0;
  const equityCurve = [...closedGroups]
    .sort((left, right) => {
      return new Date(left.latestEvent.tradedAt).getTime() - new Date(right.latestEvent.tradedAt).getTime();
    })
    .map((group) => {
      cumulativePnl += group.metrics.realizedPnl;
      const tone =
        group.metrics.realizedPnl > 0 ? "positive" : group.metrics.realizedPnl < 0 ? "caution" : "neutral";

      return {
        key: `${group.ticker}:${group.latestEvent.id}`,
        label: formatDateKey(group.latestEvent.tradedAt).slice(5),
        realizedPnl: group.metrics.realizedPnl,
        cumulativePnl,
        closedCount: 1,
        tone
      } satisfies PortfolioPerformanceEquityPoint;
    })
    .slice(-10);

  const strategyTags = portfolioTagDefinitions
    .flatMap((tag): PortfolioPerformanceTagInsight[] => {
      const taggedGroups = closedGroups.filter((group) => hasAnyKeyword(collectGroupNotes(group), tag.keywords));
      if (!taggedGroups.length) {
        return [];
      }

      const profitableCount = taggedGroups.filter((group) => group.metrics.realizedPnl > 0).length;

      return [
        {
          key: tag.key,
          label: tag.label,
          count: taggedGroups.length,
          realizedPnl: taggedGroups.reduce((sum, group) => sum + group.metrics.realizedPnl, 0),
          winRate: roundRatio(profitableCount, taggedGroups.length),
          note: tag.note
        }
      ];
    })
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return right.realizedPnl - left.realizedPnl;
    })
    .slice(0, 4);

  const exitReasons = closingReasonDefinitions.map((reason) => {
    const reasonGroups = closedGroups.filter((group) => group.latestEvent.type === reason.key);
    const profitableCount = reasonGroups.filter((group) => group.metrics.realizedPnl > 0).length;

    return {
      key: reason.key,
      label: reason.label,
      count: reasonGroups.length,
      ratio: roundRatio(reasonGroups.length, closedGroups.length),
      realizedPnl: reasonGroups.reduce((sum, group) => sum + group.metrics.realizedPnl, 0),
      winRate: roundRatio(profitableCount, reasonGroups.length),
      note: reason.note,
      tone: reason.tone
    } satisfies PortfolioPerformanceExitReasonInsight;
  });

  const bestWeeklyPeriod = [...weekly].sort((left, right) => right.realizedPnl - left.realizedPnl)[0];
  const worstWeeklyPeriod = [...weekly].sort((left, right) => left.realizedPnl - right.realizedPnl)[0];

  return {
    headline: "계좌 성과를 주간·월간 흐름으로 다시 봅니다.",
    summary: "지금까지 끝난 거래를 합쳐서, 어느 주에 잘했고 어느 달에 흔들렸는지 빠르게 읽는 화면입니다.",
    realizedPnlTotal: summary.realizedPnlTotal,
    closedCount: summary.closedCount,
    profitableCount: summary.profitableCount,
    lossCount: summary.lossCount,
    winRate: roundRatio(summary.profitableCount, summary.closedCount),
    averageHoldingDays: summary.averageHoldingDays,
    stopLossRate: roundRatio(summary.stopLossCount, summary.closedCount),
    partialTakeUsageRate: calendar.behavior.partialTakeUsageRate,
    weekly,
    monthly,
    equityCurve,
    strategyTags,
    exitReasons,
    bestWeeklyPeriod,
    worstWeeklyPeriod
  };
}

export function filterPortfolioGroupsByDays(
  groups: PortfolioJournalGroup[],
  days: number | "all",
  now: Date = new Date()
) {
  if (days === "all") {
    return groups;
  }

  const cutoff = now.getTime() - days * 86_400_000;

  return groups.filter((group) => {
    const closedAt = new Date(group.latestEvent.tradedAt).getTime();
    return Number.isFinite(closedAt) && closedAt >= cutoff;
  });
}

export function buildPortfolioOpeningCheckAnalytics(
  groups: PortfolioJournalGroup[],
  scans: PortfolioOpeningCheckScanSnapshot[]
): PortfolioOpeningCheckAnalytics | undefined {
  const closedGroups = groups.filter((group) => isClosingPortfolioTradeEventType(group.latestEvent.type));
  if (!closedGroups.length || !scans.length) {
    return undefined;
  }

  const flattened = flattenOpeningCheckDecisions(scans).sort((left, right) => {
    return right.signalDate.localeCompare(left.signalDate);
  });
  const decisionsByTicker = flattened.reduce((map, item) => {
    const current = map.get(item.ticker) ?? [];
    current.push(item);
    map.set(item.ticker, current);
    return map;
  }, new Map<string, typeof flattened>());

  const matched = closedGroups
    .map((group) => {
      const matchedDecision = findMatchedOpeningDecision(group, decisionsByTicker);
      if (!matchedDecision) {
        return null;
      }

      return {
        group,
        decision: matchedDecision.decision,
        signalDate: matchedDecision.signalDate,
        outcome: outcomeFromGroup(group)
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (!matched.length) {
    return undefined;
  }

  const matchedCount = matched.length;
  const profitableCount = matched.filter((item) => item.outcome === "success").length;
  const lossCount = matched.filter((item) => item.outcome === "failure").length;
  const unmatchedCount = Math.max(closedGroups.length - matchedCount, 0);
  const overrideCount = matched.filter((item) => {
    return item.decision.status === "avoid" || item.decision.status === "excluded";
  }).length;

  const statusInsights = (["passed", "watch", "avoid", "excluded"] as const)
    .map((status) => {
      const items = matched.filter((item) => item.decision.status === status);
      if (!items.length) {
        return null;
      }

      const profitable = items.filter((item) => item.outcome === "success").length;
      const loss = items.filter((item) => item.outcome === "failure").length;
      const flat = items.filter((item) => item.outcome === "flat").length;
      const resolved = profitable + loss + flat;

      return {
        status,
        label: getOpeningRecheckStatusMeta(status).label,
        count: items.length,
        profitableCount: profitable,
        lossCount: loss,
        flatCount: flat,
        winRate: resolved ? Math.round((profitable / resolved) * 100) : 0,
        note:
          status === "passed"
            ? `통과로 본 거래 ${items.length}건 중 ${profitable}건이 수익 종료로 이어졌습니다.`
            : status === "watch"
              ? `관찰 유지로 둔 거래 ${items.length}건의 후속 결과를 묶어 봅니다.`
              : `보류/제외인데도 실제 진입한 거래 ${items.length}건입니다.`
      } satisfies PortfolioOpeningCheckStatusInsight;
    })
    .filter((item): item is PortfolioOpeningCheckStatusInsight => item !== null);

  const patterns = Array.from(
    matched.reduce((map, item) => {
      if (!item.decision.checklist) {
        return map;
      }

      const checklist = item.decision.checklist;
      const id = `${checklist.gap}:${checklist.confirmation}:${checklist.action}`;
      const current = map.get(id) ?? [];
      current.push(item);
      map.set(id, current);
      return map;
    }, new Map<string, typeof matched>())
  )
    .map(([id, items]) => {
      const checklist = items[0]?.decision.checklist;
      if (!checklist) {
        return null;
      }

      const profitable = items.filter((item) => item.outcome === "success").length;
      const loss = items.filter((item) => item.outcome === "failure").length;
      const flat = items.filter((item) => item.outcome === "flat").length;
      const resolved = profitable + loss + flat;

      return {
        id,
        title: [
          getOpeningGapMeta(checklist.gap).label,
          getOpeningConfirmationMeta(checklist.confirmation).label,
          getOpeningActionIntentMeta(checklist.action).label
        ].join(" · "),
        count: items.length,
        profitableCount: profitable,
        lossCount: loss,
        flatCount: flat,
        winRate: resolved ? Math.round((profitable / resolved) * 100) : 0,
        note: `${items.length}건 중 ${profitable}건 수익, ${loss}건 손실 종료`
      } satisfies PortfolioOpeningCheckPatternInsight;
    })
    .filter((item): item is PortfolioOpeningCheckPatternInsight => item !== null)
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return right.winRate - left.winRate;
    })
    .slice(0, 4);

  const behaviorImpactDefinitions = [
    {
      key: "passed" as const,
      label: "통과 후 진입",
      matcher: (status: OpeningRecheckStatus) => status === "passed",
      note: "장초 통과 뒤 실제 진입으로 이어진 종료 거래"
    },
    {
      key: "watch" as const,
      label: "관찰 후 진입",
      matcher: (status: OpeningRecheckStatus) => status === "watch",
      note: "관찰 유지 뒤 실제로 진입한 종료 거래"
    },
    {
      key: "override" as const,
      label: "보류 강행 진입",
      matcher: (status: OpeningRecheckStatus) => status === "avoid" || status === "excluded",
      note: "보류 또는 제외 판단을 넘기고 진입한 종료 거래"
    }
  ];

  const behaviorImpacts = behaviorImpactDefinitions
    .map((definition) => {
      const items = matched.filter((item) => definition.matcher(item.decision.status));
      if (!items.length) {
        return {
          key: definition.key,
          label: definition.label,
          count: 0,
          realizedPnl: 0,
          averagePnl: 0,
          winRate: 0,
          note: definition.note,
          tone: definition.key === "override" ? "caution" : "neutral"
        } satisfies PortfolioOpeningCheckBehaviorImpact;
      }

      const profitable = items.filter((item) => item.outcome === "success").length;
      const realizedPnl = items.reduce((sum, item) => sum + item.group.metrics.realizedPnl, 0);
      const averagePnl = Math.round(realizedPnl / items.length);

      return {
        key: definition.key,
        label: definition.label,
        count: items.length,
        realizedPnl,
        averagePnl,
        winRate: roundRatio(profitable, items.length),
        note: definition.note,
        tone:
          definition.key === "override"
            ? realizedPnl < 0
              ? "caution"
              : "neutral"
            : realizedPnl > 0
              ? "positive"
              : realizedPnl < 0
                ? "caution"
                : "neutral"
      } satisfies PortfolioOpeningCheckBehaviorImpact;
    })
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return right.realizedPnl - left.realizedPnl;
    });

  return {
    headline: "장초 판단과 실제 종료 결과를 함께 복기합니다.",
    summary:
      overrideCount > 0
        ? `보류/제외인데도 진입한 거래가 ${overrideCount}건 있어, 장초 판단과 실제 행동 차이를 같이 보는 편이 좋습니다.`
        : "장초에 어떤 판단을 했고, 그 판단이 실제 종료 결과와 어떻게 이어졌는지 바로 읽을 수 있습니다.",
    matchedCount,
    unmatchedCount,
    overrideCount,
    profitableCount,
    lossCount,
    statusInsights,
    patterns,
    behaviorImpacts
  };
}
