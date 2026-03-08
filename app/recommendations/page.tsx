import { DailyCandidatesPanel } from "@/components/recommendations/daily-candidates-panel";
import { RecommendationExplorer } from "@/components/recommendations/recommendation-explorer";
import { PageHeader } from "@/components/shared/page-header";
import { getRecommendations } from "@/lib/repositories/recommendations";

export default async function RecommendationsPage() {
  const response = await getRecommendations();

  return (
    <main>
      <PageHeader
        eyebrow="Recommendations"
        title="관찰 신호 보드"
        description="종목 추천이 아니라 지금 관찰할 만한 신호의 강도, 근거, 무효화 조건, 기본 검증 통계를 함께 보여주는 페이지입니다."
      />
      <section className="mb-6">
        <DailyCandidatesPanel dailyScan={response.dailyScan} />
      </section>
      <RecommendationExplorer items={response.items} dailyScan={response.dailyScan} />
    </main>
  );
}
