"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ScrollText } from "lucide-react";

import type { PortfolioProfilePayload } from "@/components/admin/dashboard-types";
import {
  PortfolioTradeEventDialog,
  type PortfolioTradeEventDialogPreset
} from "@/components/portfolio/portfolio-trade-event-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildPortfolioCloseReview,
  getPortfolioJournalSummary,
  groupPortfolioJournalByTicker,
  isClosingPortfolioTradeEventType
} from "@/lib/portfolio/journal-insights";
import { formatPrice } from "@/lib/utils";
import type {
  PortfolioJournal,
  PortfolioProfilePosition,
  PortfolioTradeEvent,
  PortfolioTradeEventType
} from "@/types/recommendation";

const tradeTypeMeta: Record<
  PortfolioTradeEventType,
  {
    label: string;
    variant: "default" | "positive" | "neutral" | "caution" | "secondary";
    description: string;
  }
> = {
  buy: {
    label: "첫 매수",
    variant: "positive",
    description: "포지션을 처음 여는 체결입니다."
  },
  add: {
    label: "추가 매수",
    variant: "default",
    description: "기존 포지션에 수량을 더하는 체결입니다."
  },
  take_profit_partial: {
    label: "부분 익절",
    variant: "neutral",
    description: "일부 수량만 먼저 정리하는 체결입니다."
  },
  exit_full: {
    label: "전량 매도",
    variant: "secondary",
    description: "남은 수량을 모두 정리하는 체결입니다."
  },
  stop_loss: {
    label: "손절",
    variant: "caution",
    description: "손절 기준에 따라 종료하는 체결입니다."
  },
  manual_exit: {
    label: "수동 종료",
    variant: "secondary",
    description: "사용자 판단으로 포지션을 정리하는 체결입니다."
  }
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul"
  }).format(date);
}

