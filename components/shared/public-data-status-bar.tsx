import type { PublicDataStatusSummary } from "@/lib/server/public-data-status";
import { cn, formatDateTimeShort } from "@/lib/utils";

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
  return <PublicDataStatusBarGroup summaries={[summary]} />;
}

export function PublicDataStatusBarGroup({ summaries }: { summaries: PublicDataStatusSummary[] }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-1.5 text-xs font-medium text-foreground/78">
        데이터 기준
      </span>
      {summaries.map((item) => {
        const tone = getToneClasses(item.freshness);

        return (
          <div
            key={`${item.label}-${item.generatedAt}`}
            className={cn("inline-flex flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-xs", tone.surface)}
          >
            <span className="font-semibold text-foreground">{item.title}</span>
            <span className="text-muted-foreground">{item.sourceLabel}</span>
            <span className={cn("rounded-full border px-2 py-0.5 font-medium", tone.badge)}>
              {formatDateTimeShort(item.generatedAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
