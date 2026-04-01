import { DailyCandidatesPanel } from "@/components/recommendations/daily-candidates-panel";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBarGroup } from "@/components/shared/public-data-status-bar";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { listRecommendations } from "@/lib/services/recommendations-service";

export const dynamic = "force-dynamic";

export default async function OpeningCheckPage({
  searchParams
}: {
  searchParams?: Promise<{ ticker?: string | string[] }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const tickerParam = Array.isArray(resolvedSearchParams.ticker)
    ? resolvedSearchParams.ticker[0]
    : resolvedSearchParams.ticker;
  const initialFocusTicker = typeof tickerParam === "string" ? tickerParam.toUpperCase() : null;
  const session = await getCurrentUserSession();
  const response = await listRecommendations({ sort: "score_desc" }, { userId: session?.user.id });
  const statusSummaries = [
    buildPublicDataStatusSummary("recommendations", response.generatedAt),
    buildPublicDataStatusSummary("daily-candidates", response.dailyScan?.generatedAt ?? response.generatedAt)
  ];

  return (
    <main className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Today"
        title="장초 확인"
        description="오늘 먼저 볼 종목을 하나씩 짧게 확인하고, 통과한 종목만 실제 매수 검토 대상으로 남기는 단계입니다."
      />
      <PublicDataStatusBarGroup summaries={statusSummaries} />

      <DailyCandidatesPanel dailyScan={response.dailyScan} initialFocusTicker={initialFocusTicker} />
    </main>
  );
}
