"use client";

import { AlertTriangle, CheckCircle2, FlaskConical, ShieldAlert } from "lucide-react";

import type { PrelaunchDryRunPayload } from "@/components/admin/dashboard-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function getTone(status: PrelaunchDryRunPayload["status"]) {
  if (status === "blocked") {
    return {
      card: "border-destructive/28 bg-destructive/6",
      badge: "border-destructive/28 bg-destructive/10 text-destructive",
      icon: ShieldAlert
    };
  }

  if (status === "trial") {
    return {
      card: "border-caution/28 bg-caution/8",
      badge: "border-caution/28 bg-caution/12 text-caution",
      icon: FlaskConical
    };
  }

  return {
    card: "border-positive/25 bg-positive/8",
    badge: "border-positive/25 bg-positive/12 text-positive",
    icon: CheckCircle2
  };
}

function getCheckTone(status: PrelaunchDryRunPayload["checks"][number]["status"]) {
  if (status === "fail") {
    return "border-destructive/24 bg-destructive/6";
  }

  if (status === "warn") {
    return "border-caution/24 bg-caution/8";
  }

  return "border-border/70 bg-white/80";
}

export function PrelaunchDryRunCard({
  dryRun,
  onSelectTab
}: {
  dryRun: PrelaunchDryRunPayload;
  onSelectTab: (tab: "data-quality" | "users" | "notices") => void;
}) {
  const tone = getTone(dryRun.status);
  const Icon = tone.icon;

  return (
    <Card className={tone.card}>
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-wrap items-center gap-3 text-foreground">
          <span>공개 전 드라이런</span>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tone.badge}`}>
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {dryRun.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full border border-border/70 bg-white/75 px-3 py-1.5 text-foreground">
            권장 규모 {dryRun.recommendedCohort}
          </span>
          <span className="rounded-full border border-border/70 bg-white/75 px-3 py-1.5 text-foreground">
            통과 {dryRun.passCount}
          </span>
          <span className="rounded-full border border-caution/24 bg-caution/10 px-3 py-1.5 text-caution">
            경고 {dryRun.warningCount}
          </span>
          <span className="rounded-full border border-destructive/24 bg-destructive/10 px-3 py-1.5 text-destructive">
            차단 {dryRun.failureCount}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{dryRun.summary}</p>
          <p className="text-sm leading-6 text-muted-foreground">{dryRun.nextAction}</p>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {dryRun.checks.map((check) => (
            <div key={check.key} className={`rounded-[22px] border px-4 py-4 ${getCheckTone(check.status)}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{check.label}</p>
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{check.status}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{check.note}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[22px] border border-border/70 bg-white/78 px-4 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">드라이런 동안 매일 볼 항목</p>
          </div>
          <div className="mt-3 space-y-2">
            {dryRun.dailyChecks.map((item) => (
              <p key={item} className="text-sm leading-6 text-foreground/82">
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onSelectTab("data-quality")}>
            데이터 품질 보기
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSelectTab("users")}>
            파일럿 사용자 보기
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSelectTab("notices")}>
            공지 점검
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
