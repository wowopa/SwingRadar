import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Clock3, ShieldAlert, Target } from "lucide-react";

import { OpeningCheckReviewCard } from "@/components/recommendations/opening-check-review-card";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFeaturedRankLabel } from "@/lib/copy/action-language";
import { buildGoogleQuoteSearchUrl, buildNaverFinanceUrl } from "@/lib/market-links";
import type {
  DailyScanSummaryDto,
  HoldingActionBoardDto,
  HoldingActionStatusDto,
  OpeningCheckLearningInsightDto,
  OpeningCheckPositivePatternDto,
  OpeningRecheckReviewDto,
  PersonalRuleAlertDto,
  PersonalRuleReminderDto,
  StrategyPerformanceHintDto,
  TodayActionBoardDto,
  TodayActionBoardItemDto,
  TodayActionBoardSummaryDto,
  TodayActionSummaryDto
} from "@/lib/api-contracts/swing-radar";
import { cn, formatPrice } from "@/lib/utils";

const holdingPriority: HoldingActionStatusDto[] = [
  "exit_review",
  "take_profit",
  "tighten_stop",
  "time_stop_review"
];

type SetupStepState = "done" | "action" | "optional";

interface SetupStep {
  key: string;
  title: string;
  href: string;
  cta: string;
  state: SetupStepState;
}

function formatQueueCount(value: number, suffix = "개") {
  return `${value}${suffix}`;
}

function getOpeningCheckSummary(dailyScan: DailyScanSummaryDto | null) {
  const candidates = dailyScan?.openingCheckCandidates ?? dailyScan?.topCandidates ?? [];
  const counts = {
    pending: 0,
    passed: 0,
    watch: 0,
    avoid: 0,
    excluded: 0
  };

  for (const item of candidates) {
    const status = item.openingRecheck?.status ?? "pending";
    counts[status] += 1;
  }

  return {
    counts,
    completedCount: counts.passed + counts.watch + counts.avoid + counts.excluded,
    pendingItems: candidates.filter((item) => (item.openingRecheck?.status ?? "pending") === "pending")
  };
}

function hasPortfolioSettings(summary?: TodayActionBoardSummaryDto) {
  if (!summary) {
    return false;
  }

  return (
    Boolean(summary.portfolioProfileName) ||
    typeof summary.availableCash === "number" ||
    typeof summary.riskBudgetPerTrade === "number"
  );
}

function buildSetupChecklist(
  todayActionBoard: TodayActionBoardDto | undefined,
  holdingActionBoard: HoldingActionBoardDto | undefined,
  openingSummary: ReturnType<typeof getOpeningCheckSummary>
) {
  const portfolioReady = hasPortfolioSettings(todayActionBoard?.summary);
  const holdingCount = holdingActionBoard?.summary.holdingCount ?? 0;
  const openingChecked = openingSummary.completedCount > 0;

  const steps: SetupStep[] = [
    {
      key: "assets",
      title: "자산 설정",
      href: "/portfolio?asset-settings=1",
      cta: "자산 설정 열기",
      state: portfolioReady ? "done" : "action"
    },
    {
      key: "holdings",
      title: "보유 종목 확인",
      href: "/portfolio?asset-settings=1",
      cta: "보유 종목 입력",
      state: holdingCount > 0 ? "done" : portfolioReady ? "optional" : "action"
    },
    {
      key: "opening-check",
      title: "장초 확인 시작",
      href: "/opening-check",
      cta: "장초 확인으로 이동",
      state: openingChecked ? "done" : "action"
    }
  ];

  return {
    steps,
    doneCount: steps.filter((step) => step.state === "done").length,
    needsSetupChecklist: steps.some((step) => step.state === "action")
  };
}

function getHoldingAttentionItems(board?: HoldingActionBoardDto) {
  if (!board) {
    return [];
  }

  return holdingPriority
    .flatMap((status) => board.sections.find((section) => section.status === status)?.items ?? [])
    .slice(0, 3);
}

function getHoldingAttentionCount(board?: HoldingActionBoardDto) {
  if (!board) {
    return 0;
  }

  return (
    (board.summary.exitReviewCount ?? 0) +
    (board.summary.takeProfitCount ?? 0) +
    (board.summary.tightenStopCount ?? 0) +
    (board.summary.timeStopReviewCount ?? 0)
  );
}

