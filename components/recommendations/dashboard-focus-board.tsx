import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Compass,
  ShieldAlert,
  Target,
  WalletCards
} from "lucide-react";

import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DailyScanSummaryDto,
  HoldingActionBoardDto,
  HoldingActionStatusDto,
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
  const candidates = dailyScan?.topCandidates.slice(0, 6) ?? [];
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
    pendingItems: candidates.filter((item) => (item.openingRecheck?.status ?? "pending") === "pending").slice(0, 3)
  };
}

function getBuyReviewItems(board?: TodayActionBoardDto) {
  return board?.sections.find((section) => section.status === "buy_review")?.items.slice(0, 2) ?? [];
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

function getSummaryMetrics({
  summary,
  todayActionBoard,
  holdingActionBoard,
  openingSummary
}: {
  summary?: TodayActionSummaryDto;
  todayActionBoard?: TodayActionBoardDto;
  holdingActionBoard?: HoldingActionBoardDto;
  openingSummary: ReturnType<typeof getOpeningCheckSummary>;
}) {
  return [
    {
      title: "오늘 매수 검토",
      value: formatQueueCount(todayActionBoard?.summary.buyReviewCount ?? 0),
      note: "오늘 실제로 새로 검토할 종목"
    },
    {
      title: "보유 우선 관리",
      value: formatQueueCount(getHoldingAttentionCount(holdingActionBoard)),
      note: "손절, 익절, 시간 점검이 필요한 보유"
    },
    {
      title: "장초 확인 대기",
      value: formatQueueCount(openingSummary.counts.pending),
      note: "장 시작 후 확인이 아직 남은 후보"
    },
    {
      title: "가용 현금",
      value:
        typeof todayActionBoard?.summary.availableCash === "number"
          ? formatPrice(todayActionBoard.summary.availableCash)
          : formatQueueCount(todayActionBoard?.summary.activeHoldingCount ?? 0),
      note:
        typeof todayActionBoard?.summary.availableCash === "number"
          ? "권장 수량 계산 기준"
          : "현재 관리 중인 보유 종목 수"
    },
    {
      title: "신규 매수 여유",
      value: formatQueueCount(todayActionBoard?.summary.remainingNewPositions ?? summary?.maxNewPositions ?? 0),
      note: "오늘 추가로 열 수 있는 신규 포지션"
    },
    {
      title: "포트폴리오 슬롯",
      value: formatQueueCount(todayActionBoard?.summary.remainingPortfolioSlots ?? 0),
      note: "동시 관리 한도 안에서 남은 자리"
    }
  ];
}

function buildBuyReviewNote(item: TodayActionBoardItemDto) {
  const plan = item.tradePlan;
  if (!plan) {
    return item.boardReason;
  }

  const entry = plan.entryLabel;
  const stop = plan.stopLabel;
  return `진입 ${entry} / 손절 ${stop}`;
}

function buildBuyReviewSizing(item: TodayActionBoardItemDto) {
  const sizing = item.tradePlan?.positionSizing;
  if (!sizing || sizing.suggestedQuantity <= 0) {
    return null;
  }

  return `${formatPrice(sizing.suggestedCapital)} · ${sizing.suggestedWeightPercent.toFixed(1)}% · ${new Intl.NumberFormat("ko-KR").format(
    sizing.suggestedQuantity
  )}주`;
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
  dailyScan
}: {
  summary?: TodayActionSummaryDto;
  todayActionBoard?: TodayActionBoardDto;
  holdingActionBoard?: HoldingActionBoardDto;
  dailyScan: DailyScanSummaryDto | null;
}) {
  const buyReviewItems = getBuyReviewItems(todayActionBoard);
  const holdingAttentionItems = getHoldingAttentionItems(holdingActionBoard);
  const openingSummary = getOpeningCheckSummary(dailyScan);
  const summaryMetrics = getSummaryMetrics({
    summary,
    todayActionBoard,
    holdingActionBoard,
    openingSummary
  });

  return (
    <section className="space-y-4">
      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-3">
              <p className="eyebrow-label">Today Dashboard</p>
              <CardTitle className="text-[clamp(1.8rem,2.5vw,2.4rem)] text-foreground">
                {summary?.marketStanceLabel ?? "오늘 할 일을 먼저 확인하세요"}
              </CardTitle>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                {summary?.summary ??
                  "대시보드는 오늘 실제로 해야 할 것만 먼저 보여줍니다. 상세 분석과 긴 설명은 뒤로 보내고, 신규 매수 검토와 보유 관리, 장초 확인 대기만 남겼습니다."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={todayActionBoard?.summary.buyReviewCount ? "positive" : "secondary"}>
                {todayActionBoard?.summary.headline ?? "장전 계획 기준"}
              </Badge>
              <Badge variant="secondary">전일 데이터 기준</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[24px] border border-primary/20 bg-primary/8 p-4 text-sm leading-6 text-foreground/82">
            {todayActionBoard?.summary.note ??
              "실시간 자동 신호가 아니라 장전 계획과 장초 확인 결과를 묶어 보여주는 보드입니다. 오늘 신규 매수는 소수만 남기고, 나머지는 관찰 또는 보유 관리로 분리합니다."}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaryMetrics.map((metric) => (
              <div key={metric.title} className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
                <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{metric.title}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{metric.note}</p>
              </div>
            ))}
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
                  <p className="mt-1 text-sm text-muted-foreground">실제로 새로 볼 종목만 남긴 영역입니다.</p>
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
                          {item.featuredRank ? (
                            <Badge variant="secondary">후보 #{item.featuredRank}</Badge>
                          ) : null}
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
              <DashboardEmptyState message="아직 오늘 실제 매수 검토로 확정된 종목은 없습니다." />
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
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">지금 먼저 손봐야 할 보유 종목입니다.</p>
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
                        href="/tracking"
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
                <DashboardEmptyState message="지금 당장 점검이 필요한 보유 종목은 많지 않습니다." />
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
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">장 시작 후 판단이 아직 남은 후보입니다.</p>
                  </div>
                </div>
                <Badge variant={openingSummary.counts.pending ? "neutral" : "secondary"}>
                  {formatQueueCount(openingSummary.counts.pending)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {openingSummary.pendingItems.length ? (
                <div className="space-y-3">
                  {openingSummary.pendingItems.map((item) => (
                    <Link
                      key={item.ticker}
                      href="/tracking"
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
                <DashboardEmptyState message="상단 후보의 장초 확인은 대부분 완료되었습니다." />
              )}

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1">
                  통과 {formatQueueCount(openingSummary.counts.passed)}
                </span>
                <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1">
                  관찰 유지 {formatQueueCount(openingSummary.counts.watch)}
                </span>
                <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1">
                  추격 금지 {formatQueueCount(openingSummary.counts.avoid)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            href: "/tracking",
            title: "Portfolio",
            description: "보유 관리와 장초 확인 상세 보기",
            icon: WalletCards
          },
          {
            href: "/ranking",
            title: "Explore",
            description: "후보 비교와 상세 분석 보기",
            icon: Compass
          },
          {
            href: "/account",
            title: "Account",
            description: "자산, 현금, 손실 한도 조정",
            icon: ShieldAlert
          }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[22px] border border-border/70 bg-white/82 p-4 shadow-sm transition hover:border-primary/30 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{item.title}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-foreground/45" />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function DashboardEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}
