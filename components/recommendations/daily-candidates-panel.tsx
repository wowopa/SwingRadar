"use client";

import Link from "next/link";
import { Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";

import { ActionBucketBadge } from "@/components/recommendations/action-bucket-badge";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyScanSummaryDto, OpeningRecheckDecisionDto } from "@/lib/api-contracts/swing-radar";
import {
  buildOpeningRecheckCounts,
  getOpeningRecheckStatusMeta,
  OPENING_RECHECK_DECISION_STATUSES,
  OPENING_RECHECK_STATUSES
} from "@/lib/recommendations/opening-recheck";
import { resolveRecommendationActionBucket } from "@/lib/recommendations/action-plan";
import { useAdminToken } from "@/lib/use-admin-token";
import { cn, formatDateTimeShort } from "@/lib/utils";
import type { OpeningRecheckStatus } from "@/types/recommendation";

function formatTurnover(value?: number | null) {
  if (!value || value <= 0) {
    return "확인 필요";
  }

  const eok = value / 100_000_000;
  return `${eok.toFixed(eok >= 100 ? 0 : 1)}억`;
}

function createInitialDecisions(items: DailyScanSummaryDto["topCandidates"]) {
  return Object.fromEntries(
    items.flatMap((item) => (item.openingRecheck ? [[item.ticker, item.openingRecheck]] : []))
  ) as Record<string, OpeningRecheckDecisionDto>;
}

function getStatusButtonClasses(status: OpeningRecheckStatus, isActive: boolean) {
  if (!isActive) {
    return "bg-background/80 text-foreground/80 hover:bg-background";
  }

  if (status === "passed") {
    return "border-positive/35 bg-positive/10 text-positive hover:bg-positive/15";
  }

  if (status === "watch") {
    return "border-neutral/35 bg-neutral/10 text-neutral hover:bg-neutral/15";
  }

  if (status === "avoid") {
    return "border-caution/35 bg-caution/10 text-caution hover:bg-caution/15";
  }

  return "border-border/80 bg-secondary/40 text-foreground hover:bg-secondary/50";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const json = (await response.json().catch(() => ({}))) as T & {
    message?: string;
    code?: string;
    requestId?: string;
  };

  if (!response.ok) {
    const baseMessage = json.message ?? `요청이 실패했습니다. (${response.status})`;
    const withCode = json.code ? `${baseMessage} [${json.code}]` : baseMessage;
    throw new Error(json.requestId ? `${withCode} (request: ${json.requestId})` : withCode);
  }

  return json;
}

