"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { PortfolioCloseReviewEditor } from "@/components/portfolio/portfolio-close-review-editor";
import { PortfolioPositionChartCard } from "@/components/portfolio/portfolio-position-chart-card";
import { RecommendationTrustSummary } from "@/components/recommendations/recommendation-trust-summary";
import {
  PortfolioTradeEventDialog,
  type PortfolioTradeEventDialogPreset
} from "@/components/portfolio/portfolio-trade-event-dialog";
import { buildPortfolioTradeDialogPreset } from "@/components/portfolio/trade-event-dialog-presets";
import { OpeningCheckInsightCard } from "@/components/shared/opening-check-insight-card";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HoldingActionItemDto, TickerAnalysisDto } from "@/lib/api-contracts/swing-radar";
import {
  buildPortfolioCloseReview,
  isClosingPortfolioTradeEventType,
  type PortfolioJournalGroup
} from "@/lib/portfolio/journal-insights";
import { buildPositionPlanComparison, getPortfolioEventLabel } from "@/lib/portfolio/position-detail";
import { buildRecommendationTrustSummary } from "@/lib/recommendations/recommendation-trust";
import { getPortfolioCloseReviewKeyForGroup } from "@/lib/portfolio/review-keys";
import { formatPercent, formatPrice } from "@/lib/utils";
import type {
  OpeningRecheckTickerInsight,
  PortfolioCloseReviewEntry,
  PortfolioProfilePosition
} from "@/types/recommendation";

function formatDate(value?: string | null) {
  if (!value) {
    return "미기록";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: value.includes("T") ? "2-digit" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
    hour12: false,
    timeZone: "Asia/Seoul"
  }).format(date);
}

function formatQuantity(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "미확인";
  }

  return `${new Intl.NumberFormat("ko-KR").format(value)}주`;
}

function formatSignedPrice(value: number) {
  if (value === 0) {
    return formatPrice(0);
  }

  return `${value > 0 ? "+" : "-"}${formatPrice(Math.abs(value))}`;
}

function getEventTone(type: PortfolioJournalGroup["events"][number]["type"]) {
  if (type === "buy") {
    return "positive" as const;
  }

  if (type === "add") {
    return "default" as const;
  }

  if (type === "take_profit_partial") {
    return "neutral" as const;
  }

  if (type === "stop_loss") {
    return "caution" as const;
  }

  return "secondary" as const;
}

