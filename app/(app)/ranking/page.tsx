import { RecommendationExplorer } from "@/components/recommendations/recommendation-explorer";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDailyCandidates } from "@/lib/repositories/daily-candidates";
import { getRecommendations } from "@/lib/repositories/recommendations";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { formatDateTimeShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const [recommendations, dailyCandidates] = await Promise.all([getRecommendations(), getDailyCandidates()]);

  const statusSummary = buildPublicDataStatusSummary(
    dailyCandidates ? "daily-candidates" : "recommendations",
    dailyCandidates?.generatedAt ?? recommendations.generatedAt
  );

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Signals"
        title="서비스 공통 후보"
        description="이 순위표는 모두가 함께 보는 공통 후보 레이어입니다. 오늘 서비스가 좋게 보는 종목을 비교하고, 필요한 종목만 상세 분석으로 들어갑니다."
      />
      <PublicDataStatusBar summary={statusSummary} />

      <section className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          title="오늘 분석 대상"
          value={`${dailyCandidates?.totalTickers ?? recommendations.items.length}개`}
          note="전일 데이터 기준으로 오늘 우선순위를 계산한 전체 분석 대상입니다."
        />
        <SummaryCard
          title="공통 후보 수"
          value={`${dailyCandidates?.topCandidates.length ?? recommendations.items.length}개`}
          note="모두가 같이 보는 공통 후보입니다. 실제 실행 여부는 Today와 Portfolio에서 개인 기준으로 다시 갈립니다."
        />
        <SummaryCard
          title="최신 갱신 시각"
          value={dailyCandidates ? formatDateTimeShort(dailyCandidates.generatedAt) : "-"}
          note="지금 보고 있는 공통 후보 데이터가 마지막으로 갱신된 시각입니다."
        />
      </section>

      <section>
        <RecommendationExplorer items={recommendations.items} />
      </section>
    </main>
  );
}

function SummaryCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card className="border-border/70 bg-white/82 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
