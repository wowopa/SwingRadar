import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SignalHistoryEntry } from "@/types/tracking";
import { formatPercent } from "@/lib/utils";

export function TrackingOverview({ items }: { items: SignalHistoryEntry[] }) {
  const successCount = items.filter((item) => item.result === "성공").length;
  const reviewAgainCount = items.filter((item) => item.result === "무효화").length;
  const avgHolding = items.length ? (items.reduce((sum, item) => sum + item.holdingDays, 0) / items.length).toFixed(1) : "0.0";
  const avgMfe = items.length ? items.reduce((sum, item) => sum + item.mfe, 0) / items.length : 0;

  return (
    <section className="grid gap-4 lg:grid-cols-4">
      <OverviewCard label="살펴본 기록" value={`${items.length}건`} detail="지금까지 확인한 전체 흐름 수" />
      <OverviewCard label="좋았던 사례" value={`${successCount}건`} detail={`다시 봐야 했던 사례 ${reviewAgainCount}건`} />
      <OverviewCard label="평균 본 기간" value={`${avgHolding}일`} detail="얼마나 오래 지켜봤는지 평균" />
      <OverviewCard label="평균 최고 상승폭" value={formatPercent(avgMfe)} detail="이후 가장 많이 오른 폭의 평균" />
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
