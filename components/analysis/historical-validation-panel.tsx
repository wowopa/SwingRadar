import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";
import type { ValidationBasis, ValidationInsight, ValidationStats } from "@/types/recommendation";
import type { TrackingDetail, SignalHistoryEntry } from "@/types/tracking";

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeTrackingResult(result: string) {
  if (result.includes("감시") || result.includes("媛먯떆")) {
    return "감시중";
  }
  if (result.includes("진행") || result.includes("吏꾪뻾")) {
    return "진행중";
  }
  if (result.includes("성공") || result.includes("?깃났")) {
    return "성공";
  }
  if (result.includes("실패") || result.includes("?ㅽ뙣")) {
    return "실패";
  }
  if (result.includes("무효") || result.includes("臾댄슚")) {
    return "무효화";
  }

  return result;
}

function summarizeHistory(history: SignalHistoryEntry[]) {
  const normalized = history.map((item) => normalizeTrackingResult(item.result));
  const successCount = normalized.filter((item) => item === "성공").length;
  const failedCount = normalized.filter((item) => item === "실패" || item === "무효화").length;
  const inProgressCount = normalized.filter((item) => item === "감시중" || item === "진행중").length;

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
  details,
  validation,
  validationBasis,
  insight
}: {
  history: SignalHistoryEntry[];
  details: Record<string, TrackingDetail>;
  validation?: ValidationStats;
  validationBasis?: ValidationBasis;
  insight?: ValidationInsight;
}) {
  const resolvedInsight = resolveValidationInsight(validationBasis, validation, insight);
  const summary = summarizeHistory(history);

  return (
    <Card>
      <CardHeader>
        <CardTitle>과거 유사 흐름</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {resolvedInsight ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <MetricCard label="검증 기준" value={resolvedInsight.basis} note={resolvedInsight.headline} />
              <MetricCard label="신뢰 수준" value={resolvedInsight.level} note={resolvedInsight.detail} />
              <MetricCard
                label="실측 전환"
                value={
                  resolvedInsight.basis === "실측 기반"
                    ? "실측 사용 중"
                    : typeof resolvedInsight.samplesToMeasured === "number" && resolvedInsight.samplesToMeasured > 0
                      ? `${resolvedInsight.samplesToMeasured}건 남음`
                      : "표본 축적 중"
                }
                note={validation ? `현재 참고 표본 ${validation.sampleSize}건` : "검증 표본 집계 중"}
              />
            </div>
            <div className={`rounded-[24px] border px-4 py-4 text-sm leading-7 ${getInsightTone(resolvedInsight.level)}`}>
              {resolvedInsight.detail}
            </div>
          </>
        ) : null}

        {!history.length ? (
          <div className="rounded-[24px] border border-border/70 bg-secondary/20 px-5 py-6">
            <p className="text-sm leading-7 text-muted-foreground">
              이 종목의 과거 종료된 공용 추적 이력은 아직 많지 않습니다. 지금은 검증 기준과 표본 수를 먼저 보고, 실제 사례가 더 쌓이는지 계속 확인하는 편이 좋습니다.
            </p>
          </div>
        ) : null}

        {history.length ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="누적 이력" value={`${summary.total}건`} note="같은 종목의 과거 신호 기준" />
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
                          {item.signalDate} 신호 · {normalizeTrackingResult(item.result)}
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
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function resolveValidationInsight(
  validationBasis?: ValidationBasis,
  validation?: ValidationStats,
  insight?: ValidationInsight
) {
  if (insight) {
    return insight;
  }

  if (!validationBasis || !validation) {
    return null;
  }

  const level =
    validationBasis === "실측 기반"
      ? "높음"
      : validationBasis === "공용 추적 참고"
        ? "보통"
        : validationBasis === "유사 흐름 참고" || validationBasis === "유사 업종 참고"
          ? "보통"
          : "주의";
  const samplesToMeasured = validationBasis === "실측 기반" ? 0 : Math.max(0, 8 - validation.sampleSize);

  return {
    level,
    basis: validationBasis,
    headline: `${validationBasis} 기준 ${validation.sampleSize}건을 참고합니다.`,
    detail:
      validationBasis === "실측 기반"
        ? `실측 이력 기준 승률 ${validation.hitRate}% / 평균 수익 ${formatPercent(validation.avgReturn)}입니다.`
        : samplesToMeasured > 0
          ? `실측 전환 판단까지 참고 표본 ${samplesToMeasured}건 정도가 더 필요합니다.`
          : "표본 수는 어느 정도 쌓였지만 아직 실측 기반보다 참고 성격이 더 큽니다.",
    samplesToMeasured
  } as const;
}

function getInsightTone(level: ValidationInsight["level"]) {
  if (level === "높음") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (level === "보통") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-rose-200 bg-rose-50 text-rose-800";
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
