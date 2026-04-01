import { DashboardFocusBoard } from "@/components/recommendations/dashboard-focus-board";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBarGroup } from "@/components/shared/public-data-status-bar";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { listRecommendations } from "@/lib/services/recommendations-service";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage({
  searchParams
}: {
  searchParams?: Promise<{ "opening-check"?: string | string[] }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const openingCheckParam = Array.isArray(resolvedSearchParams["opening-check"])
    ? resolvedSearchParams["opening-check"][0]
    : resolvedSearchParams["opening-check"];
  const openingCheckCompleted = openingCheckParam === "done";
  const session = await getCurrentUserSession();
  const response = await listRecommendations({ sort: "score_desc" }, { userId: session?.user.id });
  const statusSummaries = [
    buildPublicDataStatusSummary("recommendations", response.generatedAt),
    buildPublicDataStatusSummary("daily-candidates", response.dailyScan?.generatedAt ?? response.generatedAt)
  ];

  return (
    <main>
      <PageHeader eyebrow="Today" title="내 오늘 행동" />
      <PublicDataStatusBarGroup summaries={statusSummaries} />

      <DashboardFocusBoard
        summary={response.todaySummary}
        todayActionBoard={response.todayActionBoard}
        holdingActionBoard={response.holdingActionBoard}
        dailyScan={response.dailyScan}
        openingReview={response.openingReview}
        openingCheckCompleted={openingCheckCompleted}
      />
    </main>
  );
}
