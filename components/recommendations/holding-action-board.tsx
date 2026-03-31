import Link from "next/link";
import { ArrowDownCircle, Clock3, Flag, ShieldCheck, Target, TrendingUp } from "lucide-react";

import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HoldingActionBoardDto, HoldingActionStatusDto } from "@/lib/api-contracts/swing-radar";
import { formatPercent, formatPrice } from "@/lib/utils";

const statusVisuals: Record<
  HoldingActionStatusDto,
  {
    icon: typeof ShieldCheck;
    variant: "default" | "secondary" | "positive" | "neutral" | "caution";
  }
> = {
  exit_review: {
    icon: ArrowDownCircle,
    variant: "caution"
  },
  take_profit: {
    icon: Target,
    variant: "positive"
  },
  tighten_stop: {
    icon: ShieldCheck,
    variant: "neutral"
  },
  time_stop_review: {
    icon: Clock3,
    variant: "secondary"
  },
  hold: {
    icon: Flag,
    variant: "default"
  }
};

function formatQuantity(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatEnteredAt(value?: string) {
  if (!value) {
    return "진입일 미입력";
  }

  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul"
  }).format(date);
}

function buildSummaryMetrics(board: HoldingActionBoardDto) {
  return [
    {
      title: "보유 종목",
      value: `${board.summary.holdingCount}개`,
      note: board.summary.profileName ? `${board.summary.profileName} 기준` : "현재 입력된 보유"
    },
    {
      title: "투입 자금",
      value: formatPrice(board.summary.investedCapital),
      note: "평균단가 x 수량 기준"
    },
    {
      title: "평가 손익",
      value:
        typeof board.summary.unrealizedPnlAmount === "number"
          ? formatPrice(board.summary.unrealizedPnlAmount)
          : "확인 필요",
      note:
        typeof board.summary.unrealizedPnlPercent === "number"
          ? formatPercent(board.summary.unrealizedPnlPercent)
          : "현재가 데이터 부족"
    },
    {
      title: "익절 검토",
      value: `${board.summary.takeProfitCount}개`,
      note: "부분 익절 후보"
    },
    {
      title: "즉시 점검",
      value: `${board.summary.exitReviewCount}개`,
      note: "손절/이탈 재확인"
    },
    {
      title: "시간 손절",
      value: `${board.summary.timeStopReviewCount}개`,
      note: "보유 기간 재판정"
    }
  ];
}

export function HoldingActionBoard({ board }: { board?: HoldingActionBoardDto }) {
  if (!board) {
    return null;
  }

  const summaryMetrics = buildSummaryMetrics(board);

  return (
    <section className="space-y-4">
      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-foreground">보유 관리 보드</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                신규 후보와 별도로, 이미 들고 있는 종목을 손절, 익절, 시간 손절 관점에서 먼저 나눠 보여줍니다.
              </p>
            </div>
            <Badge variant={board.summary.exitReviewCount > 0 ? "caution" : "secondary"}>{board.summary.headline}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[24px] border border-primary/20 bg-primary/8 p-4 text-sm leading-6 text-foreground/82">
            {board.summary.note}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {summaryMetrics.map((metric) => (
              <SummaryMetric key={metric.title} title={metric.title} value={metric.value} note={metric.note} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {board.sections.map((section) => {
          const visual = statusVisuals[section.status];
          const Icon = visual.icon;

          return (
            <Card key={section.status} className="border-border/70 bg-white/82 shadow-sm">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/35 text-foreground/72">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-foreground">{section.label}</CardTitle>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <Badge variant={visual.variant}>{section.count}개</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {section.items.length ? (
                  <div className="space-y-3">
                    {section.items.map((item) => (
                      <Link
                        key={`${section.status}-${item.ticker}`}
                        href={`/analysis/${item.ticker}`}
                        className="block rounded-[24px] border border-border/70 bg-secondary/20 p-4 transition hover:border-primary/35 hover:bg-secondary/35"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {item.company} <span className="text-xs font-medium text-muted-foreground">{item.ticker}</span>
                              </p>
                              {item.signalTone ? <SignalToneBadge tone={item.signalTone} /> : null}
                              <Badge variant={visual.variant}>{item.actionLabel}</Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-foreground/82">{item.actionSummary}</p>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.actionReason}</p>
                          </div>
                          <TrendingUp className="mt-1 h-4 w-4 shrink-0 text-primary" />
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <MetricChip label="평균단가" value={formatPrice(item.averagePrice)} />
                          <MetricChip
                            label="현재가"
                            value={
                              typeof item.currentPrice === "number" ? formatPrice(item.currentPrice) : "확인 필요"
                            }
                          />
                          <MetricChip
                            label="평가손익"
                            value={
                              typeof item.unrealizedPnlPercent === "number"
                                ? formatPercent(item.unrealizedPnlPercent)
                                : "확인 필요"
                            }
                          />
                          <MetricChip
                            label="보유 수량"
                            value={`${formatQuantity(item.quantity)}주`}
                          />
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-border/70 bg-background/75 px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">관리 기준</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{item.guardLabel}</p>
                          </div>
                          <div className="rounded-2xl border border-border/70 bg-background/75 px-3 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">다음 행동</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{item.nextAction}</p>
                          </div>
                        </div>

                        {item.tradePlan ? (
                          <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <MetricChip label="현재 손절" value={item.tradePlan.stopLabel} />
                            <MetricChip label="1차 목표" value={item.tradePlan.targetLabel} />
                            <MetricChip label="예상 보유" value={item.tradePlan.holdWindowLabel} />
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>진입일 {formatEnteredAt(item.enteredAt)}</span>
                          {typeof item.holdingDays === "number" ? <span>보유 {item.holdingDays}일</span> : null}
                          {typeof item.marketValue === "number" ? <span>평가금액 {formatPrice(item.marketValue)}</span> : null}
                          {item.note ? <span>메모 {item.note}</span> : null}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-5 text-sm leading-6 text-muted-foreground">
                    현재는 이 구간에 들어온 보유가 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function SummaryMetric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-4">
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/75 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
