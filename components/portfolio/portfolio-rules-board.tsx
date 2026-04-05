"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  OpeningCheckRiskPatternDto,
  TodayActionBoardDto
} from "@/lib/api-contracts/swing-radar";
import {
  buildPersonalRuleHistorySummaries,
  buildRecentRuleImpacts
} from "@/lib/portfolio/personal-rule-history";
import { getOpeningRecheckStatusMeta } from "@/lib/recommendations/opening-recheck";
import type { UserOpeningRecheckScanSnapshot } from "@/lib/server/user-opening-recheck-board";
import type { PortfolioPersonalRuleEntry } from "@/types/recommendation";

type RuleFilter = "all" | "active" | "inactive";

function formatRuleDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function getRuleSourceVariant(sourceCategory: PortfolioPersonalRuleEntry["sourceCategory"]) {
  if (sourceCategory === "next_rule") {
    return "positive" as const;
  }

  if (sourceCategory === "watchouts") {
    return "caution" as const;
  }

  return "neutral" as const;
}

function getTodayLoweredItems(todayActionBoard?: TodayActionBoardDto) {
  if (!todayActionBoard) {
    return [];
  }

  const priority = {
    buy_review: 4,
    excluded: 0,
    avoid: 1,
    watch: 2,
    pending: 3
  } as const;

  return [...todayActionBoard.items]
    .filter((item) => item.boardStatus !== "buy_review")
    .sort((left, right) => {
      const leftPriority = priority[left.boardStatus];
      const rightPriority = priority[right.boardStatus];
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const leftRank = left.featuredRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.featuredRank ?? Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank;
    });
}