function formatQuantity(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}주`;
}

function formatSignedPrice(value: number) {
  if (value === 0) {
    return formatPrice(0);
  }

  return `${value > 0 ? "+" : "-"}${formatPrice(Math.abs(value))}`;
}

export function PortfolioJournalBoard({
  journal,
  positions,
  currentProfile,
  view = "journal",
  focusTicker = null,
  onJournalUpdated
}: {
  journal: PortfolioJournal;
  positions: PortfolioProfilePosition[];
  currentProfile?: PortfolioProfilePayload;
  view?: "journal" | "reviews";
  focusTicker?: string | null;
  onJournalUpdated?: (payload: {
    event: PortfolioTradeEvent;
    journal: PortfolioJournal;
    profile?: PortfolioProfilePayload;
    previousJournal?: PortfolioJournal;
    previousProfile?: PortfolioProfilePayload;
  }) => void;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogPreset, setDialogPreset] = useState<PortfolioTradeEventDialogPreset | null>(null);
  const groupedEvents = useMemo(() => groupPortfolioJournalByTicker(journal.events), [journal.events]);
  const summary = useMemo(() => getPortfolioJournalSummary(journal.events), [journal.events]);
  const closedGroups = useMemo(
    () => groupedEvents.filter((group) => isClosingPortfolioTradeEventType(group.latestEvent.type)),
    [groupedEvents]
  );
  const visibleGroups = view === "reviews" ? closedGroups : groupedEvents;
  const orderedGroups = useMemo(() => {
    if (!focusTicker) {
      return visibleGroups;
    }

    return [...visibleGroups].sort((left, right) => {
      if (left.ticker === focusTicker && right.ticker !== focusTicker) {
        return -1;
      }
      if (right.ticker === focusTicker && left.ticker !== focusTicker) {
        return 1;
      }
      return 0;
    });
  }, [focusTicker, visibleGroups]);

  const boardTitle = view === "reviews" ? "종료 리뷰" : "거래 저널";
  const boardDescription =
    view === "reviews"
      ? "이미 끝난 포지션만 모아 놓고 결과를 다시 보는 영역입니다."
      : "첫 매수부터 부분 익절, 손절, 전량 매도까지 실제 체결 흐름을 기록하는 영역입니다.";
  const emptyTitle = view === "reviews" ? "아직 종료된 거래가 없습니다." : "아직 기록된 체결이 없습니다.";
  const emptyDescription =
    view === "reviews"
      ? "전량 매도나 손절로 마감된 거래가 생기면 여기에서 종료 흐름을 다시 볼 수 있습니다."
      : "첫 체결을 기록하면 종목별 생애주기와 종료 결과를 이곳에서 다시 볼 수 있습니다.";

  function openManualDialog() {
    setDialogPreset(null);
    setIsDialogOpen(true);
  }

  function handleDialogSaved(payload: {
    event: PortfolioTradeEvent;
    journal: PortfolioJournal;
    profile?: PortfolioProfilePayload;
    previousJournal?: PortfolioJournal;
    previousProfile?: PortfolioProfilePayload;
  }) {
    onJournalUpdated?.(payload);
  }

  return (
    <section className="space-y-5">
      <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-foreground">{boardTitle}</CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{boardDescription}</p>
            </div>
            {view === "journal" ? (
              <Button type="button" onClick={openManualDialog}>
                <Plus className="h-4 w-4" />
                체결 기록 추가
              </Button>
            ) : (
              <Badge variant="secondary">종료 포지션만 보기</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {view === "journal" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <JournalMetric title="전체 체결" value={`${summary.totalEvents}건`} note="기록된 체결 이벤트" />
              <JournalMetric title="보유 중 포지션" value={`${summary.activeCount}개`} note="아직 종료되지 않은 종목" />
              <JournalMetric title="종료된 포지션" value={`${summary.closedCount}개`} note="전량 매도 또는 손절로 끝난 종목" />
              <JournalMetric title="부분 익절" value={`${summary.partialExitCount}건`} note="일부 수량만 먼저 정리한 기록" />
              <JournalMetric title="손절" value={`${summary.stopLossCount}건`} note="손절로 끝난 기록" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <JournalMetric title="종료된 포지션" value={`${summary.closedCount}개`} note="복기할 수 있는 종목 수" />
              <JournalMetric title="손절 종료" value={`${summary.stopLossCount}건`} note="손절로 끝난 거래 수" />
              <JournalMetric title="부분 익절 기록" value={`${summary.partialExitCount}건`} note="익절 후 종료로 이어진 흐름" />
            </div>
          )}
        </CardContent>
      </Card>

      {orderedGroups.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {orderedGroups.map((group) => {
            const isClosed = isClosingPortfolioTradeEventType(group.latestEvent.type);
            const review = buildPortfolioCloseReview(group);
            const isFocused = focusTicker === group.ticker;

            return (
              <Card
                key={group.ticker}
                className={
                  isFocused
                    ? "border-primary/28 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,241,232,0.92))] shadow-[0_22px_54px_-34px_rgba(139,107,46,0.28)]"
                    : "border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]"
                }
              >
                <CardHeader className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg text-foreground">
                        {group.company} <span className="text-sm font-medium text-muted-foreground">{group.ticker}</span>
                      </CardTitle>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {group.sector} · 이벤트 {group.events.length}건
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isFocused ? <Badge variant="neutral">방금 기록</Badge> : null}
                      <Badge variant={isClosed ? "secondary" : "positive"}>{isClosed ? "종료" : "보유 중"}</Badge>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/portfolio/${group.ticker}`}>상세 보기</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <JournalMiniMetric
                      label="남은 수량"
                      value={group.metrics.remainingQuantity > 0 ? formatQuantity(group.metrics.remainingQuantity) : "0주"}
                    />
                    <JournalMiniMetric
                      label="평균 단가"
                      value={group.metrics.remainingQuantity > 0 ? formatPrice(group.metrics.averageCost) : "종료"}
                    />
                    <JournalMiniMetric label="실현 손익" value={formatSignedPrice(group.metrics.realizedPnl)} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {isClosed ? (
                    <div className="rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,241,232,0.88))] px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">종료 회고</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{review.headline}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.summary}</p>
                    </div>
                  ) : null}

                  {group.events.map((event, index) => {
                    const meta = tradeTypeMeta[event.type];

                    return (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex w-14 shrink-0 flex-col items-center pt-1">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {index === 0 ? "latest" : `#${index + 1}`}
                          </span>
                          {index !== group.events.length - 1 ? <span className="mt-2 h-full w-px bg-border/80" /> : null}
                        </div>

                        <div className="flex-1 rounded-[20px] border border-border/80 bg-[hsl(42_38%_97%)] px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={meta.variant}>{meta.label}</Badge>
                              <span className="text-xs text-muted-foreground">{formatDateTime(event.tradedAt)}</span>
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              {formatPrice(event.price)} · {formatQuantity(event.quantity)}
                            </span>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-foreground/82">{meta.description}</p>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>수수료 {formatPrice(event.fees ?? 0)}</span>
                            <span>기록자 {event.createdBy}</span>
                          </div>

                          {event.note ? (
                            <p className="mt-3 rounded-2xl border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,241,232,0.88))] px-3 py-3 text-xs leading-5 text-muted-foreground">
                              {event.note}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
          <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ScrollText className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-foreground">{emptyTitle}</p>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{emptyDescription}</p>
            </div>
            {view === "journal" ? (
              <Button type="button" variant="outline" onClick={openManualDialog}>
                첫 체결 기록 추가
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/portfolio">보유 화면 보기</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <PortfolioTradeEventDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        positions={positions}
        recentEvents={journal.events}
        currentJournal={journal}
        currentProfile={currentProfile}
        preset={dialogPreset}
        onSaved={handleDialogSaved}
      />
    </section>
  );
}

function JournalMetric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-[22px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] p-4">
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function JournalMiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
