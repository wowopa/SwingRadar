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
        eyebrow="Today"
        title="내 오늘 행동"
        description="서비스 공통 후보를 바탕으로, 내 계좌 기준 오늘 무엇을 해야 하는지만 남기는 화면입니다. 장초 확인을 마치고 실제 매수 검토와 보유 관리로 이어갑니다."
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
