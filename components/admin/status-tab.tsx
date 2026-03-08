"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { MetricCard, formatAuditEventType, formatDateTime } from "@/components/admin/dashboard-shared";
import type { AuditItem, HealthPayload } from "@/components/admin/dashboard-types";

export function StatusTab({ health, audits }: { health: HealthPayload | null; audits: AuditItem[] }) {
  return (
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
          <MetricCard label="폴백 상태" value={health?.dataProvider.fallbackTriggered ? "사용 중" : "기본"} note="" />
          <MetricCard label="최근 감사 로그" value={String(health?.recentAuditCount ?? 0)} note="최근 5건 기준" />
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
  );
}