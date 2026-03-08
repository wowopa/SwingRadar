"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import {
  MetricCard,
  UNIVERSE_REVIEW_STATUS_OPTIONS,
  formatAuditEventType,
  formatDateTime,
  formatUniverseReviewStatus
} from "@/components/admin/dashboard-shared";
import type { AuditItem, HealthPayload, UniverseDailyCandidates, UniverseReviewStatus } from "@/components/admin/dashboard-types";

type ReviewDraftState = Record<string, { status: UniverseReviewStatus; note: string }>;

export function StatusTab({
  health,
  audits,
  dailyCandidates,
  watchlistTickers,
  onPromoteCandidate,
  onSaveReview,
  loading
}: {
  health: HealthPayload | null;
  audits: AuditItem[];
  dailyCandidates: UniverseDailyCandidates | null;
  watchlistTickers: string[];
  onPromoteCandidate: (ticker: string) => void;
  onSaveReview: (ticker: string, status: UniverseReviewStatus, note: string) => void;
  loading: boolean;
}) {
  const [reviewDrafts, setReviewDrafts] = useState<ReviewDraftState>({});

  useEffect(() => {
    setReviewDrafts(
      Object.fromEntries(
        (dailyCandidates?.topCandidates ?? []).map((item) => [
          item.ticker,
          {
            status: item.review?.status ?? "new",
            note: item.review?.note ?? ""
          }
        ])
      )
    );
  }, [dailyCandidates]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>서비스 상태</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard label="서비스" value={health?.status ?? "not_loaded"} note={health?.service ?? "미로드"} />
            <MetricCard
              label="현재 provider"
              value={health?.dataProvider.lastUsed?.provider ?? health?.dataProvider.configured.provider ?? "unknown"}
              note={health?.dataProvider.lastUsed?.mode ?? health?.dataProvider.configured.mode ?? "unknown"}
            />
            <MetricCard label="대체 상태" value={health?.dataProvider.fallbackTriggered ? "사용 중" : "기본"} note="" />
            <MetricCard label="최근 감사 로그" value={String(health?.recentAuditCount ?? 0)} note="health 기준 recent count" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>최근 감사 로그</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {audits.length ? (
              audits.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                  <p className="text-sm font-semibold text-white">{item.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatAuditEventType(item.eventType)} | {item.actor} | {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">감사 로그가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>유니버스 스캔 상태</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="후보 생성 시각"
              value={dailyCandidates ? formatDateTime(dailyCandidates.generatedAt) : "없음"}
              note="daily-candidates 기준"
            />
            <MetricCard
              label="대상 종목"
              value={String(dailyCandidates?.totalTickers ?? 0)}
              note={`배치 크기 ${dailyCandidates?.batchSize ?? 0}`}
            />
            <MetricCard
              label="성공 배치"
              value={`${dailyCandidates?.succeededBatches ?? 0}/${dailyCandidates?.totalBatches ?? 0}`}
              note="일일 스캔 성공 현황"
            />
            <MetricCard
              label="실패 배치"
              value={String(dailyCandidates?.failedBatches.length ?? 0)}
              note={dailyCandidates?.failedBatches[0]?.errors[0] ?? "실패 없음"}
            />
          </CardContent>
          {dailyCandidates?.failedBatches.length ? (
            <CardContent className="space-y-3 pt-0">
              {dailyCandidates.failedBatches.slice(0, 3).map((batch) => (
                <div key={batch.batch} className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold text-white">
                    배치 {batch.batch} 실패, 종목 {batch.count}개
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{batch.errors.join(" | ")}</p>
                </div>
              ))}
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>상위 유니버스 후보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dailyCandidates?.topCandidates.length ? (
              dailyCandidates.topCandidates.slice(0, 5).map((item) => {
                const draft = reviewDrafts[item.ticker] ?? { status: "new" as UniverseReviewStatus, note: "" };
                return (
                  <div key={item.ticker} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {item.company} {item.ticker}
                      </p>
                      <div className="flex items-center gap-2">
                        {watchlistTickers.includes(item.ticker) ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-positive/40 bg-positive/10 px-2.5 py-1 text-[11px] text-positive">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            watchlist
                          </span>
                        ) : null}
                        <p className="text-xs text-primary">candidate {item.candidateScore}</p>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      batch {item.batch} | {item.signalTone} | {item.eventCoverage}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{item.rationale}</p>
                    <div className="mt-3 grid gap-3 lg:grid-cols-[180px_1fr_auto]">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">검토 상태</p>
                        <select
                          className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-white"
                          value={draft.status}
                          onChange={(event) =>
                            setReviewDrafts((current) => ({
                              ...current,
                              [item.ticker]: {
                                status: event.target.value as UniverseReviewStatus,
                                note: current[item.ticker]?.note ?? item.review?.note ?? ""
                              }
                            }))
                          }
                        >
                          {UNIVERSE_REVIEW_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {item.review ? (
                          <p className="text-[11px] text-muted-foreground">
                            현재 저장값: {formatUniverseReviewStatus(item.review.status)} | {item.review.updatedBy} |{" "}
                            {formatDateTime(item.review.updatedAt)}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">운영 메모</p>
                        <Textarea
                          value={draft.note}
                          placeholder="후보 검토 메모를 남겨두세요."
                          onChange={(event) =>
                            setReviewDrafts((current) => ({
                              ...current,
                              [item.ticker]: {
                                status: current[item.ticker]?.status ?? item.review?.status ?? "new",
                                note: event.target.value
                              }
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-col justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={loading}
                          onClick={() => onSaveReview(item.ticker, draft.status, draft.note)}
                        >
                          검토 저장
                        </Button>
                        <Button
                          size="sm"
                          variant={watchlistTickers.includes(item.ticker) ? "outline" : "default"}
                          disabled={loading || watchlistTickers.includes(item.ticker)}
                          onClick={() => onPromoteCandidate(item.ticker)}
                        >
                          <ArrowRight className="h-4 w-4" />
                          {watchlistTickers.includes(item.ticker) ? "편입 완료" : "watchlist 편입"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">현재 노출 가능한 상위 유니버스 후보가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 배치 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dailyCandidates?.batchSummaries.length ? (
            dailyCandidates.batchSummaries.slice(0, 5).map((batch) => (
              <div key={`${batch.batch}-${batch.generatedAt}`} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    배치 {batch.batch} | 종목 {batch.count}개 | tracking {batch.trackingRows}행
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(batch.generatedAt)}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">대표 종목 {batch.topTicker ?? "없음"}</p>
                {batch.warnings?.length ? (
                  <p className="mt-2 text-xs text-destructive">{batch.warnings.join(" | ")}</p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">아직 기록된 배치 요약이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
