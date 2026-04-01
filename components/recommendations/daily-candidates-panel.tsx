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
import { Textarea } from "@/components/ui/textarea";
import type { DailyScanSummaryDto, OpeningRecheckDecisionDto } from "@/lib/api-contracts/swing-radar";
import { resolveRecommendationActionBucket } from "@/lib/recommendations/action-plan";
import {
  buildOpeningRecheckCounts,
  getOpeningActionIntentMeta,
  getOpeningConfirmationMeta,
  getOpeningGapMeta,
  getOpeningRecheckStatusMeta,
  OPENING_ACTION_INTENTS,
  OPENING_CONFIRMATION_CHECKS,
  OPENING_GAP_CHECKS,
  OPENING_RECHECK_DECISION_STATUSES,
  OPENING_RECHECK_STATUSES,
  suggestOpeningRecheckStatus
} from "@/lib/recommendations/opening-recheck";
import { cn, formatDateTimeShort } from "@/lib/utils";
import type {
  OpeningActionIntent,
  OpeningConfirmationCheck,
  OpeningGapCheck,
  OpeningRecheckChecklist,
  OpeningRecheckStatus
} from "@/types/recommendation";

type OpeningDecisionStatus = Exclude<OpeningRecheckStatus, "pending">;

interface OpeningDraft {
  gap?: OpeningGapCheck;
  confirmation?: OpeningConfirmationCheck;
  action?: OpeningActionIntent;
  note: string;
  finalStatus: OpeningDecisionStatus | null;
}

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

function createInitialSharedDecisions(items: DailyScanSummaryDto["topCandidates"]) {
  return Object.fromEntries(
    items.flatMap((item) => (item.sharedOpeningRecheck ? [[item.ticker, item.sharedOpeningRecheck]] : []))
  ) as Record<string, OpeningRecheckDecisionDto>;
}

