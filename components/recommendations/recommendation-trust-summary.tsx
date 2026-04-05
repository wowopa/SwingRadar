"use client";

import { Badge } from "@/components/ui/badge";
import { buildRecommendationTrustSummary } from "@/lib/recommendations/recommendation-trust";
import { cn, formatPercent } from "@/lib/utils";

export function RecommendationTrustSummary({
  summary,
  mode = "detailed",
  className
}: {
  summary: ReturnType<typeof buildRecommendationTrustSummary>;
  mode?: "compact" | "detailed";
  className?: string;
}) {
  const levelVariant =
    summary.levelTone === "positive"
      ? "positive"
      : summary.levelTone === "caution"
        ? "caution"
        : "neutral";

  if (mode === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={levelVariant} className="h-5 px-2 text-[10px]">
            {summary.levelLabel}
          </Badge>
          <Badge variant="secondary" className="h-5 px-2 text-[10px]">
            {summary.basisLabel}
          </Badge>
          <Badge
            variant={
              summary.patternLabel.includes("강함")
                ? "positive"
                : summary.patternLabel.includes("약함")
                  ? "caution"
                  : "neutral"
            }
            className="h-5 px-2 text-[10px]"
          >
            {summary.patternLabel}
          </Badge>
        </div>
        <p className="text-xs leading-5 text-foreground/82">{summary.summary}</p>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>표본 {summary.sampleSize}건</span>
          <span>적중률 {summary.hitRate}%</span>
          <span>평균 수익 {formatPercent(summary.avgReturn)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[24px] border p-4",
        summary.levelTone === "positive"
          ? "border-positive/24 bg-[hsl(var(--positive)/0.08)]"
          : summary.levelTone === "caution"
            ? "border-caution/24 bg-[hsl(var(--caution)/0.08)]"
            : "border-border/80 bg-[hsl(42_38%_97%)]",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={levelVariant}>{summary.levelLabel}</Badge>
        <Badge variant="secondary">{summary.basisLabel}</Badge>
        <Badge
          variant={
            summary.patternLabel.includes("강함")
              ? "positive"
              : summary.patternLabel.includes("약함")
                ? "caution"
                : "neutral"
          }
        >
          {summary.patternLabel}
        </Badge>
        {summary.stageLabel ? <Badge variant="neutral">{summary.stageLabel}</Badge> : null}
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{summary.summary}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <TrustDetailItem label="검증 근거" value={summary.basisLabel} note={summary.basisDetail} />
        <TrustDetailItem label="최근 패턴" value={summary.patternLabel} note={summary.patternDetail} />
        <TrustDetailItem
          label="표본 / 적중률"
          value={`${summary.sampleSize}건 · ${summary.hitRate}%`}
          note={`평균 수익 ${formatPercent(summary.avgReturn)}`}
        />
      </div>
    </div>
  );
}

function TrustDetailItem({
  label,
  value,
  note
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/70 bg-white/82 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}
