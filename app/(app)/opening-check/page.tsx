import { DailyCandidatesPanel } from "@/components/recommendations/daily-candidates-panel";
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

  return (
    <main className="pb-10">
      <DailyCandidatesPanel
        dailyScan={response.dailyScan}
        openingCheckLearning={response.openingCheckLearning}
        personalRuleReminder={response.personalRuleReminder}
        initialFocusTicker={initialFocusTicker}
      />
    </main>
  );
}
