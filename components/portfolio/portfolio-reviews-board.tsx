"use client";

import Link from "next/link";
import { useState } from "react";

import { PortfolioCloseReviewEditor } from "@/components/portfolio/portfolio-close-review-editor";
import { PortfolioPersonalRuleButton } from "@/components/portfolio/portfolio-personal-rule-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildPortfolioCloseReviewRuleDashboard,
  buildPortfolioOpeningCheckAnalytics,
  buildPortfolioReviewAnalytics,
  buildPortfolioReviewCalendarDashboard,
  buildPortfolioReviewSummary,
  groupPortfolioJournalByTicker,
  type PortfolioJournalGroup
} from "@/lib/portfolio/journal-insights";
import { getPortfolioCloseReviewKeyForGroup } from "@/lib/portfolio/review-keys";
import { formatPrice } from "@/lib/utils";
import type { UserOpeningRecheckScanSnapshot } from "@/lib/server/user-opening-recheck-board";
import type {
  PortfolioCloseReviewEntry,
  PortfolioJournal,
  PortfolioPersonalRuleEntry
} from "@/types/recommendation";

function formatSignedPrice(value: number) {
  if (value === 0) {
    return formatPrice(0);
  }

  return `${value > 0 ? "+" : "-"}${formatPrice(Math.abs(value))}`;
}

export function PortfolioReviewsBoard({
  journal,
  openingCheckScans,
  closeReviews,
  personalRules,
  focusTicker = null
}: {
  journal: PortfolioJournal;
  openingCheckScans: UserOpeningRecheckScanSnapshot[];
  closeReviews: Record<string, PortfolioCloseReviewEntry>;
  personalRules: PortfolioPersonalRuleEntry[];
  focusTicker?: string | null;
}) {
  const closedGroups = groupPortfolioJournalByTicker(journal.events).filter((group) => {
    return ["exit_full", "stop_loss", "manual_exit"].includes(group.latestEvent.type);
  });
  const orderedClosedGroups = focusTicker
    ? [...closedGroups].sort((left, right) => {
        if (left.ticker === focusTicker && right.ticker !== focusTicker) {
          return -1;
        }
        if (right.ticker === focusTicker && left.ticker !== focusTicker) {
          return 1;
        }
        return 0;
      })
    : closedGroups;
  const summary = buildPortfolioReviewSummary(closedGroups);
  const calendar = buildPortfolioReviewCalendarDashboard(closedGroups);
  const analytics = buildPortfolioReviewAnalytics(closedGroups);
  const closeReviewRules = buildPortfolioCloseReviewRuleDashboard(closeReviews);
  const openingCheckAnalytics = buildPortfolioOpeningCheckAnalytics(closedGroups, openingCheckScans);

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

      <div className="grid gap-5 xl:grid-cols-[1.25fr,0.95fr]">
        <ReviewCalendarCard calendar={calendar} />
        <ReviewBehaviorCard calendar={calendar} />
      </div>

      <ReviewStrategyCard analytics={analytics} />

      <ReviewRuleCandidateCard rules={closeReviewRules} personalRules={personalRules} />

      {openingCheckAnalytics ? <OpeningCheckQualityCard analytics={openingCheckAnalytics} /> : null}

      <ClosedReviewTable
        groups={orderedClosedGroups}
        closeReviews={closeReviews}
        focusTicker={focusTicker}
      />
    </section>
  );
}