export function PositionDetailView({
  ticker,
  company,
  sector,
  position,
  journalGroup,
  actionItem,
  openingCheckInsight,
  analysis,
  closeReviewEntry
}: {
  ticker: string;
  company: string;
  sector: string;
  position?: PortfolioProfilePosition | null;
  journalGroup?: PortfolioJournalGroup | null;
  actionItem?: HoldingActionItemDto | null;
  openingCheckInsight?: OpeningRecheckTickerInsight | null;
  analysis?: TickerAnalysisDto | null;
  closeReviewEntry?: PortfolioCloseReviewEntry | null;
}) {
  const router = useRouter();
  const [quickTradePreset, setQuickTradePreset] = useState<PortfolioTradeEventDialogPreset | null>(null);
  const isClosed = journalGroup ? isClosingPortfolioTradeEventType(journalGroup.latestEvent.type) : false;
  const review = journalGroup ? buildPortfolioCloseReview(journalGroup) : null;
  const remainingQuantity = journalGroup
    ? journalGroup.metrics.remainingQuantity
    : (position?.quantity ?? actionItem?.quantity ?? 0);
  const averagePrice = journalGroup
    ? journalGroup.metrics.averageCost || position?.averagePrice || actionItem?.averagePrice || 0
    : (position?.averagePrice ?? actionItem?.averagePrice ?? 0);
  const enteredAt = journalGroup?.firstEntryAt ?? position?.enteredAt ?? actionItem?.enteredAt;
  const tradePlan = actionItem?.tradePlan ?? analysis?.tradePlan ?? null;
  const trustSummary =
    analysis?.validation
      ? buildRecommendationTrustSummary({
          validation: analysis.validation,
          validationBasis: analysis.validationBasis,
          validationInsight: analysis.validationInsight,
          trackingDiagnostic: analysis.trackingDiagnostic
        })
      : null;
  const planComparison = buildPositionPlanComparison({
    tradePlan,
    journalGroup,
    averagePrice,
    currentPrice: actionItem?.currentPrice ?? tradePlan?.currentPrice ?? null
  });

  const currentPrice = actionItem?.currentPrice ?? tradePlan?.currentPrice ?? averagePrice;
  const quickTradePresets = !isClosed && remainingQuantity > 0
    ? {
        add: buildPortfolioTradeDialogPreset({
          ticker,
          company,
          sector,
          type: "add",
          quantity: remainingQuantity,
          currentPrice,
          averagePrice,
          tradePlan
        }),
        partial: buildPortfolioTradeDialogPreset({
          ticker,
          company,
          sector,
          type: "take_profit_partial",
          quantity: remainingQuantity,
          currentPrice,
          averagePrice,
          tradePlan
        }),
        stop: buildPortfolioTradeDialogPreset({
          ticker,
          company,
          sector,
          type: "stop_loss",
          quantity: remainingQuantity,
          currentPrice,
          averagePrice,
          tradePlan
        }),
        exit: buildPortfolioTradeDialogPreset({
          ticker,
          company,
          sector,
          type: "exit_full",
          quantity: remainingQuantity,
          currentPrice,
          averagePrice,
          tradePlan
        })
      }
    : null;

  return (
    <>
      <section className="space-y-6">
        <Card
          data-tutorial="position-header"
          className="border-border/80 bg-white/90 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]"
        >
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-3">
                <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-muted-foreground">
                  <Link href="/portfolio">
                    <ArrowLeft className="h-4 w-4" />
                    포트폴리오로 돌아가기
                  </Link>
                </Button>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-2xl text-foreground">
                      {company} <span className="text-base font-medium text-muted-foreground">{ticker}</span>
                    </CardTitle>
                    <Badge variant={isClosed ? "secondary" : "positive"}>{isClosed ? "종료 포지션" : "보유 중"}</Badge>
                    {actionItem?.signalTone ? <SignalToneBadge tone={actionItem.signalTone} /> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {sector} · 진입 {formatDate(enteredAt)} · {journalGroup ? `${journalGroup.holdingDays}일 경과` : "체결 기록 대기"}
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                {!isClosed && quickTradePresets ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setQuickTradePreset(quickTradePresets.add)}
                    >
                      추가 매수
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setQuickTradePreset(quickTradePresets.partial)}
                    >
                      부분 익절
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setQuickTradePreset(quickTradePresets.stop)}
                    >
                      손절
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => setQuickTradePreset(quickTradePresets.exit)}
                    >
                      전량 매도
                    </Button>
                  </>
                ) : null}
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href={`/analysis/${ticker}`}>
                    분석 보기
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailMetric label="남은 수량" value={formatQuantity(remainingQuantity)} />
            <DetailMetric label="평단" value={averagePrice > 0 ? formatPrice(averagePrice) : "미기록"} />
            <DetailMetric
              label="현재 손익"
              value={
                typeof actionItem?.unrealizedPnlPercent === "number"
                  ? formatPercent(actionItem.unrealizedPnlPercent)
                  : isClosed
                    ? "종료"
                    : "미확인"
              }
            />
            <DetailMetric
              label="실현 손익"
              value={journalGroup ? formatSignedPrice(journalGroup.metrics.realizedPnl) : "기록 대기"}
            />
          </CardContent>
        </Card>

        <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
          <a
            href="#position-chart-panel"
            className="inline-flex shrink-0 items-center rounded-full border border-border/80 bg-white/88 px-3 py-2 text-xs font-medium text-foreground"
          >
            차트
          </a>
          <a
            href="#position-plan-panel"
            className="inline-flex shrink-0 items-center rounded-full border border-border/80 bg-white/88 px-3 py-2 text-xs font-medium text-foreground"
          >
            계획
          </a>
          <a
            href="#position-timeline-panel"
            className="inline-flex shrink-0 items-center rounded-full border border-border/80 bg-white/88 px-3 py-2 text-xs font-medium text-foreground"
          >
            타임라인
          </a>
          <a
            href="#position-review-panel"
            className="inline-flex shrink-0 items-center rounded-full border border-border/80 bg-white/88 px-3 py-2 text-xs font-medium text-foreground"
          >
            복기
          </a>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr,0.92fr]">
          <div id="position-chart-panel" data-tutorial="position-chart" className="scroll-mt-32">
            <PortfolioPositionChartCard
              company={company}
              chartPoints={analysis?.chartSeries ?? []}
              journalGroup={journalGroup}
              tradePlan={tradePlan}
              averagePrice={averagePrice}
            />
          </div>

          <div className="space-y-6">
            {trustSummary ? (
              <Card
                data-tutorial="position-trust"
                className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]"
              >
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">보유 근거 신뢰도</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <RecommendationTrustSummary summary={trustSummary} />
                </CardContent>
              </Card>
            ) : null}

            <Card
              id="position-plan-panel"
              data-tutorial="position-comparison"
              className="scroll-mt-32 border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]"
            >
              <CardHeader>
                <CardTitle className="text-lg text-foreground">계획 대비 실제</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[20px] border border-primary/24 bg-[linear-gradient(180deg,rgba(139,107,46,0.08),rgba(255,255,255,0.94))] px-4 py-4">
                  <p className="text-sm font-semibold text-foreground">{planComparison.headline}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{planComparison.summary}</p>
                </div>

                {!isClosed && quickTradePresets ? (
                  <div className="rounded-[20px] border border-border/80 bg-[hsl(42_38%_97%)] px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">빠른 체결</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setQuickTradePreset(quickTradePresets.add)}>
                        추가 매수
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setQuickTradePreset(quickTradePresets.partial)}>
                        부분 익절
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setQuickTradePreset(quickTradePresets.stop)}>
                        손절
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setQuickTradePreset(quickTradePresets.exit)}>
                        전량 매도
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {planComparison.items.map((item) => (
                    <div
                      key={item.key}
                      className={
                        item.tone === "positive"
                          ? "rounded-[20px] border border-positive/22 bg-[hsl(var(--positive)/0.08)] px-4 py-4"
                          : item.tone === "neutral"
                            ? "rounded-[20px] border border-primary/22 bg-[hsl(var(--primary)/0.08)] px-4 py-4"
                            : item.tone === "caution"
                              ? "rounded-[20px] border border-caution/22 bg-[hsl(var(--caution)/0.08)] px-4 py-4"
                              : "rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,241,232,0.88))] px-4 py-4"
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <Badge
                          variant={
                            item.tone === "positive"
                              ? "positive"
                              : item.tone === "neutral"
                                ? "neutral"
                                : item.tone === "caution"
                                  ? "caution"
                                  : "secondary"
                          }
                        >
                          {item.statusLabel}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <PlanValue label="계획" value={item.planned} />
                        <PlanValue label="실제" value={item.actual} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <OpeningCheckInsightCard
              insight={openingCheckInsight}
              emptyMessage="이 종목은 포트폴리오에서 바로 이어진 상태라 장초 확인 기록이 아직 연결되지 않았습니다."
            />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.16fr,0.84fr]">
          <Card
            id="position-timeline-panel"
            data-tutorial="position-timeline"
            className="scroll-mt-32 border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]"
          >
            <CardHeader>
              <CardTitle className="text-lg text-foreground">체결 타임라인</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {journalGroup?.events.length ? (
                journalGroup.events.map((event, index) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex w-14 shrink-0 flex-col items-center pt-1">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {index === 0 ? "latest" : `#${index + 1}`}
                      </span>
                      {index !== journalGroup.events.length - 1 ? <span className="mt-2 h-full w-px bg-border/80" /> : null}
                    </div>
                    <div className="flex-1 rounded-[20px] border border-border/80 bg-[hsl(42_38%_97%)] px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getEventTone(event.type)}>{getPortfolioEventLabel(event.type)}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(event.tradedAt)}</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {formatPrice(event.price)} · {formatQuantity(event.quantity)}
                        </span>
                      </div>
                      {event.note ? (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{event.note}</p>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">별도 메모 없이 기록한 체결입니다.</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-border/80 bg-[hsl(42_40%_97%)] px-5 py-6 text-sm leading-6 text-muted-foreground">
                  아직 이 종목의 체결 기록이 없습니다. 포트폴리오 화면이나 이 상세 화면의 빠른 체결 버튼으로 기록을 남기면 타임라인이 이어집니다.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card
              data-tutorial="position-next-action"
              className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]"
            >
              <CardHeader>
                <CardTitle className="text-lg text-foreground">현재 계획과 다음 행동</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {actionItem ? (
                  <>
                    <div className="rounded-[20px] border border-primary/24 bg-[linear-gradient(180deg,rgba(139,107,46,0.08),rgba(255,255,255,0.94))] px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">다음 행동</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{actionItem.actionLabel}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{actionItem.nextAction}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailMetric
                        label="현재가"
                        value={typeof actionItem.currentPrice === "number" ? formatPrice(actionItem.currentPrice) : "미확인"}
                      />
                      <DetailMetric
                        label="평가 손익"
                        value={
                          typeof actionItem.unrealizedPnlPercent === "number"
                            ? formatPercent(actionItem.unrealizedPnlPercent)
                            : "미확인"
                        }
                      />
                      <DetailMetric
                        label="손절 기준"
                        value={actionItem.tradePlan?.stopPrice ? formatPrice(actionItem.tradePlan.stopPrice) : "미설정"}
                      />
                      <DetailMetric
                        label="1차 목표"
                        value={actionItem.tradePlan?.targetPrice ? formatPrice(actionItem.tradePlan.targetPrice) : "미설정"}
                      />
                    </div>

                    <div className="rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,241,232,0.88))] px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">이유 메모</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{actionItem.actionReason}</p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-[24px] border border-border/80 bg-[hsl(42_40%_97%)] px-5 py-6 text-sm leading-6 text-muted-foreground">
                    오늘 기준 보유 관리 계획이 아직 연결되지 않았습니다. 현재는 체결 기록과 자산 정보만 먼저 보여줍니다.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card
              id="position-review-panel"
              data-tutorial="position-review"
              className="scroll-mt-32 border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]"
            >
              <CardHeader>
                <CardTitle className="text-lg text-foreground">{isClosed ? "종료 회고" : "포지션 메모"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {review ? (
                  <>
                    <div className="rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,241,232,0.88))] px-4 py-4">
                      <p className="text-sm font-semibold text-foreground">{review.headline}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.summary}</p>
                    </div>

                    {review.strengths.length ? <ReviewList title="잘한 점" items={review.strengths} tone="positive" /> : null}
                    {review.watchouts.length ? <ReviewList title="다음에 다시 볼 점" items={review.watchouts} tone="caution" /> : null}
                  </>
                ) : (
                  <div className="rounded-[24px] border border-border/80 bg-[hsl(42_40%_97%)] px-5 py-6 text-sm leading-6 text-muted-foreground">
                    아직 종료 회고를 만들 만큼 체결 기록이 충분하지 않습니다. 첫 매수와 청산 이벤트를 함께 기록하면 자동 회고가 채워집니다.
                  </div>
                )}

                {journalGroup && isClosed ? (
                  <div className="rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,241,232,0.88))] px-4 py-4">
                    <PortfolioCloseReviewEditor
                      positionKey={getPortfolioCloseReviewKeyForGroup(journalGroup)}
                      ticker={journalGroup.ticker}
                      closedAt={journalGroup.latestEvent.tradedAt}
                      review={closeReviewEntry}
                    />
                  </div>
                ) : null}

                {position?.note ? (
                  <div className="rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,241,232,0.88))] px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">보유 메모</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{position.note}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <PortfolioTradeEventDialog
        open={Boolean(quickTradePreset)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setQuickTradePreset(null);
          }
        }}
        positions={position ? [position] : []}
        recentEvents={journalGroup?.events ?? []}
        preset={quickTradePreset}
        onSaved={() => {
          setQuickTradePreset(null);
          router.refresh();
        }}
      />
    </>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PlanValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border/80 bg-white/80 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ReviewList({
  title,
  items,
  tone
}: {
  title: string;
  items: string[];
  tone: "positive" | "caution";
}) {
  return (
    <div
      className={
        tone === "positive"
          ? "rounded-[20px] border border-positive/22 bg-[hsl(var(--positive)/0.1)] px-4 py-4"
          : "rounded-[20px] border border-caution/22 bg-[hsl(var(--caution)/0.1)] px-4 py-4"
      }
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-muted-foreground">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
