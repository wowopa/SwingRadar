"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";

import type { OpsVerificationPayload } from "@/components/admin/dashboard-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAdminToken } from "@/lib/use-admin-token";

function getTone(status: OpsVerificationPayload["status"]) {
  if (status === "blocked") {
    return {
      card: "border-destructive/28 bg-destructive/6",
      badge: "border-destructive/28 bg-destructive/10 text-destructive",
      icon: ShieldAlert
    };
  }

  if (status === "monitor") {
    return {
      card: "border-caution/28 bg-caution/8",
      badge: "border-caution/28 bg-caution/12 text-caution",
      icon: AlertTriangle
    };
  }

  return {
    card: "border-positive/25 bg-positive/8",
    badge: "border-positive/25 bg-positive/12 text-positive",
    icon: CheckCircle2
  };
}

function getCheckTone(status: OpsVerificationPayload["checks"][number]["status"]) {
  if (status === "fail") {
    return "border-destructive/24 bg-destructive/6";
  }

  if (status === "warn") {
    return "border-caution/24 bg-caution/8";
  }

  return "border-border/70 bg-white/80";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "아직 기록 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function OpsVerificationCard({ initialSummary }: { initialSummary: OpsVerificationPayload | null }) {
  const { authHeaders } = useAdminToken();
  const [summary, setSummary] = useState(initialSummary);
  const [drafts, setDrafts] = useState<Record<OpsVerificationPayload["checks"][number]["key"], string>>({
    scheduler: "",
    backup: "",
    restore: "",
    rollback: "",
    smoke: ""
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<OpsVerificationPayload["checks"][number]["key"] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setSummary(initialSummary);
    if (!initialSummary) {
      return;
    }

    setDrafts(
      Object.fromEntries(initialSummary.checks.map((check) => [check.key, check.operatorNote ?? ""])) as Record<
        OpsVerificationPayload["checks"][number]["key"],
        string
      >
    );
  }, [initialSummary]);

  async function refresh() {
    if (!authHeaders) {
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/ops-verification", {
        headers: authHeaders,
        cache: "no-store"
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        requestId?: string;
        summary?: OpsVerificationPayload;
      };

      if (!response.ok || !payload.summary) {
        throw new Error(
          payload.requestId
            ? `${payload.message ?? "운영 검증 요약을 불러오지 못했습니다."} (request: ${payload.requestId})`
            : payload.message ?? "운영 검증 요약을 불러오지 못했습니다."
        );
      }

      setSummary(payload.summary);
      setDrafts(
        Object.fromEntries(payload.summary.checks.map((check) => [check.key, check.operatorNote ?? ""])) as Record<
          OpsVerificationPayload["checks"][number]["key"],
          string
        >
      );
      setMessage("운영 검증 요약을 새로 불러왔습니다.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "운영 검증 요약을 불러오지 못했습니다.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function confirmCheckpoint(key: OpsVerificationPayload["checks"][number]["key"]) {
    if (!authHeaders) {
      setError("관리자 토큰이 없어 운영 체크를 저장할 수 없습니다.");
      return;
    }

    setSavingKey(key);
    setError(null);

    try {
      const response = await fetch("/api/admin/ops-verification", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          key,
          note: drafts[key]
        })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        requestId?: string;
        summary?: OpsVerificationPayload;
      };

      if (!response.ok || !payload.summary) {
        throw new Error(
          payload.requestId
            ? `${payload.message ?? "운영 체크를 저장하지 못했습니다."} (request: ${payload.requestId})`
            : payload.message ?? "운영 체크를 저장하지 못했습니다."
        );
      }

      setSummary(payload.summary);
      setDrafts(
        Object.fromEntries(payload.summary.checks.map((check) => [check.key, check.operatorNote ?? ""])) as Record<
          OpsVerificationPayload["checks"][number]["key"],
          string
        >
      );
      setMessage(`${payload.summary.checks.find((check) => check.key === key)?.label ?? key} 확인 기록을 저장했습니다.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "운영 체크를 저장하지 못했습니다.");
    } finally {
      setSavingKey(null);
    }
  }

  if (!summary) {
    return null;
  }

  const tone = getTone(summary.status);
  const Icon = tone.icon;

  return (
    <Card className={tone.card}>
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-wrap items-center gap-3 text-foreground">
          <span>운영 검증 체크포인트</span>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tone.badge}`}>
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {summary.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full border border-border/70 bg-white/75 px-3 py-1.5 text-foreground">통과 {summary.passCount}</span>
          <span className="rounded-full border border-caution/24 bg-caution/10 px-3 py-1.5 text-caution">경고 {summary.warningCount}</span>
          <span className="rounded-full border border-destructive/24 bg-destructive/10 px-3 py-1.5 text-destructive">차단 {summary.failureCount}</span>
          <span className="rounded-full border border-border/70 bg-white/75 px-3 py-1.5 text-foreground">
            최근 갱신 {formatDateTime(summary.updatedAt || null)}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{summary.summary}</p>
          <p className="text-sm leading-6 text-muted-foreground">{summary.nextAction}</p>
        </div>

        {message ? (
          <div className="rounded-[22px] border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground/82">{message}</div>
        ) : null}
        {error ? (
          <div className="rounded-[22px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-2">
          {summary.checks.map((check) => (
            <div key={check.key} className={`rounded-[22px] border px-4 py-4 ${getCheckTone(check.status)}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{check.label}</p>
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{check.status}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{check.note}</p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>최근 확인: {formatDateTime(check.checkedAt)}</p>
                <p>권장 주기: {check.cadenceLabel}</p>
                {check.checkedBy ? <p>확인자: {check.checkedBy}</p> : null}
              </div>
              <Textarea
                value={drafts[check.key] ?? ""}
                onChange={(event) => setDrafts((current) => ({ ...current, [check.key]: event.target.value }))}
                className="mt-3 min-h-[88px] bg-white/80"
                placeholder="무엇을 확인했고 어디를 봤는지 짧게 남겨두세요."
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void confirmCheckpoint(check.key)}
                  disabled={savingKey === check.key || isRefreshing}
                >
                  {savingKey === check.key ? "저장 중..." : "지금 확인 완료"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {summary.blockers.length ? (
          <div className="rounded-[22px] border border-border/70 bg-white/78 px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">남은 막힘</p>
            <div className="mt-3 space-y-2">
              {summary.blockers.slice(0, 5).map((item) => (
                <p key={item} className="text-sm leading-6 text-foreground/82">
                  {item}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isRefreshing || savingKey !== null}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            새로 고침
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
