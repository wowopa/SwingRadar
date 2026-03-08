import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SignalHistoryEntry } from "@/types/tracking";
import { formatPercent } from "@/lib/utils";

export function TrackingOverview({ items }: { items: SignalHistoryEntry[] }) {
  const successCount = items.filter((item) => item.result === "성공").length;
  const invalidatedCount = items.filter((item) => item.result === "무효화").length;
  const avgHolding = items.length ? (items.reduce((sum, item) => sum + item.holdingDays, 0) / items.length).toFixed(1) : "0.0";
  const avgMfe = items.length ? items.reduce((sum, item) => sum + item.mfe, 0) / items.length : 0;

  return (
    <section className="grid gap-4 lg:grid-cols-4">
      <OverviewCard label="추적 이력" value={`${items.length}건`} detail="신호 발생 후 사후 검증 전체 수" />
      <OverviewCard label="성공 케이스" value={`${successCount}건`} detail={`무효화 ${invalidatedCount}건`} />
      <OverviewCard label="평균 보유" value={`${avgHolding}일`} detail="신호별 추적 기간 평균" />
      <OverviewCard label="평균 MFE" value={formatPercent(avgMfe)} detail="사후 기대값 복기 지표" />
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
