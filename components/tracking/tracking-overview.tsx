import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";
import type { SignalHistoryEntry } from "@/types/tracking";

export function TrackingOverview({ items }: { items: SignalHistoryEntry[] }) {
  const watchCount = items.filter((item) => item.result === "감시중").length;
  const activeCount = items.filter((item) => item.result === "진행중").length;
  const winCount = items.filter((item) => item.result === "성공").length;
  const closedCount = items.filter((item) => !["감시중", "진행중"].includes(item.result)).length;
  const avgHolding = items.length ? (items.reduce((sum, item) => sum + item.holdingDays, 0) / items.length).toFixed(1) : "0.0";
  const avgMfe = items.length ? items.reduce((sum, item) => sum + item.mfe, 0) / items.length : 0;

  return (
    <section className="grid gap-4 lg:grid-cols-4">
      <OverviewCard label="공용 추적 종목" value={`${items.length}개`} detail="서비스가 누적 기록 중인 전체 감시·추적 종목 수" />
      <OverviewCard
        label="감시와 진행"
        value={`감시 ${watchCount}개 · 진행 ${activeCount}개`}
        detail={`종료 ${closedCount}개 · 성공 ${winCount}개`}
      />
      <OverviewCard label="평균 보유일" value={`${avgHolding}일`} detail="공용 추적 상태가 유지된 평균 기간" />
      <OverviewCard label="평균 최대 상승" value={formatPercent(avgMfe)} detail="추적 중 가장 강했던 구간의 평균 상승폭" />
    </section>
  );
}

function OverviewCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
