import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";
import type { TrackingDetail, SignalHistoryEntry } from "@/types/tracking";

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizeHistory(history: SignalHistoryEntry[]) {
  const successCount = history.filter((item) => item.result === "성공").length;
  const failedCount = history.filter((item) => item.result === "실패" || item.result === "무효화").length;
  const inProgressCount = history.filter((item) => item.result === "감시중" || item.result === "진행중").length;

  return {
    total: history.length,
    successCount,
    failedCount,
    inProgressCount,
    avgMfe: average(history.map((item) => item.mfe)),
    avgMae: average(history.map((item) => item.mae)),
    avgHoldingDays: average(history.map((item) => item.holdingDays))
  };
}

export function HistoricalValidationPanel({
  history,
  details
}: {
  history: SignalHistoryEntry[];
  details: Record<string, TrackingDetail>;
}) {
  if (!history.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>과거 유사 사례</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-muted-foreground">
            이 종목에 대해 누적된 과거 신호 이력이 아직 많지 않습니다. 현재는 검증 요약과 이벤트 근거를 중심으로 해석하는 편이 좋습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const summary = summarizeHistory(history);

  return (
    <Card>
      <CardHeader>
        <CardTitle>과거 유사 사례</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="누적 사례" value={`${summary.total}건`} note="같은 종목 과거 신호 기준" />
          <MetricCard label="성공" value={`${summary.successCount}건`} note={`실패/무효화 ${summary.failedCount}건`} />
          <MetricCard label="진행중" value={`${summary.inProgressCount}건`} note="아직 종료되지 않은 사례" />
          <MetricCard label="평균 최대 이익" value={formatPercent(summary.avgMfe)} note="보유 중 최고 수익 구간" />
          <MetricCard label="평균 보유일" value={`${summary.avgHoldingDays.toFixed(1)}일`} note={`평균 최대 손실 ${formatPercent(summary.avgMae)}`} />
        </div>

        <div className="space-y-3">
          {history.slice(0, 3).map((item) => {
            const detail = details[item.id];

            return (
              <div key={item.id} className="rounded-[24px] border border-border/70 bg-secondary/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.signalDate} 신호 · {item.result}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      진입 점수 {item.entryScore} · 보유 {item.holdingDays}일 · 최대 이익 {formatPercent(item.mfe)} · 최대 손실 {formatPercent(item.mae)}
                    </p>
                  </div>
                  <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-foreground/80">
                    {item.signalTone}
                  </span>
                </div>
                {detail ? (
                  <div className="mt-3 space-y-2 text-sm leading-7">
                    <p className="text-foreground/82">{detail.summary}</p>
                    <p className="text-muted-foreground">{detail.afterActionReview}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
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
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}
