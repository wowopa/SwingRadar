"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildPortfolioCloseReview,
  buildPortfolioReviewSummary,
  groupPortfolioJournalByTicker,
  type PortfolioJournalGroup
} from "@/lib/portfolio/journal-insights";
import { formatPrice } from "@/lib/utils";
import type { PortfolioJournal } from "@/types/recommendation";

function formatSignedPrice(value: number) {
  if (value === 0) {
    return formatPrice(0);
  }

  return `${value > 0 ? "+" : "-"}${formatPrice(Math.abs(value))}`;
}

export function PortfolioReviewsBoard({ journal }: { journal: PortfolioJournal }) {
  const closedGroups = groupPortfolioJournalByTicker(journal.events).filter((group) => {
    return ["exit_full", "stop_loss", "manual_exit"].includes(group.latestEvent.type);
  });
  const summary = buildPortfolioReviewSummary(closedGroups);

  if (!closedGroups.length) {
    return (
      <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]">
        <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <div className="space-y-2">
            <p className="text-base font-semibold text-foreground">아직 종료된 거래가 없습니다.</p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              전량 매도, 손절, 수동 종료가 생기면 이곳에서 종료 흐름과 반복 패턴을 다시 볼 수 있습니다.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/portfolio">보유 화면 보기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-foreground">종료 리뷰</CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                끝난 거래만 따로 모아 손익, 종료 방식, 반복 패턴을 다시 봅니다.
              </p>
            </div>
            <Badge variant="secondary">{summary.closedCount}개 종료 거래</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ReviewMetric title="실현 손익 합계" value={formatSignedPrice(summary.realizedPnlTotal)} />
            <ReviewMetric title="수익 종료" value={`${summary.profitableCount}개`} />
            <ReviewMetric title="손실 종료" value={`${summary.lossCount}개`} />
            <ReviewMetric title="평균 보유일" value={`${summary.averageHoldingDays}일`} />
            <ReviewMetric title="손절 종료" value={`${summary.stopLossCount}개`} />
          </div>

          <div className="grid gap-3 xl:grid-cols-4">
            {summary.patterns.map((pattern) => (
              <PatternCard key={pattern.key} pattern={pattern} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {closedGroups.map((group) => (
          <ClosedReviewCard key={group.ticker + group.latestEvent.tradedAt} group={group} />
        ))}
      </div>
    </section>
  );
}

function ClosedReviewCard({ group }: { group: PortfolioJournalGroup }) {
  const review = buildPortfolioCloseReview(group);

  return (
    <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-foreground">
              {group.company} <span className="text-sm font-medium text-muted-foreground">{group.ticker}</span>
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {group.sector} · {group.holdingDays}일 보유 · 이벤트 {group.events.length}건
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={group.metrics.realizedPnl > 0 ? "positive" : group.metrics.realizedPnl < 0 ? "caution" : "secondary"}>
              {group.latestEvent.type === "stop_loss"
                ? "손절 종료"
                : group.latestEvent.type === "manual_exit"
                  ? "수동 종료"
                  : "전량 매도"}
            </Badge>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/portfolio/${group.ticker}`}>상세 보기</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MiniMetric label="실현 손익" value={formatSignedPrice(group.metrics.realizedPnl)} />
          <MiniMetric label="부분 익절" value={`${group.partialExitCount}회`} />
          <MiniMetric label="종료 시점" value={new Date(group.latestEvent.tradedAt).toLocaleDateString("ko-KR")} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,241,232,0.88))] px-4 py-4">
          <p className="text-sm font-semibold text-foreground">{review.headline}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.summary}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ReviewBlock title="잘한 점" items={review.strengths} tone="positive" emptyLabel="기록된 강점이 아직 없습니다." />
          <ReviewBlock title="다음에 다시 볼 점" items={review.watchouts} tone="caution" emptyLabel="큰 경고 포인트는 아직 없습니다." />
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] p-4">
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PatternCard({
  pattern
}: {
  pattern: ReturnType<typeof buildPortfolioReviewSummary>["patterns"][number];
}) {
  const toneClass =
    pattern.tone === "positive"
      ? "border-positive/22 bg-[hsl(var(--positive)/0.08)]"
      : pattern.tone === "neutral"
        ? "border-primary/22 bg-[hsl(var(--primary)/0.08)]"
        : pattern.tone === "caution"
          ? "border-caution/22 bg-[hsl(var(--caution)/0.08)]"
          : "border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))]";

  return (
    <div className={`rounded-[22px] border px-4 py-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{pattern.label}</p>
        <Badge variant={pattern.tone === "positive" ? "positive" : pattern.tone === "neutral" ? "neutral" : pattern.tone === "caution" ? "caution" : "secondary"}>
          {pattern.count}개
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{pattern.note}</p>
    </div>
  );
}

function ReviewBlock({
  title,
  items,
  tone,
  emptyLabel
}: {
  title: string;
  items: string[];
  tone: "positive" | "caution";
  emptyLabel: string;
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
        {items.length ? (
          items.map((item) => (
            <p key={item} className="text-sm leading-6 text-muted-foreground">
              {item}
            </p>
          ))
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}
