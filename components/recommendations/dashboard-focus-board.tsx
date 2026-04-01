import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Clock3, ShieldAlert, Target } from "lucide-react";

import { OpeningCheckReviewCard } from "@/components/recommendations/opening-check-review-card";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFeaturedRankLabel } from "@/lib/copy/action-language";
import type {
  DailyScanSummaryDto,
  HoldingActionBoardDto,
  HoldingActionStatusDto,
  OpeningRecheckReviewDto,
  TodayActionBoardDto,
  TodayActionBoardItemDto,
  TodayActionSummaryDto
} from "@/lib/api-contracts/swing-radar";
import { formatPrice } from "@/lib/utils";

const holdingPriority: HoldingActionStatusDto[] = [
  "exit_review",
  "take_profit",
  "tighten_stop",
  "time_stop_review"
];

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
    pendingItems: candidates.filter((item) => (item.openingRecheck?.status ?? "pending") === "pending")
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
  openingReview
}: {
  summary?: TodayActionSummaryDto;
  todayActionBoard?: TodayActionBoardDto;
  holdingActionBoard?: HoldingActionBoardDto;
  dailyScan: DailyScanSummaryDto | null;
  openingReview?: OpeningRecheckReviewDto;
}) {
  const buyReviewItems = getBuyReviewItems(todayActionBoard);
  const holdingAttentionItems = getHoldingAttentionItems(holdingActionBoard);
  const openingSummary = getOpeningCheckSummary(dailyScan);
  const remainingSlots = todayActionBoard?.summary.remainingPortfolioSlots ?? 0;
  const remainingNewPositions = todayActionBoard?.summary.remainingNewPositions ?? summary?.maxNewPositions ?? 0;

  return (
    <section className="space-y-4">
      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-3">
              <p className="eyebrow-label">Today Dashboard</p>
              <CardTitle className="text-[clamp(1.8rem,2.5vw,2.4rem)] text-foreground">
                {summary?.marketStanceLabel ?? "오늘 먼저 할 일을 확인하세요"}
              </CardTitle>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                {summary?.summary ??
                  "Today는 오늘 바로 해야 할 행동만 남기는 화면입니다. 장초 확인, 오늘 매수 검토, 보유 우선 관리 순서로만 움직이면 됩니다."}
              </p>
            </div>

            <Badge variant={todayActionBoard?.summary.buyReviewCount ? "positive" : "secondary"}>
              {todayActionBoard?.summary.headline ?? "오늘 행동 기준"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <ActionStepCard
              href="/opening-check"
              title="장초 확인 시작"
              count={formatQueueCount(openingSummary.counts.pending)}
              description="오늘 먼저 볼 종목을 하나씩 체크하고 저장합니다."
              note="통과한 종목만 오늘 매수 검토로 넘어갑니다."
              accent="primary"
              icon={<Clock3 className="h-4 w-4" />}
            />
            <ActionStepCard
              href={buyReviewItems[0] ? `/analysis/${buyReviewItems[0].ticker}` : "/opening-check"}
              title="오늘 매수 검토"
              count={formatQueueCount(buyReviewItems.length)}
              description="실제로 다시 볼 종목만 남긴 영역입니다."
              note={buyReviewItems.length ? "첫 종목 분석으로 바로 이동할 수 있습니다." : "장초 확인을 끝내면 이 영역이 채워집니다."}
              accent={buyReviewItems.length ? "positive" : "muted"}
              icon={<Target className="h-4 w-4" />}
            />
            <ActionStepCard
              href="/portfolio"
              title="보유 우선 관리"
              count={formatQueueCount(getHoldingAttentionCount(holdingActionBoard))}
              description="즉시 점검, 익절, 시간 점검이 필요한 보유 종목입니다."
              note="체결 기록과 보유 관리는 Portfolio에서 이어집니다."
              accent={holdingAttentionItems.length ? "caution" : "muted"}
              icon={<ShieldAlert className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="오늘 매수 검토" value={formatQueueCount(todayActionBoard?.summary.buyReviewCount ?? 0)} />
            <MetricCard label="장초 확인 대기" value={formatQueueCount(openingSummary.counts.pending)} />
            <MetricCard
              label="가용 현금"
              value={
                typeof todayActionBoard?.summary.availableCash === "number"
                  ? formatPrice(todayActionBoard.summary.availableCash)
                  : "확인 필요"
              }
            />
            <MetricCard label="남은 슬롯" value={`${formatQueueCount(remainingNewPositions)} / ${formatQueueCount(remainingSlots)}`} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">오늘 매수 검토</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">오늘 실제로 다시 볼 종목만 남긴 영역입니다.</p>
                </div>
              </div>
              <Badge variant={buyReviewItems.length ? "positive" : "secondary"}>{formatQueueCount(buyReviewItems.length)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {buyReviewItems.length ? (
              <div className="space-y-3">
                {buyReviewItems.map((item) => (
                  <Link
                    key={item.ticker}
                    href={`/analysis/${item.ticker}`}
                    className="block rounded-[24px] border border-border/70 bg-secondary/20 p-4 transition hover:border-primary/35 hover:bg-secondary/35"
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
                      </div>
                      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <DashboardEmptyState message="아직 오늘 실제 매수 검토로 확정된 종목이 없습니다." />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-border/70 bg-white/82 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/35 text-foreground/75">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-foreground">보유 우선 관리</CardTitle>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">지금 먼저 손봐야 하는 보유 종목입니다.</p>
                  </div>
                </div>
                <Badge variant={holdingAttentionItems.length ? "caution" : "secondary"}>
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
                        className="block rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-3 transition hover:border-primary/35 hover:bg-secondary/35"
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

          <Card className="border-border/70 bg-white/82 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/35 text-foreground/75">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-foreground">장초 확인 대기</CardTitle>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">아침에 하나씩 확인하고 넘기면 됩니다.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={openingSummary.counts.pending ? "neutral" : "secondary"}>
                    {formatQueueCount(openingSummary.counts.pending)}
                  </Badge>
                  <Link
                    href="/opening-check"
                    className="inline-flex h-9 items-center rounded-full border border-primary/20 bg-primary/8 px-3 text-xs font-medium text-primary transition hover:bg-primary/12"
                  >
                    열기
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
                      className="block rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-3 transition hover:border-primary/35 hover:bg-secondary/35"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {item.company} <span className="text-xs font-medium text-muted-foreground">{item.ticker}</span>
                      </p>
                      <p className="mt-2 text-sm leading-6 text-foreground/82">{item.tradePlan?.nextStep ?? item.rationale}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <DashboardEmptyState message="상단 후보의 장초 확인은 대부분 끝났습니다." />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <details className="group rounded-[28px] border border-border/70 bg-white/82 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-sm font-semibold text-foreground">오늘 보조 정보</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              회고와 세부 수치는 필요할 때만 펼쳐서 봅니다.
            </p>
          </div>
          <span className="rounded-full border border-border/70 bg-secondary/35 px-3 py-1 text-xs font-medium text-foreground/78 transition group-open:bg-primary/10 group-open:text-primary">
            펼치기
          </span>
        </summary>
        <div className="space-y-4 border-t border-border/70 px-5 pb-5 pt-4">
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

function ActionStepCard({
  href,
  title,
  count,
  description,
  note,
  accent,
  icon
}: {
  href: string;
  title: string;
  count: string;
  description: string;
  note: string;
  accent: "primary" | "positive" | "caution" | "muted";
  icon: ReactNode;
}) {
  const toneByAccent = {
    primary: "border-primary/25 bg-primary text-primary-foreground hover:bg-primary/92",
    positive: "border-positive/25 bg-positive/10 text-positive hover:bg-positive/15",
    caution: "border-caution/25 bg-caution/10 text-caution hover:bg-caution/15",
    muted: "border-border/70 bg-secondary/20 text-foreground hover:border-primary/25 hover:bg-secondary/35"
  } as const;

  return (
    <Link
      href={href}
      className={`rounded-[24px] border p-4 shadow-sm transition ${toneByAccent[accent]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {icon}
            <span>{title}</span>
          </div>
          <p className="text-2xl font-semibold tracking-[-0.04em]">{count}</p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0" />
      </div>
      <p className="mt-3 text-sm leading-6">{description}</p>
      <p className="mt-2 text-xs leading-5 opacity-80">{note}</p>
    </Link>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DashboardEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}
