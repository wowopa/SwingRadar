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
        eyebrow="Explore"
        title="후보 순위표"
        description="대시보드 밖에서 전체 후보를 넓게 비교하는 영역입니다. 카드보다 표 중심으로 보고, 필요한 종목만 상세 분석으로 들어갑니다."
      />
      <PublicDataStatusBar summary={statusSummary} />

      <section className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          title="오늘 스캔한 종목"
          value={`${dailyCandidates?.totalTickers ?? recommendations.items.length}개`}
          note="전일 데이터 기준으로 장전 후보를 추리는 전체 유니버스입니다."
        />
        <SummaryCard
          title="오늘 상위 후보"
          value={`${(dailyCandidates?.topCandidates ?? []).slice(0, 10).length}개`}
          note="실제 행동은 이 중에서도 장초 확인과 포트폴리오 한도를 통과한 일부만 남습니다."
        />
        <SummaryCard
          title="최근 갱신 시각"
          value={dailyCandidates ? formatDateTimeShort(dailyCandidates.generatedAt) : "-"}
          note="지금 보고 있는 탐색 데이터가 마지막으로 갱신된 시각입니다."
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
