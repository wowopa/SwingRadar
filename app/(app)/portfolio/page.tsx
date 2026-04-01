import { redirect } from "next/navigation";

import { PortfolioWorkspace } from "@/components/portfolio/portfolio-workspace";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { loadPortfolioJournalForUser } from "@/lib/server/portfolio-journal";
import { loadPortfolioProfileForUser } from "@/lib/server/portfolio-profile";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
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

  const [profile, journal, response] = await Promise.all([
    loadPortfolioProfileForUser(session.user.id),
    loadPortfolioJournalForUser(session.user.id),
    listRecommendations({ sort: "score_desc" }, { userId: session.user.id })
  ]);
  const statusSummary = buildPublicDataStatusSummary("recommendations", response.generatedAt);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Portfolio"
        title="내 포트폴리오"
        description="보유 중인 종목과 자산 현황, 실제 체결 기록까지 이 화면에서 관리합니다."
      />
      <PublicDataStatusBar summary={statusSummary} />
      <PortfolioWorkspace
        initialProfile={{
          ...profile,
          name:
            profile.positions.length > 0 || profile.totalCapital > 0 || profile.availableCash > 0
              ? profile.name
              : `${session.user.displayName} 포트폴리오`
        }}
        initialJournal={journal}
        holdingActionBoard={response.holdingActionBoard}
        initialSettingsOpen={initialSettingsOpen}
      />
    </main>
  );
}
