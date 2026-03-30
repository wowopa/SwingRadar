import { DailyCandidatesPanel } from "@/components/recommendations/daily-candidates-panel";
import { RecommendationExplorer } from "@/components/recommendations/recommendation-explorer";
import { TodayOperatingSummary } from "@/components/recommendations/today-operating-summary";
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
        eyebrow="Today"
        title="오늘의 운영 요약"
        description="오늘 신규 매수를 얼마나 볼 수 있는지부터 먼저 보고, 실제로 확인할 종목만 빠르게 정리하는 화면입니다."
      />
      <PublicDataStatusBarGroup summaries={statusSummaries} />
      <section className="mb-6">
        <TodayOperatingSummary items={response.items} summary={response.todaySummary} workflow={response.operatingWorkflow} />
      </section>
      <section className="mb-6">
        <DailyCandidatesPanel dailyScan={response.dailyScan} />
      </section>
      <RecommendationExplorer items={response.items} />
    </main>
  );
}