export function PortfolioRulesBoard({
  personalRules,
  openingCheckScans,
  openingCheckRiskPatterns = [],
  todayActionBoard
}: {
  personalRules: PortfolioPersonalRuleEntry[];
  openingCheckScans: UserOpeningRecheckScanSnapshot[];
  openingCheckRiskPatterns?: OpeningCheckRiskPatternDto[];
  todayActionBoard?: TodayActionBoardDto;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<RuleFilter>("all");
  const [isRefreshing, startTransition] = useTransition();
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeRules = useMemo(() => personalRules.filter((rule) => rule.isActive), [personalRules]);
  const inactiveRules = useMemo(() => personalRules.filter((rule) => !rule.isActive), [personalRules]);
  const visibleRules = useMemo(() => {
    if (filter === "active") {
      return activeRules;
    }

    if (filter === "inactive") {
      return inactiveRules;
    }

    return personalRules;
  }, [activeRules, filter, inactiveRules, personalRules]);
  const recentPromotionCount = useMemo(() => {
    const cutoff = Date.now() - 14 * 86_400_000;
    return personalRules.filter((rule) => new Date(rule.createdAt).getTime() >= cutoff).length;
  }, [personalRules]);
  const recentRuleImpacts = useMemo(
    () =>
      buildRecentRuleImpacts({
        openingCheckScans,
        rules: personalRules,
        openingCheckRiskPatterns
      }),
    [openingCheckRiskPatterns, openingCheckScans, personalRules]
  );
  const ruleHistoryById = useMemo(
    () =>
      new Map(
        buildPersonalRuleHistorySummaries({
          openingCheckScans,
          rules: personalRules,
          openingCheckRiskPatterns
        }).map((history) => [history.ruleId, history])
      ),
    [openingCheckRiskPatterns, openingCheckScans, personalRules]
  );
  const todayLoweredItems = useMemo(() => getTodayLoweredItems(todayActionBoard), [todayActionBoard]);

  async function toggleRule(rule: PortfolioPersonalRuleEntry) {
    setSavingRuleId(rule.id);
    setError(null);

    try {
      const response = await fetch("/api/account/portfolio-personal-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rule.id,
          isActive: !rule.isActive
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? "개인 규칙 상태를 변경하지 못했습니다.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "개인 규칙 상태를 변경하지 못했습니다.");
    } finally {
      setSavingRuleId(null);
    }
  }

  return (
    <section className="space-y-5">
      <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-foreground">개인 규칙 관리</CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                승격한 규칙을 한 화면에서 보고, 끄고 켜고, 최근 장초 판단과 Today 상태가 왜 낮아졌는지 함께 확인합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/opening-check">장초 확인 보기</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/recommendations">Today 보기</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <RuleMetric title="활성 규칙" value={`${activeRules.length}개`} note="현재 엔진에 실제 반영되는 규칙" tone="positive" />
          <RuleMetric title="비활성 규칙" value={`${inactiveRules.length}개`} note="기록은 남아 있지만 지금은 꺼 둔 규칙" tone="neutral" />
          <RuleMetric title="최근 승격" value={`${recentPromotionCount}개`} note="최근 14일 안에 새로 승격된 규칙" tone="neutral" />
          <RuleMetric
            title="최근 상태 하향"
            value={`${recentRuleImpacts.length}건`}
            note="최근 14일 장초 기록 기준으로 규칙이 보수적으로 낮춘 사례"
            tone={recentRuleImpacts.length > 0 ? "caution" : "positive"}
          />
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-foreground">내 규칙 전체 보기</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                규칙을 비활성화해도 기록은 남습니다. 다시 켜면 다음 Opening Check와 Today 해석부터 바로 반영됩니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "all", label: "전체", count: personalRules.length },
                { key: "active", label: "활성", count: activeRules.length },
                { key: "inactive", label: "비활성", count: inactiveRules.length }
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  className={
                    option.key === filter
                      ? "inline-flex h-9 items-center rounded-full border border-primary/24 bg-primary/10 px-3.5 text-xs font-medium text-primary"
                      : "inline-flex h-9 items-center rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-3.5 text-xs font-medium text-foreground/76 transition hover:border-primary/24 hover:bg-white"
                  }
                >
                  {option.label} {option.count}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleRules.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {visibleRules.map((rule) => {
                const history = ruleHistoryById.get(rule.id);

                return (
                  <div
                    key={rule.id}
                    className="rounded-[22px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getRuleSourceVariant(rule.sourceCategory)}>{rule.sourceLabel}</Badge>
                          <Badge variant={rule.isActive ? "positive" : "secondary"}>
                            {rule.isActive ? "활성" : "비활성"}
                          </Badge>
                          <Badge variant={history?.recentImpactCount ? "caution" : "secondary"}>
                            최근 14일 {history?.recentImpactCount ?? 0}회
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{rule.text}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={rule.isActive ? "outline" : "secondary"}
                        disabled={savingRuleId === rule.id || isRefreshing}
                        onClick={() => void toggleRule(rule)}
                      >
                        {savingRuleId === rule.id ? "저장 중..." : rule.isActive ? "규칙 끄기" : "다시 켜기"}
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <RuleMetaItem label="처음 승격" value={formatRuleDate(rule.createdAt)} />
                      <RuleMetaItem label="마지막 변경" value={formatRuleDate(rule.updatedAt)} />
                      <RuleMetaItem
                        label="최근 적용"
                        value={history?.lastAppliedAt ? formatRuleDate(history.lastAppliedAt) : "아직 없음"}
                      />
                    </div>

                    <div className="mt-4 rounded-[20px] border border-border/80 bg-white/80 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            최근 적용 이력
                          </p>
                          <p className="mt-2 text-sm leading-6 text-foreground/82">
                            {history?.totalImpactCount
                              ? `저장된 장초 체크리스트 ${history.totalImpactCount}회에서 이 규칙이 상태를 한 단계 이상 낮췄습니다.`
                              : "저장된 장초 체크리스트에서는 아직 이 규칙과 직접 겹친 사례가 없습니다."}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">전체 {history?.totalImpactCount ?? 0}회</Badge>
                          {history?.recentTickers.length
                            ? history.recentTickers.map((ticker) => (
                                <Badge key={`${rule.id}-${ticker}`} variant="secondary" className="bg-white/90">
                                  {ticker}
                                </Badge>
                              ))
                            : null}
                        </div>
                      </div>

                      {history?.impacts.length ? (
                        <div className="mt-4 space-y-2">
                          {history.impacts.slice(0, 4).map((impact) => (
                            <div
                              key={`${impact.scanKey}-${impact.ticker}-${impact.updatedAt}`}
                              className="rounded-[18px] border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-xs font-semibold text-foreground">{impact.ticker}</p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    저장 {formatRuleDate(impact.updatedAt)}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant={getOpeningRecheckStatusMeta(impact.baseStatus).variant}>
                                    기본 {getOpeningRecheckStatusMeta(impact.baseStatus).label}
                                  </Badge>
                                  <Badge variant={getOpeningRecheckStatusMeta(impact.suggestedStatus).variant}>
                                    규칙 후 {getOpeningRecheckStatusMeta(impact.suggestedStatus).label}
                                  </Badge>
                                </div>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">{impact.reason}</p>
                              {impact.riskPatternTitle ? (
                                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                                  같이 겹친 최근 위험 패턴: {impact.riskPatternTitle}
                                </p>
                              ) : null}
                              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                                실제 저장 상태: {getOpeningRecheckStatusMeta(impact.savedStatus).label}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[20px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-5 text-sm leading-6 text-muted-foreground">
              아직 표시할 규칙이 없습니다. Reviews나 Performance에서 회고 문장을 승격하면 여기에 쌓입니다.
            </div>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg text-foreground">최근 상태 하향 이유</CardTitle>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  최근 14일 장초 기록에서 기본 제안보다 더 보수적으로 낮아진 종목과, 그때 작동한 규칙 이유를 보여줍니다.
                </p>
              </div>
              <Badge variant="secondary">{recentRuleImpacts.length}건</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentRuleImpacts.length ? (
              recentRuleImpacts.slice(0, 5).map((impact) => (
                <div
                  key={`${impact.ticker}-${impact.updatedAt}`}
                  className="rounded-[20px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{impact.ticker}</p>
                      <p className="mt-1 text-xs text-muted-foreground">저장 {formatRuleDate(impact.updatedAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getOpeningRecheckStatusMeta(impact.baseStatus).variant}>
                        기본 {getOpeningRecheckStatusMeta(impact.baseStatus).label}
                      </Badge>
                      <Badge variant={getOpeningRecheckStatusMeta(impact.suggestedStatus).variant}>
                        조정 {getOpeningRecheckStatusMeta(impact.suggestedStatus).label}
                      </Badge>
                    </div>
                  </div>
                  {impact.matchedRules.length ? (
                    <div className="mt-3 space-y-2">
                      {impact.matchedRules.map((rule) => (
                        <div key={rule.id} className="rounded-2xl border border-caution/20 bg-white px-3 py-3">
                          <p className="text-xs font-semibold text-foreground">{rule.text}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{rule.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {impact.riskPatternTitle ? (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      최근 패턴 경고: {impact.riskPatternTitle} 조합이 손실 우세였습니다.
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    실제 저장 상태: {getOpeningRecheckStatusMeta(impact.savedStatus).label}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-5 text-sm leading-6 text-muted-foreground">
                최근 장초 기록에서 규칙 때문에 추가 하향된 사례가 아직 많지 않습니다.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg text-foreground">오늘 제안 상태가 낮아진 이유</CardTitle>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Today 보드에서 매수 검토 아래로 내려간 종목과 현재 이유를 보여줍니다. 규칙, 섹터 한도, 슬롯 부족을 한 곳에서 추적합니다.
                </p>
              </div>
              <Badge variant="secondary">{todayLoweredItems.length}개</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayLoweredItems.length ? (
              todayLoweredItems.slice(0, 6).map((item) => (
                <div
                  key={`${item.ticker}-${item.boardStatus}`}
                  className="rounded-[20px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {item.company}
                        <span className="ml-2 text-xs font-medium text-muted-foreground">{item.ticker}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.sector}</p>
                    </div>
                    <Badge variant={item.boardStatus === "excluded" || item.boardStatus === "avoid" ? "caution" : "neutral"}>
                      {item.boardStatus === "watch"
                        ? "관찰 유지"
                        : item.boardStatus === "avoid"
                          ? "추격 금지"
                          : item.boardStatus === "excluded"
                            ? "오늘 제외"
                            : "장초 확인 전"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground/82">{item.boardReason}</p>
                  {item.portfolioNote ? (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.portfolioNote}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-5 text-sm leading-6 text-muted-foreground">
                오늘은 매수 검토 아래로 내려간 종목이 많지 않습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function RuleMetric({
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
  return (
    <div
      className={`rounded-[22px] border p-4 ${
        tone === "positive"
          ? "border-positive/22 bg-[hsl(var(--positive)/0.08)]"
          : tone === "caution"
            ? "border-caution/22 bg-[hsl(var(--caution)/0.08)]"
            : "border-border/80 bg-[hsl(42_40%_97%)]"
      }`}
    >
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function RuleMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border/80 bg-white/82 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
