import { DailyCandidatesPanel } from "@/components/recommendations/daily-candidates-panel";
import { RecommendationExplorer } from "@/components/recommendations/recommendation-explorer";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBarGroup } from "@/components/shared/public-data-status-bar";
import { getRecommendations } from "@/lib/repositories/recommendations";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const response = await getRecommendations();
  const statusSummaries = [
    buildPublicDataStatusSummary("recommendations", response.generatedAt),
    buildPublicDataStatusSummary("daily-candidates", response.dailyScan?.generatedAt ?? response.generatedAt)
  ];

  return (
    <main>
      <PageHeader
        eyebrow="Recommendations"
        title="관찰 신호 보드"
        description="지금 차분히 볼 만한 종목과 가격 기준, 참고 이유를 한눈에 정리해두는 페이지입니다."
      />
      <PublicDataStatusBarGroup summaries={statusSummaries} />
      <section className="mb-6">
        <DailyCandidatesPanel dailyScan={response.dailyScan} />
      </section>
      <RecommendationExplorer items={response.items} />
    </main>
  );
}