function ReviewRuleCandidateCard({
  rules,
  personalRules
}: {
  rules: ReturnType<typeof buildPortfolioCloseReviewRuleDashboard>;
  personalRules: PortfolioPersonalRuleEntry[];
}) {
  return (
    <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-foreground">반복 회고 규칙 후보</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{rules.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{rules.candidateCount}개 후보</Badge>
            <Button asChild size="sm" variant="ghost">
              <Link href="/portfolio?tab=rules">규칙 관리</Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.candidates.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {rules.candidates.map((candidate) => (
              <div
                key={candidate.id}
                className={
                  candidate.tone === "positive"
                    ? "rounded-[20px] border border-positive/22 bg-[hsl(var(--positive)/0.08)] px-4 py-4"
                    : candidate.tone === "caution"
                      ? "rounded-[20px] border border-caution/22 bg-[hsl(var(--caution)/0.08)] px-4 py-4"
                      : "rounded-[20px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-4"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">{candidate.text}</p>
                    <p className="text-xs leading-5 text-muted-foreground">{candidate.note}</p>
                  </div>
                  <Badge
                    variant={
                      candidate.tone === "positive"
                        ? "positive"
                        : candidate.tone === "caution"
                          ? "caution"
                          : "secondary"
                    }
                  >
                    {candidate.categoryLabel}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">종료 회고에서 반복된 문장</p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-foreground">{candidate.count}회</p>
                    <PortfolioPersonalRuleButton
                      text={candidate.text}
                      sourceCategory={candidate.category}
                      existingRules={personalRules}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-5 text-sm leading-6 text-muted-foreground">
            반복해서 남긴 회고 문장이 아직 적어 규칙 후보가 뚜렷하지 않습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewCalendarCard({
  calendar
}: {
  calendar: ReturnType<typeof buildPortfolioReviewCalendarDashboard>;
}) {
  const monthParts = calendar.monthKey?.split("-").map(Number) ?? [];
  const daysInMonth =
    monthParts.length === 2 ? new Date(monthParts[0], monthParts[1], 0).getDate() : 0;
  const firstWeekday =
    monthParts.length === 2 ? new Date(`${calendar.monthKey}-01T00:00:00+09:00`).getDay() : 0;
  const dayMap = new Map(calendar.days.map((day) => [day.dayOfMonth, day]));
  const cells = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(<div key={`blank-${index}`} className="aspect-[1/0.88] rounded-2xl border border-transparent" />);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const data = dayMap.get(day);
    const toneClass = !data
      ? "border-border/60 bg-[hsl(42_38%_98%)]"
      : data.realizedPnl > 0
        ? "border-positive/25 bg-[hsl(var(--positive)/0.12)]"
        : data.realizedPnl < 0
          ? "border-caution/25 bg-[hsl(var(--caution)/0.12)]"
          : "border-border/70 bg-[hsl(42_38%_97%)]";

    cells.push(
      <div key={day} className={`aspect-[1/0.88] rounded-2xl border px-2 py-2 ${toneClass}`}>
        <p className="text-[11px] font-medium text-muted-foreground">{day}</p>
        {data ? (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-semibold text-foreground">{formatSignedPrice(data.realizedPnl)}</p>
            <p className="text-[11px] leading-4 text-muted-foreground">{data.closedCount}건 종료</p>
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-muted-foreground">기록 없음</p>
        )}
      </div>
    );
  }

  return (
    <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg text-foreground">월간 종료 캘린더</CardTitle>
          <Badge variant="secondary">{calendar.monthLabel}</Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          어느 날 손절이 많았는지, 어느 날 수익 종료가 몰렸는지 날짜 기준으로 다시 봅니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {["일", "월", "화", "수", "목", "금", "토"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">{cells}</div>
      </CardContent>
    </Card>
  );
}

function ReviewBehaviorCard({
  calendar
}: {
  calendar: ReturnType<typeof buildPortfolioReviewCalendarDashboard>;
}) {
  return (
    <div className="space-y-5">
      <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
        <CardHeader className="space-y-3">
          <CardTitle className="text-lg text-foreground">최근 주간 흐름</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            최근 6주를 기준으로 손익과 종료 방식이 어떻게 달라졌는지 봅니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {calendar.weeks.length ? (
            calendar.weeks.map((week) => (
              <div
                key={week.weekKey}
                className="rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{week.label}</p>
                  <Badge variant={week.realizedPnl > 0 ? "positive" : week.realizedPnl < 0 ? "caution" : "secondary"}>
                    {formatSignedPrice(week.realizedPnl)}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>종료 {week.closedCount}건</span>
                  <span>손절 {week.stopLossCount}건</span>
                  <span>부분 익절 {week.partialTakeCount}건</span>
                  <span>평균 {week.averageHoldingDays}일</span>
                  <span>메모 {week.memoCoverageRate}%</span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[20px] border border-border/80 bg-[hsl(42_38%_97%)] px-4 py-5 text-sm leading-6 text-muted-foreground">
              최근 주간 종료 기록이 아직 충분하지 않습니다.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
        <CardHeader className="space-y-3">
          <CardTitle className="text-lg text-foreground">행동 지표</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            손절, 부분 익절, 메모 기록, 보유 기간 같은 운영 습관을 비율로 다시 봅니다.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <BehaviorMetric title="메모 기록률" value={`${calendar.behavior.memoCoverageRate}%`} note="종료 거래 중 메모가 남은 비율" tone="neutral" />
          <BehaviorMetric title="부분 익절 활용" value={`${calendar.behavior.partialTakeUsageRate}%`} note="부분 익절 후 종료된 거래 비율" tone="positive" />
          <BehaviorMetric title="3일 내 정리" value={`${calendar.behavior.quickCloseRate}%`} note="짧게 끝난 종료 거래 비율" tone="neutral" />
          <BehaviorMetric title="8일 이상 보유" value={`${calendar.behavior.extendedHoldRate}%`} note="길게 끈 종료 거래 비율" tone="caution" />
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewStrategyCard({
  analytics
}: {
  analytics: ReturnType<typeof buildPortfolioReviewAnalytics>;
}) {
  return (
    <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-foreground">규칙 분석</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{analytics.summary}</p>
          </div>
          <Badge variant="secondary">종료 거래 기준</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {analytics.ruleMetrics.map((metric) => (
            <BehaviorMetric
              key={metric.key}
              title={metric.label}
              value={metric.value}
              note={metric.note}
              tone={metric.tone}
            />
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <DistributionCard title="보유 기간 분포" items={analytics.holdDistribution} />
          <DistributionCard title="손익 구간 분포" items={analytics.pnlDistribution} />
          <TagInsightCard analytics={analytics} />
        </div>
      </CardContent>
    </Card>
  );
}

function OpeningCheckQualityCard({
  analytics
}: {
  analytics: NonNullable<ReturnType<typeof buildPortfolioOpeningCheckAnalytics>>;
}) {
  return (
    <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-foreground">장초 판단 품질</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{analytics.summary}</p>
          </div>
          <Badge variant="secondary">{analytics.matchedCount}건 연결</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BehaviorMetric
            title="연결된 종료 거래"
            value={`${analytics.matchedCount}건`}
            note={analytics.unmatchedCount > 0 ? `아직 연결되지 않은 종료 거래 ${analytics.unmatchedCount}건` : "종료 거래와 장초 판단을 연결했습니다."}
            tone="neutral"
          />
          <BehaviorMetric
            title="수익 종료"
            value={`${analytics.profitableCount}건`}
            note="장초 판단 기록이 있는 종료 거래 중 수익으로 끝난 건수"
            tone="positive"
          />
          <BehaviorMetric
            title="손실 종료"
            value={`${analytics.lossCount}건`}
            note="장초 판단 기록이 있는 종료 거래 중 손실로 끝난 건수"
            tone="caution"
          />
          <BehaviorMetric
            title="보류 후 진입"
            value={`${analytics.overrideCount}건`}
            note="보류/제외 판단인데 실제로 진입한 거래 수"
            tone={analytics.overrideCount > 0 ? "caution" : "positive"}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] p-4">
            <p className="text-sm font-semibold text-foreground">상태별 종료 결과</p>
            <div className="mt-4 space-y-3">
              {analytics.statusInsights.map((item) => (
                <div key={item.status} className="rounded-[18px] border border-border/80 bg-white/85 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <Badge
                      variant={
                        item.status === "passed"
                          ? "positive"
                          : item.status === "watch"
                            ? "neutral"
                            : "caution"
                      }
                    >
                      승률 {item.winRate}%
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.note}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>전체 {item.count}건</span>
                    <span>수익 {item.profitableCount}건</span>
                    <span>손실 {item.lossCount}건</span>
                    <span>보합 {item.flatCount}건</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] p-4">
            <p className="text-sm font-semibold text-foreground">자주 나온 장초 체크 조합</p>
            <div className="mt-4 space-y-3">
              {analytics.patterns.length ? (
                analytics.patterns.map((pattern) => (
                  <div key={pattern.id} className="rounded-[18px] border border-border/80 bg-white/85 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{pattern.title}</p>
                      <Badge variant={pattern.winRate >= 50 ? "positive" : "caution"}>{pattern.winRate}%</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{pattern.note}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>전체 {pattern.count}건</span>
                      <span>수익 {pattern.profitableCount}건</span>
                      <span>손실 {pattern.lossCount}건</span>
                      <span>보합 {pattern.flatCount}건</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-border/80 bg-white/85 px-4 py-4 text-sm leading-6 text-muted-foreground">
                  아직 체크리스트가 함께 저장된 장초 확인 기록이 충분하지 않습니다.
                </div>
              )}
            </div>
          </div>
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

function BehaviorMetric({
  title,
  value,
  note,
  tone
}: {
  title: string;
  value: string;
  note: string;
  tone: "positive" | "neutral" | "caution";
}) {
  const toneClass =
    tone === "positive"
      ? "border-positive/22 bg-[hsl(var(--positive)/0.08)]"
      : tone === "neutral"
        ? "border-primary/22 bg-[hsl(var(--primary)/0.08)]"
        : "border-caution/22 bg-[hsl(var(--caution)/0.08)]";

  return (
    <div className={`rounded-[22px] border p-4 ${toneClass}`}>
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
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

function DistributionCard({
  title,
  items
}: {
  title: string;
  items: ReturnType<typeof buildPortfolioReviewAnalytics>["holdDistribution"];
}) {
  return (
    <div className="rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.key} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.note}</p>
              </div>
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
                {item.count}건
              </Badge>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[hsl(42_32%_92%)]">
              <div
                className={
                  item.tone === "positive"
                    ? "h-full rounded-full bg-[hsl(var(--positive))]"
                    : item.tone === "neutral"
                      ? "h-full rounded-full bg-[hsl(var(--primary))]"
                      : item.tone === "caution"
                        ? "h-full rounded-full bg-[hsl(var(--caution))]"
                        : "h-full rounded-full bg-[hsl(var(--muted-foreground)/0.55)]"
                }
                style={{ width: `${Math.max(item.ratio, item.count > 0 ? 10 : 0)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{item.ratio}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatReviewActivityDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function getClosedGroupStatusLabel(group: PortfolioJournalGroup) {
  if (group.latestEvent.type === "stop_loss") {
    return "손절 종료";
  }

  if (group.latestEvent.type === "manual_exit") {
    return "수동 종료";
  }

  return "전량 매도";
}

function ClosedReviewTable({
  groups,
  closeReviews,
  focusTicker
}: {
  groups: PortfolioJournalGroup[];
  closeReviews: Record<string, PortfolioCloseReviewEntry>;
  focusTicker?: string | null;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const editingGroup =
    editingKey === null
      ? null
      : groups.find((group) => getPortfolioCloseReviewKeyForGroup(group) === editingKey) ?? null;

  return (
    <>
      <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-foreground">종목별 회고 목록</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                종료된 종목을 표로 다시 보고, 필요한 회고만 수정하거나 상세 차트로 이어서 확인합니다.
              </p>
            </div>
            <Badge variant="secondary">{groups.length}개 종목</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 lg:hidden">
            {groups.map((group) => {
              const positionKey = getPortfolioCloseReviewKeyForGroup(group);
              const reviewEntry = closeReviews[positionKey];
              const isFocused = focusTicker === group.ticker;
              const statusLabel = getClosedGroupStatusLabel(group);
              const statusVariant =
                group.latestEvent.type === "stop_loss"
                  ? "caution"
                  : group.latestEvent.type === "manual_exit"
                    ? "neutral"
                    : "positive";

              return (
                <div
                  key={`${positionKey}-mobile`}
                  className={
                    isFocused
                      ? "rounded-[22px] border border-primary/24 bg-primary/8 px-4 py-4"
                      : "rounded-[22px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-4"
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{group.company}</p>
                        <span className="text-xs text-muted-foreground">{group.ticker}</span>
                        {isFocused ? <Badge variant="neutral">방금 기록</Badge> : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {group.sector} · {group.holdingDays}일 보유 · 실현 {formatSignedPrice(group.metrics.realizedPnl)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusVariant}>{statusLabel}</Badge>
                      <Badge variant={reviewEntry ? "secondary" : "neutral"}>
                        {reviewEntry ? "회고 작성됨" : "회고 작성 전"}
                      </Badge>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    최근 진행일 {formatReviewActivityDate(group.latestEvent.tradedAt)} · 이벤트 {group.events.length}건 · 부분 익절 {group.partialExitCount}회
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingKey(positionKey)}
                    >
                      {reviewEntry ? "회고 수정" : "회고 작성"}
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/portfolio/${group.ticker}`}>상세 보기</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-[780px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left">
                  <th className="border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    종목
                  </th>
                  <th className="border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    최근 진행일
                  </th>
                  <th className="border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    진행 상태
                  </th>
                  <th className="border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    회고 수정
                  </th>
                  <th className="border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    상세 보기
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const positionKey = getPortfolioCloseReviewKeyForGroup(group);
                  const reviewEntry = closeReviews[positionKey];
                  const isFocused = focusTicker === group.ticker;
                  const statusLabel = getClosedGroupStatusLabel(group);
                  const statusVariant =
                    group.latestEvent.type === "stop_loss"
                      ? "caution"
                      : group.latestEvent.type === "manual_exit"
                        ? "neutral"
                        : "positive";

                  return (
                    <tr
                      key={positionKey}
                      className={isFocused ? "bg-[hsl(var(--primary)/0.06)]" : undefined}
                    >
                      <td className="border-b border-border/60 px-4 py-4 align-top">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{group.company}</p>
                            <span className="text-xs text-muted-foreground">{group.ticker}</span>
                            {isFocused ? <Badge variant="neutral">방금 기록</Badge> : null}
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">
                            {group.sector} · {group.holdingDays}일 보유 · 실현 {formatSignedPrice(group.metrics.realizedPnl)}
                          </p>
                        </div>
                      </td>
                      <td className="border-b border-border/60 px-4 py-4 align-top">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {formatReviewActivityDate(group.latestEvent.tradedAt)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            이벤트 {group.events.length}건 · 부분 익절 {group.partialExitCount}회
                          </p>
                        </div>
                      </td>
                      <td className="border-b border-border/60 px-4 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                          <Badge variant={reviewEntry ? "secondary" : "neutral"}>
                            {reviewEntry ? "회고 작성됨" : "회고 작성 전"}
                          </Badge>
                        </div>
                      </td>
                      <td className="border-b border-border/60 px-4 py-4 align-top">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingKey(positionKey)}
                        >
                          {reviewEntry ? "회고 수정" : "회고 작성"}
                        </Button>
                      </td>
                      <td className="border-b border-border/60 px-4 py-4 align-top">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/portfolio/${group.ticker}`}>상세 보기</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingGroup)} onOpenChange={(open) => (open ? null : setEditingKey(null))}>
        <DialogContent className="max-w-2xl">
          {editingGroup ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {editingGroup.company} 회고 {closeReviews[editingKey ?? ""] ? "수정" : "작성"}
                </DialogTitle>
                <DialogDescription>
                  종료된 거래를 짧게 다시 적어두면 다음 장초 판단과 개인 규칙에 바로 이어집니다.
                </DialogDescription>
              </DialogHeader>
              <PortfolioCloseReviewEditor
                positionKey={editingKey ?? ""}
                ticker={editingGroup.ticker}
                closedAt={editingGroup.latestEvent.tradedAt}
                review={closeReviews[editingKey ?? ""]}
                onSaved={() => setEditingKey(null)}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TagInsightCard({
  analytics
}: {
  analytics: ReturnType<typeof buildPortfolioReviewAnalytics>;
}) {
  return (
    <div className="rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] p-4">
      <p className="text-sm font-semibold text-foreground">메모에서 자주 보인 태그</p>
      <div className="mt-4 space-y-3">
        {analytics.tagInsights.length ? (
          analytics.tagInsights.map((tag) => (
            <div key={tag.key} className="rounded-[18px] border border-border/80 bg-white/80 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{tag.label}</p>
                <Badge variant="secondary">
                  {tag.count}건 · {tag.ratio}%
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{tag.note}</p>
            </div>
          ))
        ) : (
          <div className="rounded-[18px] border border-border/80 bg-white/80 px-3 py-4 text-sm leading-6 text-muted-foreground">
            아직 메모 안에서 반복되는 태그가 충분히 쌓이지 않았습니다.
          </div>
        )}
      </div>
    </div>
  );
}
