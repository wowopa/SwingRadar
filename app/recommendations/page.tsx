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
        description="지금 천천히 볼 만한 종목과 가격 기준, 참고할 이유를 쉽게 정리한 페이지입니다."
      />
      <section className="mb-6">
        <DailyCandidatesPanel dailyScan={response.dailyScan} />
      </section>
      <RecommendationExplorer items={response.items} dailyScan={response.dailyScan} />
    </main>
  );
}
