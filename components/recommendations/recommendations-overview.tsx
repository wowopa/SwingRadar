import type { DailyScanSummaryDto } from "@/lib/api-contracts/swing-radar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";
import type { Recommendation } from "@/types/recommendation";

export function RecommendationsOverview({
  items,
  dailyScan
}: {
  items: Recommendation[];
  dailyScan: DailyScanSummaryDto | null;
}) {
  if (!items.length) {
    return (
      <section className="grid gap-4 lg:grid-cols-5">
        <OverviewCard label="관찰 종목" value="0개" detail="현재 필터 조건에 맞는 신호가 없습니다." />
        <OverviewCard label="평균 점수" value="-" detail="검색어나 필터를 완화해 보세요." />
        <OverviewCard label="평균 적중률" value="-" detail="조건에 맞는 검증 표본이 없습니다." />
        <OverviewCard label="주의 비중" value="-" detail="현재 결과가 비어 있습니다." />
        <OverviewCard label="핵심 메모" value="결과 없음" detail="종목명, 티커, 신호 톤 필터를 다시 조정해 보세요." />
      </section>
    );
  }

  const avgScore = Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
  const avgHitRate = Math.round(items.reduce((sum, item) => sum + item.validation.hitRate, 0) / items.length);
  const positiveCount = items.filter((item) => item.signalTone === "긍정").length;
  const cautionCount = items.filter((item) => item.signalTone === "주의").length;
  const tightInvalidationCount = items.filter((item) => item.invalidationDistance > -3).length;
  const bestAverageReturn = [...items].sort((a, b) => b.validation.avgReturn - a.validation.avgReturn)[0];
  const topCandidate = dailyScan?.topCandidates[0] ?? null;

  return (
    <section className="grid gap-4 lg:grid-cols-5">
      <OverviewCard label="관찰 종목" value={`${items.length}개`} detail="종목 추천이 아니라 감시 리스트 기준 관찰 신호입니다." />
      <OverviewCard label="평균 점수" value={`${avgScore}`} detail="현재 조건에서 포착된 신호 강도 평균" />
      <OverviewCard label="평균 적중률" value={`${avgHitRate}%`} detail="유사 구조 사후 검증 기준" />
      <OverviewCard label="주의 비중" value={`${cautionCount}개`} detail={`긍정 ${positiveCount}개 / 주의 ${cautionCount}개`} />
      <OverviewCard
        label={topCandidate ? "오늘의 상위 후보" : "핵심 메모"}
        value={topCandidate ? topCandidate.company : bestAverageReturn.company}
        detail={
          topCandidate
            ? `후보 점수 ${topCandidate.candidateScore}, 커버리지 ${topCandidate.eventCoverage}`
            : `평균 수익 ${formatPercent(bestAverageReturn.validation.avgReturn)}, 타이트 무효화 ${tightInvalidationCount}개`
        }
      />
    </section>
  );
}

function OverviewCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