function getBuyReviewItems(board?: TodayActionBoardDto) {
  return board?.sections.find((section) => section.status === "buy_review")?.items.slice(0, 2) ?? [];
}

function buildBuyReviewNote(item: TodayActionBoardItemDto) {
  const plan = item.tradePlan;
  if (!plan) {
    return item.boardReason;
  }

  return `진입 ${plan.entryLabel} / 손절 ${plan.stopLabel}`;
}

function buildBuyReviewSizing(item: TodayActionBoardItemDto) {
  const sizing = item.tradePlan?.positionSizing;
  if (!sizing || sizing.suggestedQuantity <= 0) {
    return null;
  }

  return `${formatPrice(sizing.suggestedCapital)} · ${sizing.suggestedWeightPercent.toFixed(1)}% · ${new Intl.NumberFormat(
    "ko-KR"
  ).format(sizing.suggestedQuantity)}주`;
}

function buildHoldingBadge(status: HoldingActionStatusDto) {
  if (status === "exit_review") {
    return { label: "즉시 점검", variant: "caution" as const };
  }

  if (status === "take_profit") {
    return { label: "부분 익절", variant: "positive" as const };
  }

  if (status === "tighten_stop") {
    return { label: "보호 가격 상향", variant: "neutral" as const };
  }

  return { label: "시간 점검", variant: "secondary" as const };
}

