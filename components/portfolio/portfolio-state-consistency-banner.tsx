"use client";

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { PortfolioStateConsistencyReport } from "@/lib/portfolio/portfolio-state-consistency";

export function PortfolioStateConsistencyBanner({
  report
}: {
  report: PortfolioStateConsistencyReport;
}) {
  if (report.status !== "warning") {
    return null;
  }

  return (
    <div className="rounded-[28px] border border-caution/28 bg-[hsl(var(--caution)/0.08)] px-5 py-4 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.16)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="caution" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              기록 정합성 확인 필요
            </Badge>
            <Badge variant="secondary">{report.issueCount}건</Badge>
          </div>
          <p className="text-sm font-semibold text-foreground">{report.summary}</p>
          <div className="space-y-1">
            {report.issues.slice(0, 3).map((issue) => (
              <p key={`${issue.ticker}-${issue.type}`} className="text-sm leading-6 text-foreground/82">
                {issue.detail}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
