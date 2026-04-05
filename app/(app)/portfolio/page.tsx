import { redirect } from "next/navigation";

import { PortfolioWorkspace } from "@/components/portfolio/portfolio-workspace";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { mergePortfolioProfileWithJournal } from "@/lib/portfolio/merge-profile-with-journal";
import { loadPortfolioCloseReviewsForUser } from "@/lib/server/portfolio-close-reviews";
import { loadPortfolioJournalForUser } from "@/lib/server/portfolio-journal";
import { loadPortfolioPersonalRulesForUser } from "@/lib/server/portfolio-personal-rules";
import { loadPortfolioProfileForUser } from "@/lib/server/portfolio-profile";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { listUserOpeningRecheckScans } from "@/lib/server/user-opening-recheck-board";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { listRecommendations } from "@/lib/services/recommendations-service";

export const dynamic = "force-dynamic";

export default async function PortfolioPage({
  searchParams
}: {
  searchParams?: Promise<{ "asset-settings"?: string | string[] }>;
}) {
  const params = (await searchParams) ?? {};
  const assetSettingsParam = Array.isArray(params["asset-settings"])
    ? params["asset-settings"][0]
    : params["asset-settings"];
  const initialSettingsOpen = assetSettingsParam === "1";
  const session = await getCurrentUserSession();

  if (!session) {
    redirect("/?auth=login&next=%2Fportfolio");
  }

  const [profile, journal, response, openingCheckScans, closeReviews, personalRules] = await Promise.all([
    loadPortfolioProfileForUser(session.user.id),
    loadPortfolioJournalForUser(session.user.id),
    listRecommendations({ sort: "score_desc" }, { userId: session.user.id }),
    listUserOpeningRecheckScans(session.user.id),
    loadPortfolioCloseReviewsForUser(session.user.id),
    loadPortfolioPersonalRulesForUser(session.user.id)
  ]);
  const statusSummary = buildPublicDataStatusSummary("recommendations", response.generatedAt);
  const mergedProfile = mergePortfolioProfileWithJournal(profile, journal);

  return (
    <main className="space-y-5">
      <PageHeader eyebrow="Portfolio" title="내 자산과 보유" />
      <PublicDataStatusBar summary={statusSummary} />
      <PortfolioWorkspace
        initialProfile={{
          ...mergedProfile,
          name:
            mergedProfile.positions.length > 0 ||
            mergedProfile.totalCapital > 0 ||
            mergedProfile.availableCash > 0
              ? mergedProfile.name
              : `${session.user.displayName} 포트폴리오`
        }}
        initialJournal={journal}
        openingCheckScans={openingCheckScans}
        closeReviews={closeReviews}
        personalRules={personalRules}
        holdingActionBoard={response.holdingActionBoard}
        todayActionBoard={response.todayActionBoard}
        openingCheckRiskPatterns={response.openingCheckRiskPatterns}
        initialSettingsOpen={initialSettingsOpen}
      />
    </main>
  );
}
