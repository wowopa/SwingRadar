import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatScore } from "@/lib/utils";
import type { TrackingDiagnostic } from "@/types/recommendation";

function getStageTone(diagnostic: TrackingDiagnostic) {
  if (diagnostic.isEntryEligible) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (diagnostic.isWatchEligible) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function TrackingDiagnosticPanel({ diagnostic }: { diagnostic?: TrackingDiagnostic | null }) {
  if (!diagnostic) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>공용 추적 진단</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-muted-foreground">
            공용 추적용 진단 데이터가 아직 준비되지 않았습니다. 다음 배치 이후에는 활성화 점수와 부족한 조건을 함께 확인할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>공용 추적 진단</CardTitle>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStageTone(diagnostic)}`}>{diagnostic.stage}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="활성화 점수" value={`${formatScore(diagnostic.activationScore)}점`} note="공용 추적 선별용 점수" />
          <MetricCard label="자동 감시 기준" value={`${formatScore(diagnostic.watchThreshold)}점`} note="자동 감시 시작 최소 기준" />
          <MetricCard label="진입 기준" value={`${formatScore(diagnostic.entryThreshold)}점`} note="진입 추적 최소 기준" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-emerald-200/70 bg-emerald-50/50 p-4">
            <p className="text-sm font-semibold text-foreground">충족한 조건</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/82">
              {diagnostic.supports.length ? (
                diagnostic.supports.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>현재는 눈에 띄는 강점이 아직 충분하지 않습니다.</li>
              )}
            </ul>
          </div>
          <div className="rounded-[24px] border border-amber-200/70 bg-amber-50/50 p-4">
            <p className="text-sm font-semibold text-foreground">보강이 필요한 조건</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/82">
              {diagnostic.blockers.length ? (
                diagnostic.blockers.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>현재 공용 추적 기준은 대부분 충족하고 있습니다.</li>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  note
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}
