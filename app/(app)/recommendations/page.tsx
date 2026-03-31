import { DashboardFocusBoard } from "@/components/recommendations/dashboard-focus-board";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBarGroup } from "@/components/shared/public-data-status-bar";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { listRecommendations } from "@/lib/services/recommendations-service";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const session = await getCurrentUserSession();
  const response = await listRecommendations({ sort: "score_desc" }, { userId: session?.user.id });
  const statusSummaries = [
    buildPublicDataStatusSummary("recommendations", response.generatedAt),
    buildPublicDataStatusSummary("daily-candidates", response.dailyScan?.generatedAt ?? response.generatedAt)
  ];

  return (
    <main>
      <PageHeader
        eyebrow="Dashboard"
        title="오늘의 행동"
        description="오늘 매수 검토, 보유 우선 관리, 장초 확인 대기만 먼저 보여주는 메인 화면입니다."
      />
      <PublicDataStatusBarGroup summaries={statusSummaries} />

      <DashboardFocusBoard
        summary={response.todaySummary}
        todayActionBoard={response.todayActionBoard}
        holdingActionBoard={response.holdingActionBoard}
        dailyScan={response.dailyScan}
        openingReview={response.openingReview}
      />
    </main>
  );
}
