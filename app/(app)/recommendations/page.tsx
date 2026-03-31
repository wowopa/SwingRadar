import { DailyCandidatesPanel } from "@/components/recommendations/daily-candidates-panel";
import { DashboardFocusBoard } from "@/components/recommendations/dashboard-focus-board";
import { HoldingActionBoard } from "@/components/recommendations/holding-action-board";
import { TodayActionBoard } from "@/components/recommendations/today-action-board";
import { TodayOperatingSummary } from "@/components/recommendations/today-operating-summary";
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
        title="오늘의 행동 대시보드"
        description="설명보다 행동을 먼저 보여주는 메인 화면입니다. 오늘 신규 매수 검토 종목, 장초 확인 상태, 보유 관리 우선순위를 한 번에 확인합니다."
      />
      <PublicDataStatusBarGroup summaries={statusSummaries} />

      <DashboardFocusBoard
        summary={response.todaySummary}
        todayActionBoard={response.todayActionBoard}
        holdingActionBoard={response.holdingActionBoard}
        dailyScan={response.dailyScan}
      />

      {response.todayActionBoard ? (
        <section className="mb-6">
          <TodayActionBoard board={response.todayActionBoard} />
        </section>
      ) : null}

      {response.holdingActionBoard ? (
        <section className="mb-6">
          <HoldingActionBoard board={response.holdingActionBoard} />
        </section>
      ) : null}

      <section className="mb-6">
        <TodayOperatingSummary items={response.items} summary={response.todaySummary} workflow={response.operatingWorkflow} />
      </section>

      <section className="mb-6">
        <DailyCandidatesPanel dailyScan={response.dailyScan} />
      </section>
    </main>
  );
}