export function DailyCandidatesPanel({ dailyScan }: { dailyScan: DailyScanSummaryDto | null }) {
  const router = useRouter();
  const { authHeaders } = useAdminToken();
  const visibleCandidates = useMemo(() => dailyScan?.topCandidates.slice(0, 6) ?? [], [dailyScan]);
  const initialDecisions = useMemo(() => createInitialDecisions(visibleCandidates), [visibleCandidates]);
  const scanKey = dailyScan?.generatedAt ?? "";
  const canManageBoard = Boolean(authHeaders);
  const hasCandidates = visibleCandidates.length > 0;

  const [decisions, setDecisions] = useState<Record<string, OpeningRecheckDecisionDto>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [boardMessage, setBoardMessage] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);

  useEffect(() => {
    setDecisions(initialDecisions);
    setSavingKey(null);
    setBoardMessage(null);
    setBoardError(null);
  }, [initialDecisions, scanKey]);

  const counts = useMemo(
    () => buildOpeningRecheckCounts(visibleCandidates.map((item) => item.ticker), decisions),
    [decisions, visibleCandidates]
  );
  const groupedBoardItems = useMemo(
    () =>
      OPENING_RECHECK_DECISION_STATUSES.map((status) => ({
        status,
        meta: getOpeningRecheckStatusMeta(status),
        items: visibleCandidates.filter((item) => (decisions[item.ticker]?.status ?? "pending") === status)
      })),
    [decisions, visibleCandidates]
  );

  async function saveStatus(ticker: string, status: OpeningRecheckStatus) {
    if (!authHeaders || !scanKey) {
      return;
    }

    setSavingKey(ticker);
    setBoardError(null);
    setBoardMessage(null);

    try {
      const response = await fetch("/api/admin/opening-recheck", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({
          scanKey,
          ticker,
          status
        }),
        cache: "no-store"
      });
      const json = await parseResponse<{ decision: OpeningRecheckDecisionDto | null }>(response);

      setDecisions((current) => {
        const next = { ...current };
        if (json.decision) {
          next[ticker] = json.decision;
        } else {
          delete next[ticker];
        }
        return next;
      });
      setBoardMessage(`${ticker} 장초 재판정을 ${getOpeningRecheckStatusMeta(status).label}로 저장했습니다.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : "장초 재판정 저장에 실패했습니다.");
    } finally {
      setSavingKey(null);
    }
  }

  async function resetStatus(ticker: string) {
    await saveStatus(ticker, "pending");
  }

  async function clearBoard() {
    if (!authHeaders || !scanKey) {
      return;
    }

    setSavingKey("clear-all");
    setBoardError(null);
    setBoardMessage(null);

    try {
      const response = await fetch("/api/admin/opening-recheck", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({
          scanKey
        }),
        cache: "no-store"
      });

      await parseResponse<{ cleared: boolean }>(response);
      setDecisions({});
      setBoardMessage("오늘 장초 재판정 보드를 초기화했습니다.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : "장초 재판정 초기화에 실패했습니다.");
    } finally {
      setSavingKey(null);
    }
  }

  if (!dailyScan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>오늘 먼저 볼 종목</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            아직 유니버스 스캔 결과가 없습니다. 배치 스캔이 끝나면 오늘 장전 후보가 여기에 반영됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>오늘 먼저 볼 종목</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            최신 유니버스 스캔에서 지금 먼저 확인할 종목만 추렸습니다. 이 목록은 전일 종가 기준 장전 후보이며, 장초
            재판정을 통과하기 전까지는 실제 매수 신호가 아닙니다.
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
          배치 {dailyScan.succeededBatches}/{dailyScan.totalBatches} 성공
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm leading-6 text-foreground/82">
          장 시작 후 5~10분 동안 시초가와 계획 기준의 거리, 확인 가격 반응, 손절 여유를 다시 본 뒤에만 오늘 행동 후보로
          넘겨야 합니다.
        </div>

        <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">오늘 실제 행동 보드</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                서버에 저장된 장초 재판정 결과를 기준으로 오늘 행동을 정리합니다. 현재 노출 {visibleCandidates.length}개
                기준이며, 마지막 스캔 시각은 {formatDateTimeShort(dailyScan.generatedAt)}입니다.
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {canManageBoard ? (
                  "현재 브라우저에 관리자 세션이 있어 여기서 바로 저장할 수 있습니다."
                ) : (
                  <>
                    운영 콘솔에서 관리자 비밀번호를 입력한 뒤 같은 탭으로 돌아오면 여기서 바로 저장할 수 있습니다.{" "}
                    <Link className="font-medium text-primary hover:text-primary/80" href="/admin">
                      운영 콘솔 열기
                    </Link>
                  </>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void clearBoard()}
              disabled={!canManageBoard || savingKey === "clear-all"}
            >
              {savingKey === "clear-all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              오늘 판정 초기화
            </Button>
          </div>

          {boardMessage ? <p className="mt-3 text-sm text-positive">{boardMessage}</p> : null}
          {boardError ? <p className="mt-3 text-sm text-destructive">{boardError}</p> : null}

          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {OPENING_RECHECK_STATUSES.map((status) => {
              const meta = getOpeningRecheckStatusMeta(status);

              return (
                <div key={status} className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{meta.label}</p>
                    <Badge variant={meta.variant}>{counts[status]}개</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{meta.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {groupedBoardItems.map((group) => (
              <div key={group.status} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{group.meta.label}</p>
                  <Badge variant={group.meta.variant}>{group.items.length}개</Badge>
                </div>
                {group.items.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <span
                        key={`${group.status}-${item.ticker}`}
                        className="rounded-full border border-border/70 bg-secondary/25 px-3 py-1 text-xs text-foreground/80"
                      >
                        {item.company}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">아직 이 상태로 정리된 종목은 없습니다.</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {hasCandidates ? (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              {visibleCandidates.map((item, index) => {
                const actionBucket =
                  item.actionBucket ??
                  resolveRecommendationActionBucket({
                    signalTone: item.signalTone,
                    score: item.score,
                    activationScore: item.activationScore
                  });
                const recheckStatus = decisions[item.ticker]?.status ?? "pending";
                const recheckMeta = getOpeningRecheckStatusMeta(recheckStatus);
                const recheckDecision = decisions[item.ticker];
                const isSaving = savingKey === item.ticker;

                return (
                  <div key={`${item.ticker}-${index}`} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.company}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.ticker} · {item.sector}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground/72">
                          장전 후보 {index + 1}
                        </span>
                        <Badge variant={recheckMeta.variant}>{recheckMeta.label}</Badge>
                        <ActionBucketBadge bucket={actionBucket} />
                        <SignalToneBadge tone={item.signalTone} />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl border border-border/70 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">우선순위</p>
                        <p className="mt-1 font-semibold text-foreground">{item.candidateScore}</p>
                      </div>
                      <div className="rounded-xl border border-border/70 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">관찰 점수</p>
                        <p className="mt-1 font-semibold text-foreground">
                          {typeof item.activationScore === "number" ? item.activationScore : "계산 중"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/70 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">유동성</p>
                        <p className="mt-1 font-semibold text-foreground">
                          {item.liquidityRating ?? formatTurnover(item.averageTurnover20)}
                        </p>
                      </div>
                    </div>

                    {item.tradePlan ? (
                      <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">진입 구간</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{item.tradePlan.entryLabel}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">손절 기준</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{item.tradePlan.stopLabel}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-foreground/82">{item.tradePlan.nextStep}</p>
                      </div>
                    ) : null}

                    <div className="mt-4 rounded-2xl border border-border/70 bg-background/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">장초 재판정</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{recheckMeta.description}</p>
                        </div>
                        {recheckDecision ? (
                          <span className="text-xs text-muted-foreground">
                            최종 반영 {formatDateTimeShort(recheckDecision.updatedAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">아직 저장 전</span>
                        )}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {OPENING_RECHECK_DECISION_STATUSES.map((status) => {
                          const meta = getOpeningRecheckStatusMeta(status);
                          const isActive = recheckStatus === status;

                          return (
                            <Button
                              key={`${item.ticker}-${status}`}
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn("justify-start rounded-2xl px-3 text-left", getStatusButtonClasses(status, isActive))}
                              onClick={() => void saveStatus(item.ticker, status)}
                              disabled={!canManageBoard || isSaving}
                            >
                              {isSaving && isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {meta.label}
                            </Button>
                          );
                        })}
                      </div>
                      {recheckStatus !== "pending" ? (
                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void resetStatus(item.ticker)}
                            disabled={!canManageBoard || isSaving}
                          >
                            판정 취소
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.rationale}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        점수보다 중요한 것은 장초 재판정 결과와 포지션 한도입니다.
                      </p>
                      <Link
                        href={`/analysis/${item.ticker}`}
                        className="inline-flex items-center rounded-full border border-border/70 bg-background/90 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/35 hover:text-primary"
                      >
                        상세 분석 보기
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4 text-sm text-muted-foreground">
              총 {dailyScan.totalTickers}개 종목을 스캔했고, 그중 오늘 먼저 볼 종목만 자동 정렬했습니다. 장초 재판정이 끝나기
              전까지는 이 목록 전체를 곧바로 실행 신호로 보지 않는 편이 안전합니다.{" "}
              <Link className="font-medium text-primary hover:text-primary/80" href="/ranking">
                전체 후보 순위 보기
              </Link>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-caution/30 bg-caution/10 p-4 text-sm text-caution">
            아직 장전 후보가 생성되지 않았습니다. 스캔이 끝나지 않았거나 데이터 수집에 실패했을 수 있습니다.
          </div>
        )}

        {dailyScan.failedBatches.length ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            실패 배치 {dailyScan.failedBatches.length}건이 기록되었습니다.
            <div className="mt-3 space-y-2 text-xs text-destructive/90">
              {dailyScan.failedBatches.slice(0, 3).map((batch) => (
                <p key={batch.batch}>
                  배치 {batch.batch}: {batch.errors[0] ?? "원인 미상"}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
