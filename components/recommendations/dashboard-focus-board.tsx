import Link from "next/link";
import { ArrowUpRight, Clock3, Compass, ShieldAlert, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DailyScanSummaryDto,
  HoldingActionBoardDto,
  HoldingActionStatusDto,
  TodayActionBoardDto,
  TodayActionSummaryDto
} from "@/lib/api-contracts/swing-radar";
import { formatPrice } from "@/lib/utils";

const holdingPriority: HoldingActionStatusDto[] = [
  "exit_review",
  "take_profit",
  "tighten_stop",
  "time_stop_review",
  "hold"
];

function formatQueueCount(value: number, suffix = "개") {
  return `${value}${suffix}`;
}

function getOpeningRecheckSummary(dailyScan: DailyScanSummaryDto | null) {
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

function getHoldingAttentionItems(board?: HoldingActionBoardDto) {
  if (!board) {
    return [];
  }

  const orderedItems = holdingPriority.flatMap((status) => {
    const section = board.sections.find((item) => item.status === status);
    return section?.items ?? [];
  });

  return orderedItems.slice(0, 3);
}

function getBuyReviewItems(board?: TodayActionBoardDto) {
  return board?.sections.find((section) => section.status === "buy_review")?.items.slice(0, 3) ?? [];
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
  const openingRecheck = getOpeningRecheckSummary(dailyScan);

  return (
    <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Today Focus</p>
              <CardTitle className="mt-2 text-2xl text-foreground">
                {summary?.marketStanceLabel ?? "오늘의 운영 모드를 확인하세요"}
              </CardTitle>
            </div>
            <Badge variant={todayActionBoard?.summary.buyReviewCount ? "positive" : "secondary"}>
              {todayActionBoard?.summary.headline ?? "장전 계획 기준"}
            </Badge>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            {summary?.summary ??
              "오늘 행동 보드는 장전 후보, 장초 재판정, 포트폴리오 한도를 함께 반영해 실제로 검토할 종목만 남기는 방향으로 설계되어 있습니다."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FocusMetric
              title="신규 매수 최대"
              value={formatQueueCount(summary?.maxNewPositions ?? todayActionBoard?.summary.maxNewPositions ?? 0)}
              note="오늘 새로 열 수 있는 포지션 수"
            />
            <FocusMetric
              title="동시 관리 기준"
              value={formatQueueCount(summary?.maxConcurrentPositions ?? 0)}
              note="전체 보유 슬롯 상한"
            />
            <FocusMetric
              title="보유 종목 수"
              value={formatQueueCount(todayActionBoard?.summary.activeHoldingCount ?? holdingActionBoard?.summary.holdingCount ?? 0)}
              note="현재 관리 중인 종목 수"
            />
            <FocusMetric
              title="가용 현금"
              value={
                typeof todayActionBoard?.summary.availableCash === "number"
                  ? formatPrice(todayActionBoard.summary.availableCash)
                  : "계정 기준 사용"
              }
              note="권장 수량 계산에 쓰는 현금"
            />
          </div>

          <div className="rounded-[24px] border border-primary/20 bg-primary/8 p-4 text-sm leading-6 text-foreground/82">
            {todayActionBoard?.summary.note ??
              summary?.focusNote ??
              "대시보드는 설명보다 행동을 먼저 보여줍니다. 오늘 실제로 무엇을 할지 먼저 확인하고, 상세 분석은 필요한 종목만 열어보는 방식으로 쓰시면 됩니다."}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                href: "/tracking",
                title: "Portfolio",
                description: "보유/관찰 관리 보기",
                icon: WalletCards
              },
              {
                href: "/ranking",
                title: "Explore",
                description: "전체 후보 탐색 보기",
                icon: Compass
              },
              {
                href: "/account",
                title: "Account",
                description: "자산과 보유 설정",
                icon: ShieldAlert
              }
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[22px] border border-border/70 bg-secondary/20 p-4 transition hover:border-primary/30 hover:bg-secondary/35"
                >
                  <div className="flex items-center gap-2 text-foreground">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <FocusQueueCard
          title="오늘 매수 검토"
          description="장초 재판정을 통과하고 포트폴리오 한도까지 맞는 종목만 남깁니다."
          count={todayActionBoard?.summary.buyReviewCount ?? 0}
          variant={(todayActionBoard?.summary.buyReviewCount ?? 0) > 0 ? "positive" : "secondary"}
          icon={ArrowUpRight}
          items={buyReviewItems.map((item) => ({
            key: item.ticker,
            label: `${item.company} (${item.ticker})`,
            note: item.tradePlan?.entryLabel ?? item.boardReason,
            href: `/analysis/${item.ticker}`
          }))}
          emptyMessage="아직 오늘 매수 검토로 남은 종목이 없습니다."
        />

        <FocusQueueCard
          title="보유 즉시 점검"
          description="손절 점검, 부분 익절, 보호 가격 상향이 필요한 보유 종목을 먼저 봅니다."
          count={
            (holdingActionBoard?.summary.exitReviewCount ?? 0) +
            (holdingActionBoard?.summary.takeProfitCount ?? 0) +
            (holdingActionBoard?.summary.tightenStopCount ?? 0)
          }
          variant={
            ((holdingActionBoard?.summary.exitReviewCount ?? 0) +
              (holdingActionBoard?.summary.takeProfitCount ?? 0) +
              (holdingActionBoard?.summary.tightenStopCount ?? 0)) > 0
              ? "caution"
              : "secondary"
          }
          icon={ShieldAlert}
          items={holdingAttentionItems.map((item) => ({
            key: item.ticker,
            label: `${item.company} (${item.ticker})`,
            note: item.nextAction,
            href: `/analysis/${item.ticker}`
          }))}
          emptyMessage="지금 당장 점검이 필요한 보유 종목은 많지 않습니다."
        />

        <FocusQueueCard
          title="장초 재판정 대기"
          description="장전 후보 중 아직 통과/보류 판단을 확정하지 않은 종목들입니다."
          count={openingRecheck.counts.pending}
          variant={openingRecheck.counts.pending > 0 ? "neutral" : "secondary"}
          icon={Clock3}
          footer={
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1">
                통과 {formatQueueCount(openingRecheck.counts.passed)}
              </span>
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1">
                관찰 유지 {formatQueueCount(openingRecheck.counts.watch)}
              </span>
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1">
                추격 금지 {formatQueueCount(openingRecheck.counts.avoid)}
              </span>
            </div>
          }
          items={openingRecheck.pendingItems.map((item) => ({
            key: item.ticker,
            label: `${item.company} (${item.ticker})`,
            note: item.tradePlan?.nextStep ?? item.rationale,
            href: `/analysis/${item.ticker}`
          }))}
          emptyMessage="상단 후보의 장초 재판정은 대부분 완료되었습니다."
        />
      </div>
    </section>
  );
}

function FocusMetric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function FocusQueueCard({
  title,
  description,
  count,
  variant,
  icon: Icon,
  items,
  emptyMessage,
  footer
}: {
  title: string;
  description: string;
  count: number;
  variant: "default" | "secondary" | "positive" | "neutral" | "caution";
  icon: typeof ArrowUpRight;
  items: Array<{ key: string; label: string; note: string; href: string }>;
  emptyMessage: string;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-white/82 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/35 text-foreground/72">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">{title}</CardTitle>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge variant={variant}>{formatQueueCount(count)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="block rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-3 transition hover:border-primary/35 hover:bg-secondary/35"
              >
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.note}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-5 text-sm leading-6 text-muted-foreground">
            {emptyMessage}
          </div>
        )}
        {footer}
      </CardContent>
    </Card>
  );
}
