import Link from "next/link";
import { ArrowUpRight, Binoculars, CircleOff, Clock3, ShieldX } from "lucide-react";

import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TodayActionBoardDto, TodayActionBoardStatusDto } from "@/lib/api-contracts/swing-radar";
import { formatDateTimeShort } from "@/lib/utils";

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

export function TodayActionBoard({ board }: { board?: TodayActionBoardDto }) {
  if (!board) {
    return null;
  }

  const buyReviewSection = board.sections.find((section) => section.status === "buy_review");
  const sideSections = board.sections.filter((section) => section.status !== "buy_review");

  return (
    <section className="space-y-4">
      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-foreground">오늘 실제 행동 보드</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                저장된 장초 재판정에 현재 진행중 포지션 수와 섹터 중복 한도까지 함께 반영한 실제 행동 보드입니다.
              </p>
            </div>
            <Badge variant={board.summary.buyReviewCount > 0 ? "positive" : "secondary"}>{board.summary.headline}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[24px] border border-primary/20 bg-primary/8 p-4 text-sm leading-6 text-foreground/82">
            {board.summary.note}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <SummaryMetric title="오늘 매수 검토" value={`${board.summary.buyReviewCount}개`} note="실제 신규 매수 검토로 남은 종목" />
            <SummaryMetric title="신규 매수 잔여" value={`${board.summary.remainingNewPositions}개`} note="오늘 추가로 쓸 수 있는 신규 매수 한도" />
            <SummaryMetric title="진행중 포지션" value={`${board.summary.activeHoldingCount}개`} note="현재 보유 관리 대상으로 잡힌 종목 수" />
            <SummaryMetric title="포트폴리오 슬롯" value={`${board.summary.remainingPortfolioSlots}개`} note="동시 관리 기준에서 남은 자리" />
            <SummaryMetric title="섹터 한도" value={`${board.summary.sectorLimit}개`} note="같은 섹터 신규 진입 상한" />
            <SummaryMetric title="관찰 유지" value={`${board.summary.watchCount}개`} note="더 지켜보거나 한도 때문에 뒤로 미룬 종목" />
          </div>
          <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
            {board.summary.crowdedSectors.length ? (
              <>
                현재 섹터 한도에 걸린 구간:{" "}
                {board.summary.crowdedSectors.map((item) => `${item.sector} ${item.count}개`).join(" · ")}
              </>
            ) : (
              "현재는 특정 섹터가 한도에 걸리지 않아, 섹터 중복보다 개별 재판정 결과가 우선입니다."
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
                  {buyReviewSection?.description ?? "장초 재판정과 신규 매수 한도를 모두 통과한 종목입니다."}
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
                              후보 #{item.featuredRank}
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
                    {item.openingRecheck ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        마지막 저장 {formatDateTimeShort(item.openingRecheck.updatedAt)}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-5 text-sm leading-6 text-muted-foreground">
                아직 오늘 실제 매수 검토로 확정된 종목은 없습니다. 장초 재판정 저장이 먼저 필요합니다.
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
