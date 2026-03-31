import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { OpeningCheckInsightCard } from "@/components/shared/opening-check-insight-card";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HoldingActionItemDto } from "@/lib/api-contracts/swing-radar";
import {
  buildPortfolioCloseReview,
  isClosingPortfolioTradeEventType,
  type PortfolioJournalGroup
} from "@/lib/portfolio/journal-insights";
import { formatPercent, formatPrice } from "@/lib/utils";
import type { OpeningRecheckTickerInsight, PortfolioProfilePosition } from "@/types/recommendation";

function formatDate(value?: string | null) {
  if (!value) {
    return "미입력";
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

export function PositionDetailView({
  ticker,
  company,
  sector,
  position,
  journalGroup,
  actionItem,
  openingCheckInsight
}: {
  ticker: string;
  company: string;
  sector: string;
  position?: PortfolioProfilePosition | null;
  journalGroup?: PortfolioJournalGroup | null;
  actionItem?: HoldingActionItemDto | null;
  openingCheckInsight?: OpeningRecheckTickerInsight | null;
}) {
  const isClosed = journalGroup ? isClosingPortfolioTradeEventType(journalGroup.latestEvent.type) : false;
  const review = journalGroup ? buildPortfolioCloseReview(journalGroup) : null;
  const remainingQuantity = journalGroup
    ? journalGroup.metrics.remainingQuantity
    : (position?.quantity ?? actionItem?.quantity ?? 0);
  const averagePrice = journalGroup
    ? journalGroup.metrics.averageCost || position?.averagePrice || actionItem?.averagePrice || 0
    : (position?.averagePrice ?? actionItem?.averagePrice ?? 0);
  const enteredAt = journalGroup?.firstEntryAt ?? position?.enteredAt ?? actionItem?.enteredAt;

  return (
    <section className="space-y-6">
      <Card className="border-border/70 bg-white/82 shadow-sm">
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

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
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
          <DetailMetric label="평균 단가" value={averagePrice > 0 ? formatPrice(averagePrice) : "미기록"} />
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

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">포지션 타임라인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {journalGroup?.events.length ? (
              journalGroup.events.map((event, index) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex w-14 shrink-0 flex-col items-center pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {index === 0 ? "latest" : `#${index + 1}`}
                    </span>
                    {index !== journalGroup.events.length - 1 ? <span className="mt-2 h-full w-px bg-border/70" /> : null}
                  </div>
                  <div className="flex-1 rounded-[20px] border border-border/70 bg-secondary/20 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={event.type === "stop_loss" ? "caution" : event.type === "take_profit_partial" ? "neutral" : event.type === "buy" ? "positive" : "secondary"}>
                          {event.type === "buy"
                            ? "첫 매수"
                            : event.type === "add"
                              ? "추가 매수"
                              : event.type === "take_profit_partial"
                                ? "부분 익절"
                                : event.type === "exit_full"
                                  ? "전량 매도"
                                  : event.type === "stop_loss"
                                    ? "손절"
                                    : "수동 종료"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(event.tradedAt)}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {formatPrice(event.price)} · {formatQuantity(event.quantity)}
                      </span>
                    </div>
                    {event.note ? (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{event.note}</p>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">메모 없이 기록된 체결입니다.</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-border/70 bg-secondary/20 px-5 py-6 text-sm leading-6 text-muted-foreground">
                아직 이 종목의 실제 체결 기록이 없습니다. 포트폴리오 페이지에서 첫 매수나 부분 익절을 먼저 기록해 주세요.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <OpeningCheckInsightCard
            insight={openingCheckInsight}
            emptyMessage="이 종목은 아직 장초 확인과 연결된 기록이 없거나, 오늘 먼저 볼 종목에서 벗어나 바로 포트폴리오에 들어왔습니다."
          />

          <Card className="border-border/70 bg-white/82 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">현재 계획과 다음 행동</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {actionItem ? (
                <>
                  <div className="rounded-[20px] border border-border/70 bg-secondary/20 px-4 py-4">
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

                  <div className="rounded-[20px] border border-border/70 bg-background/80 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">운용 메모</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{actionItem.actionReason}</p>
                  </div>
                </>
              ) : (
                <div className="rounded-[24px] border border-border/70 bg-secondary/20 px-5 py-6 text-sm leading-6 text-muted-foreground">
                  오늘 기준 보유 관리 계획이 아직 연결되지 않았습니다. 현재는 체결 기록과 자산 정보만 먼저 볼 수 있습니다.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-white/82 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">{isClosed ? "종료 회고" : "현재 포지션 메모"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {review ? (
                <>
                  <div className="rounded-[20px] border border-border/70 bg-secondary/20 px-4 py-4">
                    <p className="text-sm font-semibold text-foreground">{review.headline}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.summary}</p>
                  </div>

                  {review.strengths.length ? (
                    <ReviewList
                      title="좋았던 점"
                      items={review.strengths}
                      tone="positive"
                    />
                  ) : null}

                  {review.watchouts.length ? (
                    <ReviewList
                      title="다음에 다시 볼 점"
                      items={review.watchouts}
                      tone="caution"
                    />
                  ) : null}
                </>
              ) : (
                <div className="rounded-[24px] border border-border/70 bg-secondary/20 px-5 py-6 text-sm leading-6 text-muted-foreground">
                  아직 종료 회고를 만들 만큼 체결 기록이 충분하지 않습니다. 첫 매수와 청산 이벤트를 남기면 이 자리에 자동 회고가 표시됩니다.
                </div>
              )}

              {position?.note ? (
                <div className="rounded-[20px] border border-border/70 bg-background/80 px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">보유 메모</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{position.note}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-secondary/20 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
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
          ? "rounded-[20px] border border-emerald-200 bg-emerald-50/80 px-4 py-4"
          : "rounded-[20px] border border-amber-200 bg-amber-50/80 px-4 py-4"
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
