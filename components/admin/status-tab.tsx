"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { MetricCard, formatAuditEventType, formatDateTime } from "@/components/admin/dashboard-shared";
import type { AuditItem, HealthPayload, UniverseDailyCandidates } from "@/components/admin/dashboard-types";

export function StatusTab({
  health,
  audits,
  dailyCandidates
}: {
  health: HealthPayload | null;
  audits: AuditItem[];
  dailyCandidates: UniverseDailyCandidates | null;
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>서비스 상태</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <MetricCard label="서비스" value={health?.status ?? "not_loaded"} note={health?.service ?? "미로딩"} />
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
            <MetricCard label="후보 생성 시각" value={dailyCandidates ? formatDateTime(dailyCandidates.generatedAt) : "없음"} note="daily-candidates 기준" />
            <MetricCard label="대상 종목" value={String(dailyCandidates?.totalTickers ?? 0)} note={`배치 크기 ${dailyCandidates?.batchSize ?? 0}`} />
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
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>상위 유니버스 후보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dailyCandidates?.topCandidates.length ? (
              dailyCandidates.topCandidates.slice(0, 5).map((item) => (
                <div key={item.ticker} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">
                      {item.company} {item.ticker}
                    </p>
                    <p className="text-xs text-primary">candidate {item.candidateScore}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    batch {item.batch} | {item.signalTone} | {item.eventCoverage}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.rationale}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">현재 노출 가능한 상위 유니버스 후보가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
