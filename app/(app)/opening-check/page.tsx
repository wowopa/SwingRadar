import { DailyCandidatesPanel } from "@/components/recommendations/daily-candidates-panel";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
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
  const openingCandidates = response.dailyScan?.openingCheckCandidates ?? [];

  return (
    <main className="space-y-5 pb-10">
      <PageHeader
        eyebrow="Today"
        title="장초 확인"
        description="오늘 먼저 볼 종목만 빠르게 체크하고 저장하세요. 통과한 종목만 Today의 매수 검토 영역으로 넘어갑니다."
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="neutral">오늘 대상 {openingCandidates.length}개</Badge>
        <Badge variant="secondary">3개 체크 후 저장</Badge>
        <Badge variant="secondary">저장 후 다음으로 이동 가능</Badge>
      </div>

      <DailyCandidatesPanel dailyScan={response.dailyScan} initialFocusTicker={initialFocusTicker} />
    </main>
  );
}
