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
import type {
  DailyScanSummaryDto,
  OpeningCheckLearningInsightDto,
  OpeningRecheckDecisionDto,
  PersonalRuleReminderDto
} from "@/lib/api-contracts/swing-radar";
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
    return "border-border/80 bg-[hsl(42_36%_97%)] text-foreground/78 hover:border-border hover:bg-white";
  }

  if (status === "passed") {
    return "border-positive/45 bg-[hsl(var(--positive)/0.18)] text-positive shadow-sm hover:bg-[hsl(var(--positive)/0.24)]";
  }

  if (status === "watch") {
    return "border-neutral/45 bg-[hsl(var(--neutral)/0.18)] text-neutral shadow-sm hover:bg-[hsl(var(--neutral)/0.24)]";
  }

  if (status === "avoid") {
    return "border-caution/45 bg-[hsl(var(--caution)/0.16)] text-caution shadow-sm hover:bg-[hsl(var(--caution)/0.22)]";
  }

  return "border-primary/40 bg-primary/12 text-primary shadow-sm hover:bg-primary/16";
}

function getChoiceButtonClasses(
  variant: "default" | "secondary" | "positive" | "neutral" | "caution",
  isActive: boolean
) {
  if (!isActive) {
    return "border-border/80 bg-[hsl(42_36%_97%)] text-foreground/80 hover:border-border hover:bg-white";
  }

  if (variant === "positive") {
    return "border-positive/45 bg-[hsl(var(--positive)/0.18)] text-positive shadow-sm hover:bg-[hsl(var(--positive)/0.24)]";
  }

  if (variant === "neutral") {
    return "border-neutral/45 bg-[hsl(var(--neutral)/0.18)] text-neutral shadow-sm hover:bg-[hsl(var(--neutral)/0.24)]";
  }

  if (variant === "caution") {
    return "border-caution/45 bg-[hsl(var(--caution)/0.16)] text-caution shadow-sm hover:bg-[hsl(var(--caution)/0.22)]";
  }

  return "border-primary/45 bg-primary/12 text-primary shadow-sm hover:bg-primary/16";
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
  openingCheckLearning,
  personalRuleReminder,
  initialFocusTicker
}: {
  dailyScan: DailyScanSummaryDto | null;
  openingCheckLearning?: OpeningCheckLearningInsightDto;
  personalRuleReminder?: PersonalRuleReminderDto;
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
  const allChecksCompleted = hasCandidates && pendingCandidates.length === 0;
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

      const remainingPendingCount = visibleCandidates.filter(
        (item) => (nextDecisions[item.ticker]?.status ?? "pending") === "pending"
      ).length;

      if (input.advance) {
        if (remainingPendingCount === 0) {
          startTransition(() => {
            router.push("/recommendations?opening-check=done");
          });
        } else {
          setFocusTicker(getNextFocusTicker(input.ticker, visibleCandidates, nextDecisions));
        }
      }

      const resolvedMeta =
        input.status === "pending"
          ? getOpeningRecheckStatusMeta("pending")
          : getOpeningRecheckStatusMeta(input.status as OpeningDecisionStatus);
      setBoardMessage(`${input.ticker}에 대한 내 장초 확인을 ${resolvedMeta.label}로 저장했습니다.`);
      if (!(input.advance && remainingPendingCount === 0)) {
        startTransition(() => {
          router.refresh();
        });
      }
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
      <CardContent className="space-y-3 pt-5 sm:space-y-4 sm:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-[hsl(42_44%_96%)] px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">전체 {visibleCandidates.length}개</Badge>
            <Badge variant="secondary">남음 {pendingCandidates.length}개</Badge>
            <Badge variant="secondary">완료 {completedCandidatesCount}개</Badge>
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

        {boardMessage ? <p className="text-sm text-positive">{boardMessage}</p> : null}
        {boardError ? <p className="text-sm text-destructive">{boardError}</p> : null}

        {openingCheckLearning ? (
          <div className="rounded-2xl border border-primary/18 bg-primary/8 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">최근 학습</Badge>
              <p className="text-sm font-medium text-foreground">{openingCheckLearning.headline}</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{openingCheckLearning.primaryLesson}</p>
          </div>
        ) : null}

        {personalRuleReminder ? (
          <div className="rounded-2xl border border-caution/24 bg-[hsl(var(--caution)/0.1)] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="caution">내 규칙</Badge>
              <p className="text-sm font-medium text-foreground">{personalRuleReminder.primaryRule}</p>
            </div>
            {personalRuleReminder.secondaryRules.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {personalRuleReminder.secondaryRules.map((rule) => (
                  <span
                    key={rule}
                    className="rounded-full border border-caution/24 bg-white/88 px-2.5 py-1 text-[11px] leading-5 text-foreground/78"
                  >
                    {rule}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {allChecksCompleted ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-positive/30 bg-[hsl(var(--positive)/0.12)] px-4 py-3">
            <p className="text-sm font-medium text-foreground">장초 확인이 모두 끝났습니다.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/recommendations?opening-check=done">Today로 돌아가기</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/portfolio">Portfolio 보기</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {OPENING_RECHECK_STATUSES.map((status) => {
            const meta = getOpeningRecheckStatusMeta(status);

            return (
              <div key={status} className="rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-foreground">{meta.label}</p>
                  <Badge variant={meta.variant}>{counts[status]}개</Badge>
                </div>
              </div>
            );
          })}
        </div>

        {hasCandidates ? (
          <>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:gap-4">
              <div className="rounded-3xl border border-border/80 bg-white/90 p-4 shadow-[0_20px_48px_-32px_rgba(24,32,42,0.24)] sm:p-5">
                {focusedCandidate && focusedDraft ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">장초 확인</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <p className="text-xl font-semibold text-foreground">{focusedCandidate.company}</p>
                          <span className="rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-1 text-xs text-muted-foreground">
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

                    <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-3 rounded-2xl border border-border/80 bg-[hsl(42_38%_97%)] px-4 py-3 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">진입</span>{" "}
                        {focusedCandidate.tradePlan?.entryLabel ?? "분석 확인"}
                        <span className="mx-2 text-border">·</span>
                        <span className="font-medium text-foreground">손절</span>{" "}
                        {focusedCandidate.tradePlan?.stopLabel ?? "분석 확인"}
                        <span className="mx-2 text-border">·</span>
                        <span className="font-medium text-foreground">유동성</span>{" "}
                        {focusedCandidate.liquidityRating ?? formatTurnover(focusedCandidate.averageTurnover20)}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4">
                      <div className="rounded-2xl border border-border/80 bg-[hsl(42_40%_97%)] p-3.5 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">1. 갭 상태</p>
                          <Badge variant={focusedDraft.gap ? getOpeningGapMeta(focusedDraft.gap).variant : "secondary"}>
                            {focusedDraft.gap ? getOpeningGapMeta(focusedDraft.gap).label : "선택 전"}
                          </Badge>
                        </div>
                        <div className="mt-2.5 grid gap-2 sm:mt-3 sm:grid-cols-3">
                          {OPENING_GAP_CHECKS.map((gap) => {
                            const meta = getOpeningGapMeta(gap);
                            return (
                              <Button
                                key={`${focusedCandidate.ticker}-${gap}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-auto min-h-[64px] flex-col items-start rounded-2xl px-3 py-2.5 text-left sm:min-h-[78px] sm:px-4 sm:py-3",
                                  getChoiceButtonClasses(meta.variant, focusedDraft.gap === gap)
                                )}
                                onClick={() => updateDraft(focusedCandidate.ticker, { gap })}
                              >
                                <span className="w-full text-sm font-semibold">{meta.label}</span>
                                <span className="w-full whitespace-normal text-[11px] leading-4 text-current/80 sm:text-xs sm:leading-5">
                                  {meta.description}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border/80 bg-[hsl(42_40%_97%)] p-3.5 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">2. 확인 가격 반응</p>
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
                        <div className="mt-2.5 grid gap-2 sm:mt-3 sm:grid-cols-3">
                          {OPENING_CONFIRMATION_CHECKS.map((confirmation) => {
                            const meta = getOpeningConfirmationMeta(confirmation);
                            return (
                              <Button
                                key={`${focusedCandidate.ticker}-${confirmation}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-auto min-h-[64px] flex-col items-start rounded-2xl px-3 py-2.5 text-left sm:min-h-[78px] sm:px-4 sm:py-3",
                                  getChoiceButtonClasses(meta.variant, focusedDraft.confirmation === confirmation)
                                )}
                                onClick={() => updateDraft(focusedCandidate.ticker, { confirmation })}
                              >
                                <span className="w-full text-sm font-semibold">{meta.label}</span>
                                <span className="w-full whitespace-normal text-[11px] leading-4 text-current/80 sm:text-xs sm:leading-5">
                                  {meta.description}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border/80 bg-[hsl(42_40%_97%)] p-3.5 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">3. 오늘 행동</p>
                          <Badge
                            variant={
                              focusedDraft.action ? getOpeningActionIntentMeta(focusedDraft.action).variant : "secondary"
                            }
                          >
                            {focusedDraft.action ? getOpeningActionIntentMeta(focusedDraft.action).label : "선택 전"}
                          </Badge>
                        </div>
                        <div className="mt-2.5 grid gap-2 sm:mt-3 sm:grid-cols-3">
                          {OPENING_ACTION_INTENTS.map((action) => {
                            const meta = getOpeningActionIntentMeta(action);
                            return (
                              <Button
                                key={`${focusedCandidate.ticker}-${action}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-auto min-h-[64px] flex-col items-start rounded-2xl px-3 py-2.5 text-left sm:min-h-[78px] sm:px-4 sm:py-3",
                                  getChoiceButtonClasses(meta.variant, focusedDraft.action === action)
                                )}
                                onClick={() => updateDraft(focusedCandidate.ticker, { action })}
                              >
                                <span className="w-full text-sm font-semibold">{meta.label}</span>
                                <span className="w-full whitespace-normal text-[11px] leading-4 text-current/80 sm:text-xs sm:leading-5">
                                  {meta.description}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border/80 bg-[linear-gradient(180deg,rgba(246,241,232,0.9),rgba(255,255,255,0.92))] p-3.5 sm:p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">자동 제안 상태</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {personalRuleReminder
                                ? "3개 체크 후 개인 규칙까지 같이 보고 저장합니다."
                                : "3개 체크를 고르면 바로 저장할 수 있습니다."}
                            </p>
                          </div>
                          <Badge
                            variant={suggestedStatus ? getOpeningRecheckStatusMeta(suggestedStatus).variant : "secondary"}
                          >
                            {suggestedStatus ? getOpeningRecheckStatusMeta(suggestedStatus).label : "체크 필요"}
                          </Badge>
                        </div>

                        {personalRuleReminder ? (
                          <div className="mt-3 rounded-2xl border border-caution/24 bg-[hsl(var(--caution)/0.08)] px-3 py-3">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">내 규칙 우선</p>
                            <p className="mt-1 text-sm text-foreground/88">{personalRuleReminder.primaryRule}</p>
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-col gap-2 lg:mt-4 lg:flex-row lg:items-center">
                          <Button
                            type="button"
                            className="h-10 lg:h-11 lg:flex-1"
                            onClick={() => void saveFocused(false)}
                            disabled={!canManageBoard || savingKey === focusedCandidate.ticker || !resolvedStatus}
                          >
                            {savingKey === focusedCandidate.ticker ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            저장
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-10 lg:h-11 lg:flex-1"
                            onClick={() => void saveFocused(true)}
                            disabled={!canManageBoard || savingKey === focusedCandidate.ticker || !resolvedStatus}
                          >
                            저장 후 다음
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => void resetStatus(focusedCandidate.ticker)}
                            disabled={!canManageBoard || savingKey === focusedCandidate.ticker}
                          >
                            대기로 초기화
                          </Button>
                        </div>

                        {nextFocusCandidate && nextFocusCandidate.ticker !== focusedCandidate.ticker ? (
                          <div className="mt-3 rounded-2xl border border-border/80 bg-[hsl(42_42%_96%)] px-3 py-2 text-xs leading-5 text-muted-foreground">
                            다음 종목
                            <span className="ml-2 font-semibold text-foreground">{nextFocusCandidate.company}</span>
                          </div>
                        ) : null}

                        <details className="mt-4 rounded-2xl border border-border/80 bg-white/70">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                            최종 상태 조정 / 메모 / 서비스 판단 참고
                            <Badge variant="secondary">선택 사항</Badge>
                          </summary>
                          <div className="border-t border-border/70 px-4 py-4">
                            <div className="grid gap-2 sm:grid-cols-5">
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

                            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
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
                                  placeholder="예: 시초가 반응이 약해 조금 더 지켜보기"
                                  value={focusedDraft.note}
                                  onChange={(event) =>
                                    updateDraft(focusedCandidate.ticker, { note: event.target.value })
                                  }
                                />
                              </div>

                              <div className="space-y-3 rounded-2xl border border-border/80 bg-[hsl(42_38%_97%)] p-4">
                                <div className="text-sm">
                                  <p className="font-semibold text-foreground">서비스 공통 판단</p>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    공통 판단은 참고만 하고, 실제 Today는 내 저장 결과를 따릅니다.
                                  </p>
                                </div>

                                {focusedSharedDecision ? (
                                  <>
                                    <Badge
                                      variant={getOpeningRecheckStatusMeta(focusedSharedDecision.status).variant}
                                    >
                                      {getOpeningRecheckStatusMeta(focusedSharedDecision.status).label}
                                    </Badge>
                                    {focusedSharedDecision.checklist ? (
                                      <div className="flex flex-wrap gap-2">
                                        <Badge variant={getOpeningGapMeta(focusedSharedDecision.checklist.gap).variant}>
                                          {getOpeningGapMeta(focusedSharedDecision.checklist.gap).label}
                                        </Badge>
                                        <Badge
                                          variant={
                                            getOpeningConfirmationMeta(focusedSharedDecision.checklist.confirmation)
                                              .variant
                                          }
                                        >
                                          {
                                            getOpeningConfirmationMeta(focusedSharedDecision.checklist.confirmation)
                                              .label
                                          }
                                        </Badge>
                                        <Badge
                                          variant={
                                            getOpeningActionIntentMeta(focusedSharedDecision.checklist.action).variant
                                          }
                                        >
                                          {getOpeningActionIntentMeta(focusedSharedDecision.checklist.action).label}
                                        </Badge>
                                      </div>
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">
                                      마지막 저장 {formatDateTimeShort(focusedSharedDecision.updatedAt)}
                                    </p>
                                    {focusedSharedDecision.note ? (
                                      <p className="text-sm leading-6 text-foreground/82">{focusedSharedDecision.note}</p>
                                    ) : null}
                                  </>
                                ) : (
                                  <p className="text-sm text-muted-foreground">저장된 공통 판단이 없습니다.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-border/80 bg-[hsl(42_40%_97%)] p-5 text-sm text-muted-foreground">
                    장초 확인할 종목이 없습니다.
                  </div>
                )}
              </div>

                <div className="rounded-3xl border border-border/80 bg-[hsl(42_34%_97%)] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">장초 확인 목록</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      한 종목씩 체크한 뒤 저장 후 다음으로 넘어가면 아침 루틴이 훨씬 짧아집니다.
                    </p>
                  </div>
                  <Badge variant="secondary">{visibleCandidates.length}개</Badge>
                </div>

                <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                  {focusedCandidate ? (
                    <div className="rounded-2xl border border-primary/28 bg-[linear-gradient(145deg,rgba(24,32,42,0.98),rgba(34,41,54,0.94))] px-4 py-4 shadow-[0_22px_52px_-34px_rgba(24,32,42,0.68)]">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/65">현재 확인 중</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-primary-foreground">{focusedCandidate.company}</p>
                          <p className="mt-1 text-xs text-primary-foreground/70">
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
                          className="flex w-full items-center justify-between rounded-2xl border border-border/80 bg-white/78 px-4 py-3 text-left transition hover:border-primary/25 hover:bg-white"
                          onClick={() => setFocusTicker(item.ticker)}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-2 py-0.5 text-[11px] text-muted-foreground">
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
                      <div className="rounded-2xl border border-border/80 bg-white/80 px-4 py-4 text-sm text-muted-foreground">
                        남은 종목이 많지 않습니다. 현재 종목만 저장하면 장초 확인이 거의 마무리됩니다.
                      </div>
                    )}
                  </div>
                </div>

                <details className="mt-4 rounded-2xl border border-border/80 bg-[hsl(42_38%_97%)]">
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
                            ? "border-primary/32 bg-primary/10 shadow-sm"
                            : "border-border/80 bg-white/78 hover:border-primary/25 hover:bg-white"
                        )}
                        onClick={() => setFocusTicker(item.ticker)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-2.5 py-1 text-[11px] text-muted-foreground">
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

            <div className="rounded-2xl border border-border/80 bg-[hsl(42_42%_96%)] p-4 text-sm text-muted-foreground">
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
