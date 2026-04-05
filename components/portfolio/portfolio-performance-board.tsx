"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { PortfolioPersonalRuleButton } from "@/components/portfolio/portfolio-personal-rule-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildPortfolioCloseReviewRuleDashboard,
  buildPortfolioOpeningCheckAnalytics,
  buildPortfolioPerformanceDashboard,
  filterPortfolioGroupsByDays,
  groupPortfolioJournalByTicker
} from "@/lib/portfolio/journal-insights";
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

type PerformanceRange = "30d" | "90d" | "all";

const RANGE_OPTIONS: Array<{ key: PerformanceRange; label: string; days: number | "all"; note: string }> = [
  { key: "30d", label: "최근 30일", days: 30, note: "가장 최근 한 달의 종료 거래만 봅니다." },
  { key: "90d", label: "최근 90일", days: 90, note: "최근 세 달의 종료 거래 흐름을 봅니다." },
  { key: "all", label: "전체", days: "all", note: "누적 종료 거래 전체를 기준으로 봅니다." }
];

export function PortfolioPerformanceBoard({
  journal,
  openingCheckScans,
  closeReviews,
  personalRules
}: {
  journal: PortfolioJournal;
  openingCheckScans: UserOpeningRecheckScanSnapshot[];
  closeReviews: Record<string, PortfolioCloseReviewEntry>;
  personalRules: PortfolioPersonalRuleEntry[];
}) {
  const [range, setRange] = useState<PerformanceRange>("90d");
  const allClosedGroups = useMemo(
    () =>
      groupPortfolioJournalByTicker(journal.events).filter((group) =>
        ["exit_full", "stop_loss", "manual_exit"].includes(group.latestEvent.type)
      ),
    [journal.events]
  );
  const selectedRange = RANGE_OPTIONS.find((option) => option.key === range) ?? RANGE_OPTIONS[1];
  const closedGroups = useMemo(
    () => filterPortfolioGroupsByDays(allClosedGroups, selectedRange.days),
    [allClosedGroups, selectedRange.days]
  );
  const performance = useMemo(() => buildPortfolioPerformanceDashboard(closedGroups), [closedGroups]);
  const openingAnalytics = useMemo(
    () => buildPortfolioOpeningCheckAnalytics(closedGroups, openingCheckScans),
    [closedGroups, openingCheckScans]
  );
  const closeReviewRules = useMemo(
    () => buildPortfolioCloseReviewRuleDashboard(closeReviews),
    [closeReviews]
  );

  return (
    <section className="space-y-5">
      <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-foreground">계좌 성과</CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{performance.summary}</p>
            </div>
            <Badge variant="secondary">{performance.closedCount}개 종료 거래</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                className={
                  option.key === range
                    ? "inline-flex h-9 items-center rounded-full border border-primary/24 bg-primary/10 px-3.5 text-xs font-medium text-primary"
                    : "inline-flex h-9 items-center rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-3.5 text-xs font-medium text-foreground/76 transition hover:border-primary/24 hover:bg-white"
                }
              >
                {option.label}
              </button>
            ))}
            <span className="text-xs leading-5 text-muted-foreground">{selectedRange.note}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <PerformanceMetric title="누적 실현손익" value={formatSignedPrice(performance.realizedPnlTotal)} tone="primary" />
            <PerformanceMetric title="승률" value={`${performance.winRate}%`} tone="positive" />
            <PerformanceMetric title="평균 보유일" value={`${performance.averageHoldingDays}일`} tone="neutral" />
            <PerformanceMetric title="손절 비율" value={`${performance.stopLossRate}%`} tone="caution" />
            <PerformanceMetric title="부분 익절 활용" value={`${performance.partialTakeUsageRate}%`} tone="positive" />
            <PerformanceMetric title="수익/손실" value={`${performance.profitableCount}/${performance.lossCount}`} tone="neutral" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <HighlightCard
              title="가장 좋았던 주간"
              value={
                performance.bestWeeklyPeriod
                  ? `${performance.bestWeeklyPeriod.label} · ${formatSignedPrice(performance.bestWeeklyPeriod.realizedPnl)}`
                  : "기록 대기"
              }
              note={
                performance.bestWeeklyPeriod
                  ? `${performance.bestWeeklyPeriod.closedCount}개 종료 · 승률 ${performance.bestWeeklyPeriod.winRate}%`
                  : "주간 성과가 쌓이면 자동으로 표시됩니다."
              }
              tone="positive"
            />
            <HighlightCard
              title="가장 흔들렸던 주간"
              value={
                performance.worstWeeklyPeriod
                  ? `${performance.worstWeeklyPeriod.label} · ${formatSignedPrice(performance.worstWeeklyPeriod.realizedPnl)}`
                  : "기록 대기"
              }
              note={
                performance.worstWeeklyPeriod
                  ? `${performance.worstWeeklyPeriod.closedCount}개 종료 · 승률 ${performance.worstWeeklyPeriod.winRate}%`
                  : "손실 주간이 생기면 여기서 다시 복기할 수 있습니다."
              }
              tone="caution"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 lg:hidden">
        <details className="rounded-3xl border border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            손익 흐름
            <Badge variant="secondary">주간 · 월간 · 누적</Badge>
          </summary>
          <div className="space-y-4 border-t border-border/70 px-4 py-4">
            <PeriodFlowCard
              title="최근 주간 손익 흐름"
              periods={performance.weekly}
              emptyLabel="최근 주간 손익이 쌓이면 이 영역에서 계좌 리듬을 바로 볼 수 있습니다."
            />
            <PeriodFlowCard
              title="최근 월간 손익 흐름"
              periods={performance.monthly}
              emptyLabel="월간 종료 거래가 쌓이면 이 영역에서 월별 흐름을 바로 볼 수 있습니다."
            />
            <EquityCurveCard points={performance.equityCurve} />
          </div>
        </details>

        <details className="rounded-3xl border border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            판단 / 전략
            <Badge variant="secondary">장초 · 태그 · 종료 이유</Badge>
          </summary>
          <div className="space-y-4 border-t border-border/70 px-4 py-4">
            <Card className="border-border/80 bg-white/90 shadow-none">
              <CardHeader className="space-y-3">
                <CardTitle className="text-lg text-foreground">장초 판단 영향</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  장초 통과 뒤 진입한 거래와 보류를 강행한 거래가 실제로 어떤 손익으로 끝났는지 바로 비교합니다.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {openingAnalytics?.behaviorImpacts.length ? (
                  openingAnalytics.behaviorImpacts.map((impact) => (
                    <InsightRow
                      key={impact.key}
                      title={impact.label}
                      value={formatSignedPrice(impact.realizedPnl)}
                      badge={`${impact.count}건 · 평균 ${formatSignedPrice(impact.averagePnl)}`}
                      note={`${impact.note} · 승률 ${impact.winRate}%`}
                      tone={impact.tone}
                    />
                  ))
                ) : (
                  <EmptyInsight label="아직 장초 판단 영향까지 비교할 종료 거래가 충분하지 않습니다." />
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-white/90 shadow-none">
              <CardHeader className="space-y-3">
                <CardTitle className="text-lg text-foreground">전략 태그별 성과</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  메모에 반복해서 남긴 전략 태그를 기준으로, 어떤 방식이 실제 수익과 더 자주 연결되는지 빠르게 봅니다.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {performance.strategyTags.length ? (
                  performance.strategyTags.map((tag) => (
                    <InsightRow
                      key={tag.key}
                      title={tag.label}
                      value={formatSignedPrice(tag.realizedPnl)}
                      badge={`${tag.count}건 · 승률 ${tag.winRate}%`}
                      note={tag.note}
                      tone={tag.realizedPnl > 0 ? "positive" : tag.realizedPnl < 0 ? "caution" : "neutral"}
                    />
                  ))
                ) : (
                  <EmptyInsight label="반복해서 남긴 전략 태그가 아직 충분하지 않습니다." />
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-white/90 shadow-none">
              <CardHeader className="space-y-3">
                <CardTitle className="text-lg text-foreground">종료 이유 분포</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  전량 매도, 손절, 수동 종료가 실제로 어떤 결과로 이어졌는지 종료 방식별로 나눠 봅니다.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {performance.exitReasons.map((reason) => (
                  <InsightRow
                    key={reason.key}
                    title={reason.label}
                    value={formatSignedPrice(reason.realizedPnl)}
                    badge={`${reason.count}건 · ${reason.ratio}%`}
                    note={`${reason.note} · 승률 ${reason.winRate}%`}
                    tone={reason.tone}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        </details>

        <details className="rounded-3xl border border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            규칙 / 품질
            <Badge variant="secondary">회고 규칙 · 운영 신호</Badge>
          </summary>
          <div className="space-y-4 border-t border-border/70 px-4 py-4">
            <Card className="border-border/80 bg-white/90 shadow-none">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg text-foreground">반복 회고 규칙</CardTitle>
                    <p className="text-sm leading-6 text-muted-foreground">{closeReviewRules.summary}</p>
                  </div>
                  <Badge variant="secondary">{closeReviewRules.reviewedCount}개 회고</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {closeReviewRules.candidates.length ? (
                  closeReviewRules.candidates.slice(0, 4).map((candidate) => (
                    <InsightRow
                      key={candidate.id}
                      title={candidate.text}
                      value={`${candidate.count}회`}
                      badge={candidate.categoryLabel}
                      note={candidate.note}
                      tone={candidate.tone}
                      action={
                        <PortfolioPersonalRuleButton
                          text={candidate.text}
                          sourceCategory={candidate.category}
                          existingRules={personalRules}
                        />
                      }
                    />
                  ))
                ) : (
                  <EmptyInsight label="반복해서 남긴 종료 회고 문장이 아직 적어 규칙 후보가 뚜렷하지 않습니다." />
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-white/90 shadow-none">
              <CardHeader className="space-y-3">
                <CardTitle className="text-lg text-foreground">운용 품질 신호</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">
                  주간·월간 성과 외에, 장초 기록과 실제 종료가 얼마나 잘 연결되고 있는지도 함께 봅니다.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <QualityMetric
                  title="장초 기록 연결"
                  value={openingAnalytics ? `${openingAnalytics.matchedCount}건` : "0건"}
                  note={
                    openingAnalytics
                      ? `종료 거래 ${openingAnalytics.matchedCount}건이 장초 판단과 연결됐습니다.`
                      : "아직 장초 판단과 연결된 종료 거래가 충분하지 않습니다."
                  }
                  tone="neutral"
                />
                <QualityMetric
                  title="보류 강행"
                  value={openingAnalytics ? `${openingAnalytics.overrideCount}건` : "0건"}
                  note="보류/제외였는데도 진입한 종료 거래 수입니다."
                  tone={openingAnalytics && openingAnalytics.overrideCount > 0 ? "caution" : "positive"}
                />
                <QualityMetric
                  title="장초 후 수익 종료"
                  value={openingAnalytics ? `${openingAnalytics.profitableCount}건` : "0건"}
                  note="장초 기록이 남아 있는 종료 거래 중 수익으로 끝난 건수입니다."
                  tone="positive"
                />
                <QualityMetric
                  title="장초 후 손실 종료"
                  value={openingAnalytics ? `${openingAnalytics.lossCount}건` : "0건"}
                  note="장초 기록이 남아 있는 종료 거래 중 손실로 끝난 건수입니다."
                  tone="caution"
                />
              </CardContent>
            </Card>
          </div>
        </details>
      </div>

      <div className="hidden gap-5 lg:grid xl:grid-cols-[1.2fr,0.8fr]">
        <PeriodFlowCard
          title="최근 주간 손익 흐름"
          periods={performance.weekly}
          emptyLabel="최근 주간 손익이 쌓이면 이 영역에서 계좌 리듬을 바로 볼 수 있습니다."
        />
        <PeriodFlowCard
          title="최근 월간 손익 흐름"
          periods={performance.monthly}
          emptyLabel="월간 종료 거래가 쌓이면 이 영역에서 월별 흐름을 바로 볼 수 있습니다."
        />
      </div>

      <div className="hidden gap-5 lg:grid xl:grid-cols-[1.15fr,0.85fr]">
        <EquityCurveCard points={performance.equityCurve} />

        <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg text-foreground">장초 판단 영향</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              장초 통과 뒤 진입한 거래와 보류를 강행한 거래가 실제로 어떤 손익으로 끝났는지 바로 비교합니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {openingAnalytics?.behaviorImpacts.length ? (
              openingAnalytics.behaviorImpacts.map((impact) => (
                <InsightRow
                  key={impact.key}
                  title={impact.label}
                  value={formatSignedPrice(impact.realizedPnl)}
                  badge={`${impact.count}건 · 평균 ${formatSignedPrice(impact.averagePnl)}`}
                  note={`${impact.note} · 승률 ${impact.winRate}%`}
                  tone={impact.tone}
                />
              ))
            ) : (
              <EmptyInsight label="아직 장초 판단 영향까지 비교할 종료 거래가 충분하지 않습니다." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden gap-5 lg:grid xl:grid-cols-2">
        <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg text-foreground">전략 태그별 성과</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              메모에 반복해서 남긴 전략 태그를 기준으로, 어떤 방식이 실제 수익과 더 자주 연결되는지 빠르게 봅니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {performance.strategyTags.length ? (
              performance.strategyTags.map((tag) => (
                <InsightRow
                  key={tag.key}
                  title={tag.label}
                  value={formatSignedPrice(tag.realizedPnl)}
                  badge={`${tag.count}건 · 승률 ${tag.winRate}%`}
                  note={tag.note}
                  tone={tag.realizedPnl > 0 ? "positive" : tag.realizedPnl < 0 ? "caution" : "neutral"}
                />
              ))
            ) : (
              <EmptyInsight label="반복해서 남긴 전략 태그가 아직 충분하지 않습니다." />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg text-foreground">종료 이유 분포</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              전량 매도, 손절, 수동 종료가 실제로 어떤 결과로 이어졌는지 종료 방식별로 나눠 봅니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {performance.exitReasons.map((reason) => (
              <InsightRow
                key={reason.key}
                title={reason.label}
                value={formatSignedPrice(reason.realizedPnl)}
                badge={`${reason.count}건 · ${reason.ratio}%`}
                note={`${reason.note} · 승률 ${reason.winRate}%`}
                tone={reason.tone}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="hidden border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)] lg:block">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-foreground">반복 회고 규칙</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">{closeReviewRules.summary}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{closeReviewRules.reviewedCount}개 회고</Badge>
              <Link
                href="/portfolio?tab=rules"
                className="inline-flex h-8 items-center rounded-full border border-border/80 bg-white px-3 text-xs font-medium text-foreground/78 transition hover:border-primary/24 hover:text-primary"
              >
                규칙 관리
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {closeReviewRules.candidates.length ? (
            closeReviewRules.candidates.slice(0, 4).map((candidate) => (
              <InsightRow
                key={candidate.id}
                title={candidate.text}
                value={`${candidate.count}회`}
                badge={candidate.categoryLabel}
                note={candidate.note}
                tone={candidate.tone}
                action={
                  <PortfolioPersonalRuleButton
                    text={candidate.text}
                    sourceCategory={candidate.category}
                    existingRules={personalRules}
                  />
                }
              />
            ))
          ) : (
            <EmptyInsight label="반복해서 남긴 종료 회고 문장이 아직 적어 규칙 후보가 뚜렷하지 않습니다." />
          )}
        </CardContent>
      </Card>

      <Card className="hidden border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)] lg:block">
        <CardHeader className="space-y-3">
          <CardTitle className="text-lg text-foreground">운용 품질 신호</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            주간·월간 성과 외에, 장초 기록과 실제 종료가 얼마나 잘 연결되고 있는지도 함께 봅니다.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QualityMetric
            title="장초 기록 연결"
            value={openingAnalytics ? `${openingAnalytics.matchedCount}건` : "0건"}
            note={
              openingAnalytics
                ? `종료 거래 ${openingAnalytics.matchedCount}건이 장초 판단과 연결됐습니다.`
                : "아직 장초 판단과 연결된 종료 거래가 충분하지 않습니다."
            }
            tone="neutral"
          />
          <QualityMetric
            title="보류 강행"
            value={openingAnalytics ? `${openingAnalytics.overrideCount}건` : "0건"}
            note="보류/제외였는데도 진입한 종료 거래 수입니다."
            tone={openingAnalytics && openingAnalytics.overrideCount > 0 ? "caution" : "positive"}
          />
          <QualityMetric
            title="장초 후 수익 종료"
            value={openingAnalytics ? `${openingAnalytics.profitableCount}건` : "0건"}
            note="장초 기록이 남아 있는 종료 거래 중 수익으로 끝난 건수입니다."
            tone="positive"
          />
          <QualityMetric
            title="장초 후 손실 종료"
            value={openingAnalytics ? `${openingAnalytics.lossCount}건` : "0건"}
            note="장초 기록이 남아 있는 종료 거래 중 손실로 끝난 건수입니다."
            tone="caution"
          />
        </CardContent>
      </Card>
    </section>
  );
}

function PerformanceMetric({
  title,
  value,
  tone
}: {
  title: string;
  value: string;
  tone: "primary" | "positive" | "neutral" | "caution";
}) {
  const toneClass =
    tone === "primary"
      ? "border-primary/24 bg-primary/10"
      : tone === "positive"
        ? "border-positive/22 bg-[hsl(var(--positive)/0.08)]"
        : tone === "neutral"
          ? "border-border/80 bg-[hsl(42_40%_97%)]"
          : "border-caution/22 bg-[hsl(var(--caution)/0.08)]";

  return (
    <div className={`rounded-[22px] border p-4 ${toneClass}`}>
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function HighlightCard({
  title,
  value,
  note,
  tone
}: {
  title: string;
  value: string;
  note: string;
  tone: "positive" | "caution";
}) {
  return (
    <div
      className={
        tone === "positive"
          ? "rounded-[24px] border border-positive/22 bg-[hsl(var(--positive)/0.1)] p-4"
          : "rounded-[24px] border border-caution/22 bg-[hsl(var(--caution)/0.1)] p-4"
      }
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-3 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
    </div>
  );
}

function EquityCurveCard({
  points
}: {
  points: ReturnType<typeof buildPortfolioPerformanceDashboard>["equityCurve"];
}) {
  const maxMagnitude = Math.max(...points.map((point) => Math.abs(point.realizedPnl)), 1);

  return (
    <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg text-foreground">누적 실현손익 흐름</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          종료 거래가 쌓인 순서대로 누적 손익이 어떻게 움직였는지 한 줄로 다시 봅니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {points.length ? (
          points.map((point) => {
            const toneClass =
              point.tone === "positive"
                ? "bg-[hsl(var(--positive))]"
                : point.tone === "caution"
                  ? "bg-[hsl(var(--caution))]"
                  : "bg-[hsl(var(--muted-foreground)/0.45)]";
            const width = `${Math.max(18, Math.round((Math.abs(point.realizedPnl) / maxMagnitude) * 100))}%`;

            return (
              <div
                key={point.key}
                className="rounded-[20px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{point.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      누적 {formatSignedPrice(point.cumulativePnl)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      point.tone === "positive" ? "positive" : point.tone === "caution" ? "caution" : "secondary"
                    }
                  >
                    {formatSignedPrice(point.realizedPnl)}
                  </Badge>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[hsl(42_32%_92%)]">
                  <div className={`h-full rounded-full ${toneClass}`} style={{ width }} />
                </div>
              </div>
            );
          })
        ) : (
          <EmptyInsight label="아직 누적 실현손익 흐름을 그릴 종료 거래가 충분하지 않습니다." />
        )}
      </CardContent>
    </Card>
  );
}

function PeriodFlowCard({
  title,
  periods,
  emptyLabel
}: {
  title: string;
  periods: ReturnType<typeof buildPortfolioPerformanceDashboard>["weekly"];
  emptyLabel: string;
}) {
  const maxMagnitude = Math.max(...periods.map((period) => Math.abs(period.realizedPnl)), 1);

  return (
    <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {periods.length ? (
          periods.map((period) => {
            const width = `${Math.max(16, Math.round((Math.abs(period.realizedPnl) / maxMagnitude) * 100))}%`;
            const barClass =
              period.realizedPnl > 0
                ? "bg-[hsl(var(--positive))]"
                : period.realizedPnl < 0
                  ? "bg-[hsl(var(--caution))]"
                  : "bg-[hsl(var(--muted-foreground)/0.5)]";

            return (
              <div key={period.key} className="rounded-[20px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{period.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      종료 {period.closedCount}건 · 승률 {period.winRate}%
                    </p>
                  </div>
                  <Badge variant={period.realizedPnl > 0 ? "positive" : period.realizedPnl < 0 ? "caution" : "secondary"}>
                    {formatSignedPrice(period.realizedPnl)}
                  </Badge>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[hsl(42_32%_92%)]">
                  <div className={`h-full rounded-full ${barClass}`} style={{ width }} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[20px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-5 text-sm leading-6 text-muted-foreground">
            {emptyLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightRow({
  title,
  value,
  badge,
  note,
  tone,
  action
}: {
  title: string;
  value: string;
  badge: string;
  note: string;
  tone: "positive" | "neutral" | "caution";
  action?: ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "border-positive/22 bg-[hsl(var(--positive)/0.08)]"
      : tone === "caution"
        ? "border-caution/22 bg-[hsl(var(--caution)/0.08)]"
        : "border-border/80 bg-[hsl(42_40%_97%)]";

  return (
    <div className={`rounded-[20px] border px-4 py-4 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
        </div>
        <Badge variant={tone === "positive" ? "positive" : tone === "caution" ? "caution" : "secondary"}>
          {badge}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{note}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function EmptyInsight({ label }: { label: string }) {
  return (
    <div className="rounded-[20px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-5 text-sm leading-6 text-muted-foreground">
      {label}
    </div>
  );
}

function QualityMetric({
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
