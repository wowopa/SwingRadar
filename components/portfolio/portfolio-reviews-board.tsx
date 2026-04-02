"use client";

import Link from "next/link";

import { PortfolioCloseReviewEditor } from "@/components/portfolio/portfolio-close-review-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildPortfolioCloseReview,
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
import type { PortfolioCloseReviewEntry, PortfolioJournal } from "@/types/recommendation";

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
  focusTicker = null
}: {
  journal: PortfolioJournal;
  openingCheckScans: UserOpeningRecheckScanSnapshot[];
  closeReviews: Record<string, PortfolioCloseReviewEntry>;
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

      <ReviewRuleCandidateCard rules={closeReviewRules} />

      {openingCheckAnalytics ? <OpeningCheckQualityCard analytics={openingCheckAnalytics} /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {orderedClosedGroups.map((group) => (
          <ClosedReviewCard
            key={group.ticker + group.latestEvent.tradedAt}
            group={group}
            reviewEntry={closeReviews[getPortfolioCloseReviewKeyForGroup(group)]}
            isFocused={focusTicker === group.ticker}
          />
        ))}
      </div>
    </section>
  );
}

function ReviewRuleCandidateCard({
  rules
}: {
  rules: ReturnType<typeof buildPortfolioCloseReviewRuleDashboard>;
}) {
  return (
    <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-foreground">반복 회고 규칙 후보</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{rules.summary}</p>
          </div>
          <Badge variant="secondary">{rules.candidateCount}개 후보</Badge>
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
                  <p className="text-sm font-semibold text-foreground">{candidate.count}회</p>
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

function ClosedReviewCard({
  group,
  reviewEntry,
  isFocused = false
}: {
  group: PortfolioJournalGroup;
  reviewEntry?: PortfolioCloseReviewEntry;
  isFocused?: boolean;
}) {
  const review = buildPortfolioCloseReview(group);
  const positionKey = getPortfolioCloseReviewKeyForGroup(group);

  return (
    <Card
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
              {group.sector} · {group.holdingDays}일 보유 · 이벤트 {group.events.length}건
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFocused ? <Badge variant="neutral">방금 기록</Badge> : null}
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

        <div className="rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,241,232,0.88))] px-4 py-4">
          <PortfolioCloseReviewEditor
            positionKey={positionKey}
            ticker={group.ticker}
            closedAt={group.latestEvent.tradedAt}
            review={reviewEntry}
            compact
          />
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
