import Link from "next/link";
import { ArrowUpRight, Binoculars, CircleOff, Clock3, ShieldX } from "lucide-react";

import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFeaturedRankLabel } from "@/lib/copy/action-language";
import type { TodayActionBoardDto, TodayActionBoardStatusDto } from "@/lib/api-contracts/swing-radar";
import { formatDateTimeShort, formatPrice } from "@/lib/utils";

const statusVisuals: Record<
  TodayActionBoardStatusDto,
  {
    icon: typeof ArrowUpRight;
    variant: "default" | "secondary" | "positive" | "neutral" | "caution";
  }
> = {
  buy_review: {
    icon: ArrowUpRight,
    variant: "positive"
  },
  watch: {
    icon: Binoculars,
    variant: "neutral"
  },
  avoid: {
    icon: CircleOff,
    variant: "caution"
  },
  excluded: {
    icon: ShieldX,
    variant: "default"
  },
  pending: {
    icon: Clock3,
    variant: "secondary"
  }
};

function formatQuantity(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function buildSummaryMetrics(board: TodayActionBoardDto) {
  const metrics = [
    {
      title: "오늘 매수 검토",
      value: `${board.summary.buyReviewCount}개`,
      note: "실제 신규 매수 검토로 올라온 종목"
    },
    {
      title: "신규 매수 여유",
      value: `${board.summary.remainingNewPositions}개`,
      note: "오늘 추가로 담을 수 있는 신규 포지션 수"
    },
    {
      title: "진행중 포지션",
      value: `${board.summary.activeHoldingCount}개`,
      note: "현재 보유 관리 기준으로 잡힌 종목 수"
    },
    {
      title: "포트폴리오 슬롯",
      value: `${board.summary.remainingPortfolioSlots}개`,
      note: "동시 관리 한도 안에서 남아 있는 자리"
    },
    {
      title: "섹터 한도",
      value: `${board.summary.sectorLimit}개`,
      note: "같은 섹터 신규 진입 상한"
    },
    {
      title: "관찰 유지",
      value: `${board.summary.watchCount}개`,
      note: "좋지만 오늘은 지켜보는 종목"
    }
  ];

  if (typeof board.summary.availableCash === "number") {
    metrics.push({
      title: "가용 현금",
      value: formatPrice(board.summary.availableCash),
      note: board.summary.portfolioProfileName
        ? `${board.summary.portfolioProfileName} 기준 사용 가능 현금`
        : "현재 신규 진입에 쓸 수 있는 현금"
    });
  }

  if (typeof board.summary.riskBudgetPerTrade === "number") {
    metrics.push({
      title: "1회 손실 한도",
      value: formatPrice(board.summary.riskBudgetPerTrade),
      note: "손절 기준으로 감수할 최대 손실 금액"
    });
  }

  return metrics;
}

export function TodayActionBoard({ board }: { board?: TodayActionBoardDto }) {
  if (!board) {
    return null;
  }

  const buyReviewSection = board.sections.find((section) => section.status === "buy_review");
  const sideSections = board.sections.filter((section) => section.status !== "buy_review");
  const summaryMetrics = buildSummaryMetrics(board);

  return (
    <section className="space-y-4">
      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-foreground">오늘 실제 행동 보드</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                내가 저장한 장초 확인과 현재 보유 포지션, 섹터 한도까지 함께 반영한 오늘의 실행 보드입니다.
              </p>
            </div>
            <Badge variant={board.summary.buyReviewCount > 0 ? "positive" : "secondary"}>{board.summary.headline}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[24px] border border-primary/20 bg-primary/8 p-4 text-sm leading-6 text-foreground/82">
            {board.summary.note}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
            {summaryMetrics.map((metric) => (
              <SummaryMetric key={metric.title} title={metric.title} value={metric.value} note={metric.note} />
            ))}
          </div>
          <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
            {board.summary.crowdedSectors.length ? (
              <>
                현재 섹터 한도에 걸린 구간:
                {" "}
                {board.summary.crowdedSectors.map((item) => `${item.sector} ${item.count}개`).join(", ")}
              </>
            ) : (
              "현재는 특정 섹터가 한도에 걸리지 않아, 섹터 중복보다 각 종목의 장초 확인이 더 중요합니다."
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg text-foreground">{buyReviewSection?.label ?? "오늘 매수 검토"}</CardTitle>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {buyReviewSection?.description ?? "장초 확인과 포트폴리오 한도를 모두 통과한 종목입니다."}
                </p>
              </div>
              <Badge variant="positive">{buyReviewSection?.count ?? 0}개</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {buyReviewSection?.items.length ? (
              <div className="space-y-3">
                {buyReviewSection.items.map((item) => (
                  <Link
                    key={`buy-review-${item.ticker}`}
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
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                              {getFeaturedRankLabel(item.featuredRank)}
                            </span>
                          ) : null}
                          {item.portfolioNote ? <Badge variant="secondary">{item.portfolioNote}</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-foreground/82">{item.boardReason}</p>
                      </div>
                      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    </div>

                    {item.tradePlan ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border/70 bg-background/75 px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">진입 구간</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{item.tradePlan.entryLabel}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/75 px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">손절 기준</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{item.tradePlan.stopLabel}</p>
                        </div>
                      </div>
                    ) : null}

                    {item.tradePlan?.positionSizing ? (
                      <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">권장 매수 금액</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {formatPrice(item.tradePlan.positionSizing.suggestedCapital)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">권장 비중</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {item.tradePlan.positionSizing.suggestedWeightPercent.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">권장 수량</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {formatQuantity(item.tradePlan.positionSizing.suggestedQuantity)}주
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">손절시 예상 손실</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {formatPrice(item.tradePlan.positionSizing.maxLossAmount)}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-foreground/72">
                          {item.tradePlan.positionSizing.limitLabel} · {item.tradePlan.positionSizing.note}
                        </p>
                      </div>
                    ) : null}

                    {item.openingRecheck ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        내 장초 확인 저장 {formatDateTimeShort(item.openingRecheck.updatedAt)}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-5 text-sm leading-6 text-muted-foreground">
                아직 오늘 실제 매수 검토로 확정된 종목은 없습니다. 장초 확인이 먼저 필요합니다.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {sideSections.map((section) => {
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
                          className="block rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-3 transition hover:border-primary/35 hover:bg-secondary/35"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">
                                {item.company} <span className="text-xs font-medium text-muted-foreground">{item.ticker}</span>
                              </p>
                              {item.portfolioNote ? <p className="mt-1 text-[11px] text-foreground/70">{item.portfolioNote}</p> : null}
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.boardReason}</p>
                            </div>
                            {item.featuredRank ? (
                              <span className="rounded-full border border-border/70 bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground/72">
                                #{item.featuredRank}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-5 text-sm leading-6 text-muted-foreground">
                      현재 이 구간에 들어온 종목은 없습니다.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
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