function createDraft(decision?: OpeningRecheckDecisionDto): OpeningDraft {
  if (!decision) {
    return {
      note: "",
      finalStatus: null
    };
  }

  const suggestedStatus = decision.suggestedStatus;
  const finalStatus = suggestedStatus && suggestedStatus === decision.status ? null : decision.status;

  return {
    gap: decision.checklist?.gap,
    confirmation: decision.checklist?.confirmation,
    action: decision.checklist?.action,
    note: decision.note ?? "",
    finalStatus: finalStatus === "pending" ? null : finalStatus
  };
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

function getChoiceButtonClasses(
  variant: "default" | "secondary" | "positive" | "neutral" | "caution",
  isActive: boolean
) {
  if (!isActive) {
    return "border-border/70 bg-background/80 text-foreground/80 hover:bg-background";
  }

  if (variant === "positive") {
    return "border-positive/35 bg-positive/10 text-positive hover:bg-positive/15";
  }

  if (variant === "neutral") {
    return "border-neutral/35 bg-neutral/10 text-neutral hover:bg-neutral/15";
  }

  if (variant === "caution") {
    return "border-caution/35 bg-caution/10 text-caution hover:bg-caution/15";
  }

  return "border-primary/35 bg-primary/10 text-primary hover:bg-primary/15";
}

function buildChecklist(draft: OpeningDraft): OpeningRecheckChecklist | null {
  if (!draft.gap || !draft.confirmation || !draft.action) {
    return null;
  }

  return {
    gap: draft.gap,
    confirmation: draft.confirmation,
    action: draft.action
  };
}

function getDefaultFocusTicker(
  items: DailyScanSummaryDto["topCandidates"],
  decisions: Record<string, OpeningRecheckDecisionDto>
) {
  return (
    items.find((item) => (decisions[item.ticker]?.status ?? "pending") === "pending")?.ticker ??
    items[0]?.ticker ??
    null
  );
}

function resolveInitialFocusTicker(
  initialFocusTicker: string | null | undefined,
  items: DailyScanSummaryDto["topCandidates"],
  decisions: Record<string, OpeningRecheckDecisionDto>
) {
  if (initialFocusTicker && items.some((item) => item.ticker === initialFocusTicker)) {
    return initialFocusTicker;
  }

  return getDefaultFocusTicker(items, decisions);
}

function getNextFocusTicker(
  currentTicker: string,
  items: DailyScanSummaryDto["topCandidates"],
  decisions: Record<string, OpeningRecheckDecisionDto>
) {
  if (!items.length) {
    return null;
  }

  const orderedTickers = items.map((item) => item.ticker);
  const currentIndex = orderedTickers.indexOf(currentTicker);
  const pendingAfterCurrent = orderedTickers.find(
    (ticker, index) => index > currentIndex && (decisions[ticker]?.status ?? "pending") === "pending"
  );

  if (pendingAfterCurrent) {
    return pendingAfterCurrent;
  }

  const firstPending = orderedTickers.find((ticker) => (decisions[ticker]?.status ?? "pending") === "pending");
  if (firstPending) {
    return firstPending;
  }

  return orderedTickers[Math.min(currentIndex + 1, orderedTickers.length - 1)] ?? orderedTickers[0] ?? null;
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

export function DailyCandidatesPanel({
  dailyScan,
  initialFocusTicker
}: {
  dailyScan: DailyScanSummaryDto | null;
  initialFocusTicker?: string | null;
}) {
  const router = useRouter();
  const visibleCandidates = useMemo(
    () => dailyScan?.openingCheckCandidates ?? dailyScan?.topCandidates ?? [],
    [dailyScan]
  );
  const initialDecisions = useMemo(() => createInitialDecisions(visibleCandidates), [visibleCandidates]);
  const initialSharedDecisions = useMemo(() => createInitialSharedDecisions(visibleCandidates), [visibleCandidates]);
  const scanKey = dailyScan?.generatedAt ?? "";
  const canManageBoard = Boolean(scanKey);
  const hasCandidates = visibleCandidates.length > 0;

  const [decisions, setDecisions] = useState<Record<string, OpeningRecheckDecisionDto>>({});
  const [sharedDecisions, setSharedDecisions] = useState<Record<string, OpeningRecheckDecisionDto>>({});
  const [drafts, setDrafts] = useState<Record<string, OpeningDraft>>({});
  const [focusTicker, setFocusTicker] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [boardMessage, setBoardMessage] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);

  useEffect(() => {
    setDecisions(initialDecisions);
    setSharedDecisions(initialSharedDecisions);
    setDrafts({});
    setFocusTicker(resolveInitialFocusTicker(initialFocusTicker, visibleCandidates, initialDecisions));
    setSavingKey(null);
    setBoardMessage(null);
    setBoardError(null);
  }, [initialDecisions, initialSharedDecisions, initialFocusTicker, scanKey, visibleCandidates]);

  const focusedCandidate = useMemo(
    () => visibleCandidates.find((item) => item.ticker === focusTicker) ?? visibleCandidates[0] ?? null,
    [focusTicker, visibleCandidates]
  );

  const focusedDecision = focusedCandidate ? decisions[focusedCandidate.ticker] : undefined;
  const focusedSharedDecision = focusedCandidate ? sharedDecisions[focusedCandidate.ticker] : undefined;
  const focusedDraft = focusedCandidate
    ? (drafts[focusedCandidate.ticker] ?? createDraft(focusedDecision))
    : null;
  const focusedChecklist = focusedDraft ? buildChecklist(focusedDraft) : null;
  const suggestedStatus = focusedChecklist ? suggestOpeningRecheckStatus(focusedChecklist) : undefined;
  const resolvedStatus = focusedDraft
    ? focusedDraft.finalStatus ?? suggestedStatus ?? focusedDecision?.suggestedStatus ?? undefined
    : undefined;

  const counts = useMemo(
    () => buildOpeningRecheckCounts(visibleCandidates.map((item) => item.ticker), decisions),
    [decisions, visibleCandidates]
  );
  const pendingCandidates = useMemo(
    () => visibleCandidates.filter((item) => (decisions[item.ticker]?.status ?? "pending") === "pending"),
    [decisions, visibleCandidates]
  );
  const completedCandidatesCount = visibleCandidates.length - pendingCandidates.length;
  const nextFocusTicker = useMemo(
    () =>
      focusedCandidate ? getNextFocusTicker(focusedCandidate.ticker, visibleCandidates, decisions) : null,
    [decisions, focusedCandidate, visibleCandidates]
  );
  const nextFocusCandidate = useMemo(
    () =>
      nextFocusTicker ? visibleCandidates.find((item) => item.ticker === nextFocusTicker) ?? null : null,
    [nextFocusTicker, visibleCandidates]
  );
  const compactQueueCandidates = useMemo(
    () =>
      pendingCandidates
        .filter((item) => item.ticker !== focusedCandidate?.ticker)
        .slice(0, 4),
    [focusedCandidate?.ticker, pendingCandidates]
  );

  function updateDraft(ticker: string, patch: Partial<OpeningDraft>) {
    setDrafts((current) => {
      const base = current[ticker] ?? createDraft(decisions[ticker]);
      return {
        ...current,
        [ticker]: {
          ...base,
          ...patch
        }
      };
    });
  }

  async function persistDecision(input: {
    ticker: string;
    status: OpeningRecheckStatus;
    checklist?: OpeningRecheckChecklist;
    suggestedStatus?: OpeningDecisionStatus;
    note?: string;
    advance?: boolean;
  }) {
    if (!scanKey) {
      return;
    }

    setSavingKey(input.ticker);
    setBoardError(null);
    setBoardMessage(null);

    try {
      const response = await fetch("/api/account/opening-check", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          scanKey,
          ticker: input.ticker,
          status: input.status,
          checklist: input.checklist,
          suggestedStatus: input.suggestedStatus,
          note: input.note?.trim() || undefined
        }),
        cache: "no-store"
      });
      const json = await parseResponse<{ decision: OpeningRecheckDecisionDto | null }>(response);
      const nextDecisions = { ...decisions };

      if (json.decision) {
        nextDecisions[input.ticker] = json.decision;
      } else {
        delete nextDecisions[input.ticker];
      }

      setDecisions(nextDecisions);
      setDrafts((current) => ({
        ...current,
        [input.ticker]: createDraft(json.decision ?? undefined)
      }));

      if (input.advance) {
        setFocusTicker(getNextFocusTicker(input.ticker, visibleCandidates, nextDecisions));
      }

      const resolvedMeta =
        input.status === "pending"
          ? getOpeningRecheckStatusMeta("pending")
          : getOpeningRecheckStatusMeta(input.status as OpeningDecisionStatus);
      setBoardMessage(`${input.ticker}에 대한 내 장초 확인을 ${resolvedMeta.label}로 저장했습니다.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : "장초 확인 저장에 실패했습니다.");
    } finally {
      setSavingKey(null);
    }
  }

  async function saveFocused(advance: boolean) {
    if (!focusedCandidate || !focusedDraft) {
      return;
    }

    const checklist = buildChecklist(focusedDraft);
    const status = focusedDraft.finalStatus ?? (checklist ? suggestOpeningRecheckStatus(checklist) : undefined);

    if (!checklist || !status) {
      setBoardError("갭 상태, 확인 가격 반응, 오늘 행동을 모두 고른 뒤 저장해 주세요.");
      return;
    }

    await persistDecision({
      ticker: focusedCandidate.ticker,
      status,
      checklist,
      suggestedStatus: suggestOpeningRecheckStatus(checklist),
      note: focusedDraft.note,
      advance
    });
  }

  async function resetStatus(ticker: string) {
    setDrafts((current) => ({
      ...current,
      [ticker]: createDraft(undefined)
    }));
    await persistDecision({
      ticker,
      status: "pending"
    });
  }

  async function clearBoard() {
    if (!scanKey) {
      return;
    }

    setSavingKey("clear-all");
    setBoardError(null);
    setBoardMessage(null);

    try {
      const response = await fetch("/api/account/opening-check", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          scanKey
        }),
        cache: "no-store"
      });

      await parseResponse<{ cleared: boolean }>(response);
      setDecisions({});
      setDrafts({});
      setFocusTicker(visibleCandidates[0]?.ticker ?? null);
      setBoardMessage("오늘 내 장초 확인 기록을 초기화했습니다.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : "장초 확인 초기화에 실패했습니다.");
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
              아직 유니버스 스캔 결과가 없습니다. 배치 스캔이 끝나면 오늘 먼저 볼 종목이 여기에 반영됩니다.
            </p>
          </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>장초 확인 워크스페이스</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              종목을 하나씩 확인하고 저장 후 다음으로 넘기면 됩니다. 이 화면의 저장 결과가 Today에 바로 반영됩니다.
            </p>
          </div>
          <Badge variant="secondary">오늘 대상 {visibleCandidates.length}개</Badge>
        </div>
        <div className="hidden">
          <CardTitle>오늘 먼저 볼 종목</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            최신 유니버스 스캔에서 지금 먼저 확인할 종목만 추렸습니다. 이 목록은 전일 종가 기준 장전 관찰 목록이며, 장초
            확인을 통과하기 전까지는 실제 매수 신호가 아닙니다.
          </p>
        </div>
        <div className="hidden rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3 text-sm text-muted-foreground">
          배치 {dailyScan.succeededBatches}/{dailyScan.totalBatches} 성공
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="hidden rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm leading-6 text-foreground/82">
          장 시작 후 5~10분 동안 시초가와 계획 기준의 거리, 확인 가격 반응, 오늘 행동 의도를 다시 보고 저장하면
          시스템이 오늘 상태를 자동으로 제안합니다.
        </div>

        <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">오늘 실제 행동 보드</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                내가 저장한 장초 확인 결과를 기준으로 오늘 행동을 정리합니다. 현재 노출 {visibleCandidates.length}개
                기준이며, 마지막 스캔 시각은 {formatDateTimeShort(dailyScan.generatedAt)}입니다.
              </p>
              <p className="hidden mt-2 text-xs leading-5 text-muted-foreground">
                공용 판단은 참고로만 보여주고, Today와 Today Action 보드는 내 장초 확인 기준으로 따로 계산됩니다.
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
              오늘 확인 초기화
            </Button>
          </div>

          {boardMessage ? <p className="mt-3 text-sm text-positive">{boardMessage}</p> : null}
          {boardError ? <p className="mt-3 text-sm text-destructive">{boardError}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {OPENING_RECHECK_STATUSES.map((status) => {
              const meta = getOpeningRecheckStatusMeta(status);

              return (
                <div key={status} className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground">{meta.label}</p>
                    <Badge variant={meta.variant}>{counts[status]}개</Badge>
                  </div>
                  <p className="hidden mt-2 text-xs leading-5 text-muted-foreground">{meta.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {hasCandidates ? (
          <>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-3xl border border-border/70 bg-secondary/25 p-5">
                {focusedCandidate && focusedDraft ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">장초 확인</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <p className="text-xl font-semibold text-foreground">{focusedCandidate.company}</p>
                          <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                            {focusedCandidate.ticker} · 오늘 먼저 볼 종목{" "}
                            {visibleCandidates.findIndex((item) => item.ticker === focusedCandidate.ticker) + 1}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{focusedCandidate.sector}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={resolvedStatus ? getOpeningRecheckStatusMeta(resolvedStatus).variant : "secondary"}
                        >
                          {resolvedStatus ? getOpeningRecheckStatusMeta(resolvedStatus).label : "확인 필요"}
                        </Badge>
                        <ActionBucketBadge
                          bucket={
                            focusedCandidate.actionBucket ??
                            resolveRecommendationActionBucket({
                              signalTone: focusedCandidate.signalTone,
                              score: focusedCandidate.score,
                              activationScore: focusedCandidate.activationScore
                            })
                          }
                        />
                        <SignalToneBadge tone={focusedCandidate.signalTone} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">진입 구간</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {focusedCandidate.tradePlan?.entryLabel ?? "분석 확인"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">손절 기준</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {focusedCandidate.tradePlan?.stopLabel ?? "분석 확인"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">유동성</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {focusedCandidate.liquidityRating ?? formatTurnover(focusedCandidate.averageTurnover20)}
                        </p>
                      </div>
                    </div>

                    <details className="mt-4 group rounded-2xl border border-border/70 bg-background/80">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">서비스 공통 판단 참고</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            서비스가 먼저 저장한 공통 판단입니다. 내 장초 확인과 다르면 아래 체크 기준으로 그대로 저장하면 됩니다.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              focusedSharedDecision
                                ? getOpeningRecheckStatusMeta(focusedSharedDecision.status).variant
                                : "secondary"
                            }
                          >
                            {focusedSharedDecision
                              ? getOpeningRecheckStatusMeta(focusedSharedDecision.status).label
                              : "기록 없음"}
                          </Badge>
                          <span className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1 text-[11px] font-medium text-muted-foreground transition group-open:bg-primary/10 group-open:text-primary">
                            펼치기
                          </span>
                        </div>
                      </summary>
                      <div className="border-t border-border/70 px-4 pb-4 pt-3">
                        <div className="hidden">
                        <div>
                          <p className="text-sm font-semibold text-foreground">서비스 공통 판단</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            공용 레이어에서 먼저 저장된 판단입니다. 내 Today 보드는 아래에서 저장하는 내 장초 확인을 기준으로 움직입니다.
                          </p>
                        </div>
                        <Badge
                          variant={
                            focusedSharedDecision
                              ? getOpeningRecheckStatusMeta(focusedSharedDecision.status).variant
                              : "secondary"
                          }
                        >
                          {focusedSharedDecision
                            ? getOpeningRecheckStatusMeta(focusedSharedDecision.status).label
                            : "공용 판단 없음"}
                        </Badge>
                      </div>

                      {focusedSharedDecision ? (
                        <div className="mt-3 space-y-3">
                          {focusedSharedDecision.checklist ? (
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={getOpeningGapMeta(focusedSharedDecision.checklist.gap).variant}>
                                {getOpeningGapMeta(focusedSharedDecision.checklist.gap).label}
                              </Badge>
                              <Badge
                                variant={
                                  getOpeningConfirmationMeta(focusedSharedDecision.checklist.confirmation).variant
                                }
                              >
                                {getOpeningConfirmationMeta(focusedSharedDecision.checklist.confirmation).label}
                              </Badge>
                              <Badge variant={getOpeningActionIntentMeta(focusedSharedDecision.checklist.action).variant}>
                                {getOpeningActionIntentMeta(focusedSharedDecision.checklist.action).label}
                              </Badge>
                            </div>
                          ) : null}

                          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                            <p>마지막 저장 {formatDateTimeShort(focusedSharedDecision.updatedAt)}</p>
                            <p>{focusedSharedDecision.updatedBy ? `저장 주체 ${focusedSharedDecision.updatedBy}` : "공용 판단 기록"}</p>
                          </div>

                          {focusedSharedDecision.note ? (
                            <p className="text-sm leading-6 text-foreground/82">{focusedSharedDecision.note}</p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          아직 공용 판단이 저장되지 않았습니다. 이 경우에도 아래에서 내 장초 확인을 바로 저장할 수 있습니다.
                        </p>
                      )}
                      </div>
                    </details>

                    <div className="mt-4 grid gap-4">
                      <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">1. 갭 상태</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              시초가가 계획 진입 구간에서 얼마나 멀어졌는지 빠르게 체크합니다.
                            </p>
                          </div>
                          <Badge variant={focusedDraft.gap ? getOpeningGapMeta(focusedDraft.gap).variant : "secondary"}>
                            {focusedDraft.gap ? getOpeningGapMeta(focusedDraft.gap).label : "선택 전"}
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {OPENING_GAP_CHECKS.map((gap) => {
                            const meta = getOpeningGapMeta(gap);
                            return (
                              <Button
                                key={`${focusedCandidate.ticker}-${gap}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-auto min-h-[88px] flex-col items-start rounded-2xl px-4 py-3 text-left",
                                  getChoiceButtonClasses(meta.variant, focusedDraft.gap === gap)
                                )}
                                onClick={() => updateDraft(focusedCandidate.ticker, { gap })}
                              >
                                <span className="w-full text-sm font-semibold">{meta.label}</span>
                                <span className="w-full whitespace-normal text-xs leading-5 text-current/80">
                                  {meta.description}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">2. 확인 가격 반응</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              확인 가격을 지지하거나 돌파했는지, 아직 애매한지, 실패했는지 고릅니다.
                            </p>
                          </div>
                          <Badge
                            variant={
                              focusedDraft.confirmation
                                ? getOpeningConfirmationMeta(focusedDraft.confirmation).variant
                                : "secondary"
                            }
                          >
                            {focusedDraft.confirmation
                              ? getOpeningConfirmationMeta(focusedDraft.confirmation).label
                              : "선택 전"}
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {OPENING_CONFIRMATION_CHECKS.map((confirmation) => {
                            const meta = getOpeningConfirmationMeta(confirmation);
                            return (
                              <Button
                                key={`${focusedCandidate.ticker}-${confirmation}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-auto min-h-[88px] flex-col items-start rounded-2xl px-4 py-3 text-left",
                                  getChoiceButtonClasses(meta.variant, focusedDraft.confirmation === confirmation)
                                )}
                                onClick={() => updateDraft(focusedCandidate.ticker, { confirmation })}
                              >
                                <span className="w-full text-sm font-semibold">{meta.label}</span>
                                <span className="w-full whitespace-normal text-xs leading-5 text-current/80">
                                  {meta.description}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">3. 오늘 행동</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              이 종목을 오늘 진입 검토로 넘길지, 더 볼지, 오늘은 보류할지 정합니다.
                            </p>
                          </div>
                          <Badge
                            variant={
                              focusedDraft.action ? getOpeningActionIntentMeta(focusedDraft.action).variant : "secondary"
                            }
                          >
                            {focusedDraft.action ? getOpeningActionIntentMeta(focusedDraft.action).label : "선택 전"}
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {OPENING_ACTION_INTENTS.map((action) => {
                            const meta = getOpeningActionIntentMeta(action);
                            return (
                              <Button
                                key={`${focusedCandidate.ticker}-${action}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-auto min-h-[88px] flex-col items-start rounded-2xl px-4 py-3 text-left",
                                  getChoiceButtonClasses(meta.variant, focusedDraft.action === action)
                                )}
                                onClick={() => updateDraft(focusedCandidate.ticker, { action })}
                              >
                                <span className="w-full text-sm font-semibold">{meta.label}</span>
                                <span className="w-full whitespace-normal text-xs leading-5 text-current/80">
                                  {meta.description}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">자동 제안 상태</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              위 3가지 체크를 모두 고르면 시스템이 기본 상태를 제안합니다. 필요하면 아래에서 최종 상태를
                              바꿀 수 있습니다.
                            </p>
                          </div>
                          <Badge
                            variant={suggestedStatus ? getOpeningRecheckStatusMeta(suggestedStatus).variant : "secondary"}
                          >
                            {suggestedStatus ? getOpeningRecheckStatusMeta(suggestedStatus).label : "체크를 먼저 선택해 주세요"}
                          </Badge>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                              "justify-start rounded-2xl px-3 text-left",
                              getStatusButtonClasses(
                                suggestedStatus ?? "pending",
                                suggestedStatus !== undefined && !focusedDraft.finalStatus
                              )
                            )}
                            onClick={() => updateDraft(focusedCandidate.ticker, { finalStatus: null })}
                            disabled={!suggestedStatus}
                          >
                            제안대로
                          </Button>
                          {OPENING_RECHECK_DECISION_STATUSES.map((status) => {
                            const meta = getOpeningRecheckStatusMeta(status);
                            return (
                              <Button
                                key={`${focusedCandidate.ticker}-override-${status}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "justify-start rounded-2xl px-3 text-left",
                                  getStatusButtonClasses(status, focusedDraft.finalStatus === status)
                                )}
                                onClick={() => updateDraft(focusedCandidate.ticker, { finalStatus: status })}
                                disabled={!suggestedStatus}
                              >
                                {meta.label}
                              </Button>
                            );
                          })}
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                          <div>
                            <label
                              htmlFor={`opening-note-${focusedCandidate.ticker}`}
                              className="text-sm font-semibold text-foreground"
                            >
                              메모
                            </label>
                            <Textarea
                              id={`opening-note-${focusedCandidate.ticker}`}
                              className="mt-2 min-h-[112px]"
                              placeholder="예: 공용 판단은 통과였지만 내 계좌 기준으로는 시초가 반응이 약해 조금 더 지켜보기"
                              value={focusedDraft.note}
                              onChange={(event) =>
                                updateDraft(focusedCandidate.ticker, { note: event.target.value })
                              }
                            />
                          </div>
                          <div className="flex flex-col justify-end gap-2 lg:min-w-[212px]">
                            {nextFocusCandidate && nextFocusCandidate.ticker !== focusedCandidate.ticker ? (
                              <div className="rounded-2xl border border-border/70 bg-secondary/20 px-3 py-2 text-xs leading-5 text-muted-foreground">
                                다음 종목
                                <span className="ml-2 font-semibold text-foreground">{nextFocusCandidate.company}</span>
                              </div>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void saveFocused(false)}
                              disabled={!canManageBoard || savingKey === focusedCandidate.ticker || !resolvedStatus}
                            >
                              {savingKey === focusedCandidate.ticker ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : null}
                              내 판단 저장
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => void saveFocused(true)}
                              disabled={!canManageBoard || savingKey === focusedCandidate.ticker || !resolvedStatus}
                            >
                              저장 후 다음 종목
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void resetStatus(focusedCandidate.ticker)}
                              disabled={!canManageBoard || savingKey === focusedCandidate.ticker}
                            >
                              대기로 초기화
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-background/70 p-5 text-sm text-muted-foreground">
                    장초 확인할 종목이 없습니다.
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">장초 확인 목록</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      한 종목씩 체크한 뒤 저장 후 다음으로 넘어가면 아침 루틴이 훨씬 짧아집니다.
                    </p>
                  </div>
                  <Badge variant="secondary">{visibleCandidates.length}개</Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {focusedCandidate ? (
                    <div className="rounded-2xl border border-primary/25 bg-primary/8 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">현재 확인 중</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{focusedCandidate.company}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {focusedCandidate.ticker} · {focusedCandidate.sector}
                          </p>
                        </div>
                        <Badge
                          variant={getOpeningRecheckStatusMeta(focusedDecision?.status ?? "pending").variant}
                        >
                          {getOpeningRecheckStatusMeta(focusedDecision?.status ?? "pending").label}
                        </Badge>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    {compactQueueCandidates.length ? (
                      compactQueueCandidates.map((item, index) => (
                        <button
                          key={`compact-${item.ticker}`}
                          type="button"
                          className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3 text-left transition hover:border-primary/25 hover:bg-secondary/30"
                          onClick={() => setFocusTicker(item.ticker)}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground">
                                다음 {index + 1}
                              </span>
                              <p className="truncate text-sm font-medium text-foreground">{item.company}</p>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.ticker} · {item.tradePlan?.entryLabel ?? "진입 구간 확인"}
                            </p>
                          </div>
                          <Badge variant="secondary">바로 이동</Badge>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-4 text-sm text-muted-foreground">
                        남은 종목이 많지 않습니다. 현재 종목만 저장하면 장초 확인이 거의 마무리됩니다.
                      </div>
                    )}
                  </div>
                </div>

                <details className="mt-4 rounded-2xl border border-border/70 bg-secondary/15">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                    전체 목록 보기
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">남음 {pendingCandidates.length}개</Badge>
                      <Badge variant="secondary">완료 {completedCandidatesCount}개</Badge>
                    </div>
                  </summary>

                  <div className="border-t border-border/70 px-3 py-3">
                <div className="mt-3 space-y-3">
                  {visibleCandidates.map((item, index) => {
                    const actionBucket =
                      item.actionBucket ??
                      resolveRecommendationActionBucket({
                        signalTone: item.signalTone,
                        score: item.score,
                        activationScore: item.activationScore
                      });
                    const recheckDecision = decisions[item.ticker];
                    const sharedDecision = sharedDecisions[item.ticker];
                    const recheckStatus = recheckDecision?.status ?? "pending";
                    const recheckMeta = getOpeningRecheckStatusMeta(recheckStatus);
                    const isFocused = focusedCandidate?.ticker === item.ticker;

                    return (
                      <button
                        key={`${item.ticker}-${index}`}
                        type="button"
                        className={cn(
                          "w-full rounded-2xl border px-4 py-4 text-left transition",
                          isFocused
                            ? "border-primary/35 bg-primary/8 shadow-sm"
                            : "border-border/70 bg-secondary/25 hover:border-primary/25 hover:bg-secondary/35"
                        )}
                        onClick={() => setFocusTicker(item.ticker)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
                                {index + 1}
                              </span>
                              <p className="text-sm font-semibold text-foreground">{item.company}</p>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.ticker} · {item.sector}
                            </p>
                          </div>
                          <Badge variant={recheckMeta.variant}>{recheckMeta.label}</Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <ActionBucketBadge bucket={actionBucket} className="min-w-0" />
                          <SignalToneBadge tone={item.signalTone} />
                          {recheckDecision?.checklist ? (
                            <>
                              <Badge variant={getOpeningGapMeta(recheckDecision.checklist.gap).variant}>
                                {getOpeningGapMeta(recheckDecision.checklist.gap).label}
                              </Badge>
                              <Badge
                                variant={getOpeningConfirmationMeta(recheckDecision.checklist.confirmation).variant}
                              >
                                {getOpeningConfirmationMeta(recheckDecision.checklist.confirmation).label}
                              </Badge>
                              <Badge variant={getOpeningActionIntentMeta(recheckDecision.checklist.action).variant}>
                                {getOpeningActionIntentMeta(recheckDecision.checklist.action).label}
                              </Badge>
                            </>
                          ) : null}
                          {!recheckDecision && sharedDecision ? (
                            <Badge variant={getOpeningRecheckStatusMeta(sharedDecision.status).variant}>
                              서비스 판단 {getOpeningRecheckStatusMeta(sharedDecision.status).label}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                          <p>진입: {item.tradePlan?.entryLabel ?? "분석 확인"}</p>
                          <p>손절: {item.tradePlan?.stopLabel ?? "분석 확인"}</p>
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-foreground/82">
                          {recheckDecision?.note?.trim()
                            ? recheckDecision.note
                            : sharedDecision?.note?.trim()
                              ? sharedDecision.note
                              : item.tradePlan?.nextStep ?? "이 종목의 장초 반응을 확인해 주세요."}
                        </p>
                      </button>
                    );
                  })}
                </div>
                  </div>
                </details>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-secondary/25 p-4 text-sm text-muted-foreground">
              총 {dailyScan.totalTickers}개 종목을 스캔했고, 그중 오늘 먼저 볼 종목만 자동 정렬했습니다. 장초 확인이 끝나기
              전까지는 이 목록 전체를 곧바로 실행 신호로 보지 않는 편이 안전합니다.{" "}
              <Link className="font-medium text-primary hover:text-primary/80" href="/ranking">
                전체 종목 순위 보기
              </Link>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-caution/30 bg-caution/10 p-4 text-sm text-caution">
            아직 오늘 먼저 볼 종목이 생성되지 않았습니다. 스캔이 끝나지 않았거나 데이터 수집에 실패했을 수 있습니다.
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
