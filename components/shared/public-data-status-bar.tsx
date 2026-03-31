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
  const hasSingleSummary = summaries.length === 1;

  return (
    <div className="mb-6 rounded-[28px] border border-border/70 bg-card/45 px-5 py-4">
      <div
        className={cn(
          "flex flex-col gap-3 md:flex-row",
          hasSingleSummary ? "items-start justify-between gap-4" : "items-start justify-between md:flex-wrap"
        )}
      >
        <div className={cn("min-w-0", hasSingleSummary ? "flex-1" : "w-full md:flex-1")}>
          <p className="text-sm font-semibold text-foreground">데이터 기준</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            같은 화면 안에서도 대시보드, 종목 순위표, 상세 분석이 서로 다른 스냅샷 시각을 쓸 수 있어 기준 시각을 함께
            보여드립니다.
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            오전 8시에 종목 데이터를 갱신하고, 오전 8시 30분에 갱신된 데이터를 바탕으로 종목 우선순위와 분석 내용을 다시
            정리합니다.
          </p>
        </div>
        <div
          className={cn(
            "grid w-full gap-3",
            hasSingleSummary ? "self-start md:max-w-[320px] md:shrink-0" : "md:min-w-[280px] md:grid-cols-2"
          )}
        >
          {summaries.map((item) => {
            const tone = getToneClasses(item.freshness);

            return (
              <div key={`${item.label}-${item.generatedAt}`} className={`rounded-[22px] border px-4 py-3 ${tone.surface}`}>
                <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground">{item.title}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{item.sourceLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">기준 시각 {formatDateTimeShort(item.generatedAt)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
