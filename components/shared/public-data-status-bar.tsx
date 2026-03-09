import type { PublicDataStatusSummary } from "@/lib/server/public-data-status";
import { formatDateTimeShort } from "@/lib/utils";

function getToneClasses(freshness: PublicDataStatusSummary["freshness"]) {
  if (freshness === "critical") {
    return {
      surface: "border-rose-200 bg-rose-50/90",
      badge: "border-rose-200 bg-white text-rose-700"
    };
  }

  if (freshness === "warning") {
    return {
      surface: "border-amber-200 bg-amber-50/90",
      badge: "border-amber-200 bg-white text-amber-700"
    };
  }

  return {
    surface: "border-emerald-200 bg-emerald-50/80",
    badge: "border-emerald-200 bg-white text-emerald-700"
  };
}

export function PublicDataStatusBar({ summary }: { summary: PublicDataStatusSummary }) {
  const tone = getToneClasses(summary.freshness);

  return (
    <div className={`mb-6 rounded-[28px] border px-5 py-4 ${tone.surface}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{summary.summary}</p>
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}>
              {summary.badge}
            </span>
          </div>
          <p className="text-sm leading-6 text-foreground/72">{summary.detail}</p>
        </div>
        <div className="min-w-[220px] rounded-[22px] border border-border/60 bg-white/80 px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground">데이터 기준</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{summary.sourceLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">업데이트 {formatDateTimeShort(summary.generatedAt)}</p>
        </div>
      </div>
    </div>
  );
}