export function DashboardFocusBoard({
  summary,
  todayActionBoard,
  holdingActionBoard,
  dailyScan,
  openingCheckLearning,
  openingCheckPositivePattern,
  strategyPerformanceHint,
  personalRuleReminder,
  personalRuleAlert,
  openingReview,
  openingCheckCompleted = false
}: {
  summary?: TodayActionSummaryDto;
  todayActionBoard?: TodayActionBoardDto;
  holdingActionBoard?: HoldingActionBoardDto;
  dailyScan: DailyScanSummaryDto | null;
  openingCheckLearning?: OpeningCheckLearningInsightDto;
  openingCheckPositivePattern?: OpeningCheckPositivePatternDto;
  strategyPerformanceHint?: StrategyPerformanceHintDto;
  personalRuleReminder?: PersonalRuleReminderDto;
  personalRuleAlert?: PersonalRuleAlertDto;
  openingReview?: OpeningRecheckReviewDto;
  openingCheckCompleted?: boolean;
}) {
  const buyReviewItems = getBuyReviewItems(todayActionBoard);
  const holdingAttentionItems = getHoldingAttentionItems(holdingActionBoard);
  const openingSummary = getOpeningCheckSummary(dailyScan);
  const setupChecklist = buildSetupChecklist(todayActionBoard, holdingActionBoard, openingSummary);
  const hasPendingOpeningChecks = openingSummary.counts.pending > 0;
  const hasRuleAlert = Boolean(personalRuleAlert);
  const openingSummaryLine = hasRuleAlert
    ? "반복 위반 경고가 있어 오늘은 저장 전 규칙을 다시 확인합니다."
    : personalRuleReminder
    ? "최근 회고 규칙을 먼저 확인하고 저장합니다."
    : "3개 체크 후 저장하고 다음 종목으로 넘어갑니다.";
  const buyReviewCaption = hasRuleAlert
    ? "장초 확인과 경고 해소 후 검토"
    : personalRuleReminder
    ? "장초 확인과 내 규칙 통과 종목"
    : buyReviewItems.length
      ? "장초 확인 통과 종목"
      : "장초 확인 후 채워집니다";
  const buyReviewSummaryLine =
    hasRuleAlert && hasPendingOpeningChecks
      ? "반복 위반 경고가 있어 장초 확인 저장을 먼저 마친 뒤 검토합니다."
      : personalRuleReminder && hasPendingOpeningChecks
      ? "장초 확인과 개인 규칙 점검이 끝난 뒤 검토합니다."
      : buyReviewItems.length
        ? "가장 먼저 검토할 종목으로 바로 이동합니다."
        : "아직 남은 종목이 없습니다.";
  const buyReviewAccent =
    hasRuleAlert && hasPendingOpeningChecks
      ? "muted"
      : personalRuleReminder && hasPendingOpeningChecks
      ? "muted"
      : buyReviewItems.length
        ? "positive"
        : "muted";

  return (
    <section className="space-y-4">
      <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-34px_rgba(24,32,42,0.28)]">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="eyebrow-label">Today</p>
              <h3 className="text-[clamp(1.8rem,2.6vw,2.5rem)] font-semibold tracking-[-0.05em] text-foreground">
                {summary?.marketStanceLabel ?? "내 오늘 행동"}
              </h3>
            </div>
            <Badge variant={todayActionBoard?.summary.buyReviewCount ? "positive" : "secondary"}>
              {todayActionBoard?.summary.headline ?? "오늘 행동 기준"}
            </Badge>
          </div>

          {setupChecklist.needsSetupChecklist ? (
            <CompactSetupBanner steps={setupChecklist.steps} />
          ) : openingCheckCompleted ? (
            <CompactCompletionBanner hasBuyReview={buyReviewItems.length > 0} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">공통 후보를 내 계좌 기준 행동으로 압축했습니다</Badge>
              <Badge variant="neutral">지금은 아래 3가지만 먼저 보면 됩니다</Badge>
            </div>
          )}

          {openingCheckLearning ? <CompactLearningBanner insight={openingCheckLearning} /> : null}
          {openingCheckPositivePattern ? (
            <CompactPositivePatternBanner pattern={openingCheckPositivePattern} />
          ) : null}
          {strategyPerformanceHint ? (
            <CompactStrategyPerformanceBanner hint={strategyPerformanceHint} />
          ) : null}
          {personalRuleAlert ? <PersonalRuleAlertBanner alert={personalRuleAlert} /> : null}
          {personalRuleReminder ? <CompactRuleReminderBanner reminder={personalRuleReminder} /> : null}

          <div className="grid gap-3 xl:grid-cols-3">
            <PrimaryActionCard
              href="/opening-check"
              title="장초 확인"
              count={formatQueueCount(openingSummary.counts.pending)}
              caption="오늘 먼저 볼 종목"
              summaryLine={openingSummaryLine}
              accent="primary"
              icon={<Clock3 className="h-4 w-4" />}
            />
            <PrimaryActionCard
              href={buyReviewItems[0] ? `/analysis/${buyReviewItems[0].ticker}` : "/opening-check"}
              title="오늘 매수 검토"
              count={formatQueueCount(buyReviewItems.length)}
              caption={buyReviewCaption}
              summaryLine={buyReviewSummaryLine}
              accent={buyReviewAccent}
              icon={<Target className="h-4 w-4" />}
            />
            <PrimaryActionCard
              href="/portfolio"
              title="보유 관리"
              count={formatQueueCount(getHoldingAttentionCount(holdingActionBoard))}
              caption={holdingAttentionItems.length ? "우선 점검이 필요한 보유 종목" : "지금 급한 보유 종목은 없습니다"}
              summaryLine="즉시 점검, 익절, 시간 점검은 Portfolio에서 이어집니다."
              accent={holdingAttentionItems.length ? "caution" : "muted"}
              icon={<ShieldAlert className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      <details className="group rounded-[28px] border border-border/80 bg-white/90 shadow-[0_18px_46px_-32px_rgba(24,32,42,0.2)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-sm font-semibold text-foreground">세부 목록 보기</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">매수 검토 후보, 보유 점검 종목, 장초 확인 남은 종목을 자세히 봅니다.</p>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-1 text-xs font-medium text-foreground/78 transition group-open:border-primary/24 group-open:bg-primary/10 group-open:text-primary">
            펼치기
          </span>
        </summary>
        <div className="space-y-4 border-t border-border/70 px-5 pb-5 pt-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <Card id="today-buy-review" className="border-border/80 bg-white/90 shadow-[0_18px_46px_-32px_rgba(24,32,42,0.22)]">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-foreground">오늘 매수 검토</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">장초 확인을 통과한 종목만 남깁니다.</p>
                    </div>
                  </div>
                  <Badge
                    variant={buyReviewItems.length ? "positive" : "secondary"}
                    className="shrink-0 whitespace-nowrap"
                  >
                    {formatQueueCount(buyReviewItems.length)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {buyReviewItems.length ? (
                  <div className="space-y-3">
                    {buyReviewItems.map((item) => (
                      <div
                        key={item.ticker}
                        className="block rounded-[24px] border border-border/80 bg-[hsl(42_38%_97%)] p-4 transition hover:border-primary/28 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {item.company} <span className="text-xs font-medium text-muted-foreground">{item.ticker}</span>
                              </p>
                              <SignalToneBadge tone={item.signalTone} />
                              {item.featuredRank ? <Badge variant="secondary">{getFeaturedRankLabel(item.featuredRank)}</Badge> : null}
                            </div>
                            <p className="mt-3 text-sm leading-6 text-foreground/82">{buildBuyReviewNote(item)}</p>
                            {buildBuyReviewSizing(item) ? (
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">{buildBuyReviewSizing(item)}</p>
                            ) : null}
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.boardReason}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Link
                                href={`/analysis/${item.ticker}`}
                                className="inline-flex h-8 items-center rounded-full border border-primary/24 bg-primary/10 px-3 text-xs font-medium text-primary transition hover:bg-primary/14"
                              >
                                상세 보기
                              </Link>
                              <a
                                href={buildNaverFinanceUrl(item.ticker)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 items-center rounded-full border border-border/80 bg-white px-3 text-xs font-medium text-foreground/78 transition hover:border-primary/24 hover:text-primary"
                              >
                                네이버 금융
                              </a>
                              <a
                                href={buildGoogleQuoteSearchUrl(item.company, item.ticker)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 items-center rounded-full border border-border/80 bg-white px-3 text-xs font-medium text-foreground/78 transition hover:border-primary/24 hover:text-primary"
                              >
                                구글에서 보기
                              </a>
                            </div>
                          </div>
                          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <DashboardEmptyState message="아직 실제 매수 검토로 확정된 종목이 없습니다." />
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card id="today-holding-review" className="border-border/80 bg-white/90 shadow-[0_18px_46px_-32px_rgba(24,32,42,0.22)]">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--caution)/0.12)] text-caution">
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-foreground">보유 우선 관리</CardTitle>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">먼저 확인할 보유 종목입니다.</p>
                      </div>
                    </div>
                    <Badge
                      variant={holdingAttentionItems.length ? "caution" : "secondary"}
                      className="shrink-0 whitespace-nowrap"
                    >
                      {formatQueueCount(getHoldingAttentionCount(holdingActionBoard))}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {holdingAttentionItems.length ? (
                    <div className="space-y-3">
                      {holdingAttentionItems.map((item) => {
                        const actionBadge = buildHoldingBadge(item.actionStatus);

                        return (
                          <Link
                            key={item.ticker}
                            href="/portfolio"
                            className="block rounded-[22px] border border-border/80 bg-[hsl(42_38%_97%)] px-4 py-3 transition hover:border-primary/28 hover:bg-white"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">
                                    {item.company} <span className="text-xs font-medium text-muted-foreground">{item.ticker}</span>
                                  </p>
                                  <Badge variant={actionBadge.variant}>{actionBadge.label}</Badge>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-foreground/82">{item.nextAction}</p>
                                <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.actionReason}</p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <DashboardEmptyState message="지금 즉시 점검이 필요한 보유 종목은 많지 않습니다." />
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-white/90 shadow-[0_18px_46px_-32px_rgba(24,32,42,0.22)]">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--neutral)/0.14)] text-neutral">
                        <Clock3 className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-foreground">장초 확인 대기</CardTitle>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">아직 확인이 남아 있는 종목입니다.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={openingSummary.counts.pending ? "neutral" : "secondary"}
                        className="shrink-0 whitespace-nowrap"
                      >
                        {formatQueueCount(openingSummary.counts.pending)}
                      </Badge>
                      <Link
                        href="/opening-check"
                        className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border border-primary/24 bg-primary/10 px-3.5 text-xs font-medium text-primary transition hover:bg-primary/14"
                      >
                        시작하기
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {openingSummary.pendingItems.length ? (
                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {openingSummary.pendingItems.map((item) => (
                        <Link
                          key={item.ticker}
                          href={`/opening-check?ticker=${item.ticker}`}
                          className="block rounded-[22px] border border-border/80 bg-[hsl(42_38%_97%)] px-4 py-3 transition hover:border-primary/28 hover:bg-white"
                        >
                          <p className="text-sm font-semibold text-foreground">
                            {item.company} <span className="text-xs font-medium text-muted-foreground">{item.ticker}</span>
                          </p>
                          <p className="mt-2 text-sm leading-6 text-foreground/82">{item.tradePlan?.nextStep ?? item.rationale}</p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <DashboardEmptyState message="상단 후보의 장초 확인이 대부분 끝났습니다." />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="통과" value={formatQueueCount(openingSummary.counts.passed)} />
            <MetricCard label="관찰 유지" value={formatQueueCount(openingSummary.counts.watch)} />
            <MetricCard label="추격 금지" value={formatQueueCount(openingSummary.counts.avoid)} />
            <MetricCard label="제외" value={formatQueueCount(openingSummary.counts.excluded)} />
          </div>

          <OpeningCheckReviewCard review={openingReview} />
        </div>
      </details>
    </section>
  );
}

function PersonalRuleAlertBanner({ alert }: { alert: PersonalRuleAlertDto }) {
  return (
    <div className="rounded-[24px] border border-caution/28 bg-[linear-gradient(145deg,hsl(var(--caution)/0.14),rgba(255,255,255,0.92))] px-4 py-4 shadow-[0_18px_44px_-34px_rgba(199,74,71,0.34)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="caution" className="whitespace-nowrap">
              반복 위반 경고
            </Badge>
            <p className="text-sm font-semibold text-foreground">{alert.headline}</p>
          </div>
          <p className="text-sm leading-6 text-foreground/88">{alert.detail}</p>
          <p className="text-xs leading-5 text-muted-foreground">{alert.statLine}</p>
        </div>
        <Link
          href={alert.ctaHref}
          className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border border-caution/28 bg-white/90 px-3.5 text-xs font-medium text-caution transition hover:bg-[hsl(var(--caution)/0.08)]"
        >
          {alert.ctaLabel}
        </Link>
      </div>
    </div>
  );
}

function CompactSetupBanner({ steps }: { steps: SetupStep[] }) {
  return (
    <div className="rounded-[24px] border border-primary/24 bg-primary/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral" className="whitespace-nowrap">
          시작 전 준비
        </Badge>
        {steps.map((step) => (
          <Link
            key={step.key}
            href={step.href}
            className={cn(
              "inline-flex h-9 items-center whitespace-nowrap rounded-full border px-3 text-xs font-medium transition",
              step.state === "done"
                ? "border-positive/24 bg-[hsl(var(--positive)/0.12)] text-positive"
                : step.state === "optional"
                  ? "border-border/80 bg-[hsl(42_40%_97%)] text-foreground/76 hover:border-primary/24 hover:bg-white"
                  : "border-primary/24 bg-white text-primary hover:bg-primary/6"
            )}
          >
            {step.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

function CompactCompletionBanner({ hasBuyReview }: { hasBuyReview: boolean }) {
  return (
    <div className="rounded-[24px] border border-positive/30 bg-[hsl(var(--positive)/0.12)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="positive" className="whitespace-nowrap">
            장초 확인 완료
          </Badge>
          <span className="text-sm text-foreground/82">이제 실제 매수 검토와 보유 관리만 보면 됩니다.</span>
        </div>
        <Link
          href={hasBuyReview ? "#today-buy-review" : "#today-holding-review"}
          className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border border-positive/24 bg-white px-3 text-xs font-medium text-positive transition hover:bg-[hsl(var(--positive)/0.08)]"
        >
          {hasBuyReview ? "매수 검토 보기" : "보유 관리 보기"}
        </Link>
      </div>
    </div>
  );
}

function CompactLearningBanner({ insight }: { insight: OpeningCheckLearningInsightDto }) {
  return (
    <div className="rounded-[24px] border border-primary/18 bg-primary/8 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="whitespace-nowrap">
          최근 장초 학습
        </Badge>
        <p className="text-sm font-medium text-foreground">{insight.headline}</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{insight.primaryLesson}</p>
      {insight.secondaryLesson ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground/90">{insight.secondaryLesson}</p>
      ) : null}
    </div>
  );
}

function CompactPositivePatternBanner({ pattern }: { pattern: OpeningCheckPositivePatternDto }) {
  return (
    <div className="rounded-[24px] border border-positive/24 bg-[hsl(var(--positive)/0.1)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="positive" className="whitespace-nowrap">
          최근 잘 맞은 조합
        </Badge>
        <p className="text-sm font-medium text-foreground">{pattern.headline}</p>
      </div>
      <p className="mt-1 text-sm text-foreground/88">{pattern.detail}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {pattern.title} · {pattern.count}건 · 승률 {pattern.winRate}%
      </p>
    </div>
  );
}

function CompactStrategyPerformanceBanner({ hint }: { hint: StrategyPerformanceHintDto }) {
  return (
    <div className="rounded-[24px] border border-primary/20 bg-[hsl(var(--primary)/0.08)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral" className="whitespace-nowrap">
          최근 잘 맞은 전략
        </Badge>
        <p className="text-sm font-medium text-foreground">{hint.headline}</p>
      </div>
      <p className="mt-1 text-sm text-foreground/88">{hint.detail}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {hint.label} · {hint.count}건 · 승률 {hint.winRate}% · {formatPrice(hint.realizedPnl)}
      </p>
    </div>
  );
}

function CompactRuleReminderBanner({ reminder }: { reminder: PersonalRuleReminderDto }) {
  return (
    <div className="rounded-[24px] border border-caution/24 bg-[hsl(var(--caution)/0.1)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="caution" className="whitespace-nowrap">
          내 규칙 우선
        </Badge>
        <p className="text-sm font-medium text-foreground">{reminder.headline}</p>
      </div>
      <p className="mt-1 text-sm text-foreground/88">{reminder.primaryRule}</p>
      {reminder.secondaryRules.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {reminder.secondaryRules.map((rule) => (
            <span
              key={rule}
              className="rounded-full border border-caution/24 bg-white/88 px-2.5 py-1 text-[11px] leading-5 text-foreground/78"
            >
              {rule}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{reminder.note}</p>
    </div>
  );
}

function PrimaryActionCard({
  href,
  title,
  count,
  caption,
  summaryLine,
  accent,
  icon
}: {
  href: string;
  title: string;
  count: string;
  caption: string;
  summaryLine: string;
  accent: "primary" | "positive" | "caution" | "muted";
  icon: ReactNode;
}) {
  const toneByAccent = {
    primary:
      "border-primary/28 bg-[linear-gradient(145deg,rgba(24,32,42,0.98),rgba(34,41,54,0.94))] text-primary-foreground shadow-[0_24px_56px_-34px_rgba(24,32,42,0.7)] hover:-translate-y-0.5 hover:border-primary/46",
    positive:
      "border-positive/28 bg-[hsl(var(--positive)/0.09)] text-foreground hover:-translate-y-0.5 hover:border-positive/42 hover:bg-[hsl(var(--positive)/0.15)]",
    caution:
      "border-caution/28 bg-[hsl(var(--caution)/0.08)] text-foreground hover:-translate-y-0.5 hover:border-caution/42 hover:bg-[hsl(var(--caution)/0.14)]",
    muted:
      "border-border/80 bg-[hsl(42_40%_96%)] text-foreground hover:-translate-y-0.5 hover:border-primary/28 hover:bg-white"
  } as const;
  const isPrimary = accent === "primary";

  return (
    <Link href={href} className={`rounded-[24px] border p-5 shadow-sm transition ${toneByAccent[accent]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {icon}
            <span>{title}</span>
          </div>
          <p className="text-[clamp(2rem,4vw,2.8rem)] font-semibold tracking-[-0.05em]">{count}</p>
        </div>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0" />
      </div>
      <p className={cn("mt-3 text-sm font-medium", isPrimary ? "text-primary-foreground/88" : "text-foreground/88")}>{caption}</p>
      <p className={cn("mt-2 text-xs leading-5", isPrimary ? "text-primary-foreground/72" : "text-muted-foreground")}>{summaryLine}</p>
    </Link>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border/80 bg-[hsl(42_40%_97%)] p-4">
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DashboardEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[22px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}
