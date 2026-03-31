import { redirect } from "next/navigation";

import { AccountPortfolioPanel } from "@/components/account/account-portfolio-panel";
import { PortfolioOverviewBoard } from "@/components/portfolio/portfolio-overview-board";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { loadPortfolioProfileForUser } from "@/lib/server/portfolio-profile";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { listRecommendations } from "@/lib/services/recommendations-service";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const session = await getCurrentUserSession();

  if (!session) {
    redirect("/auth?next=%2Fportfolio");
  }

  const [profile, response] = await Promise.all([
    loadPortfolioProfileForUser(session.user.id),
    listRecommendations({ sort: "score_desc" }, { userId: session.user.id })
  ]);
  const statusSummary = buildPublicDataStatusSummary("recommendations", response.generatedAt);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Portfolio"
        title="내 포트폴리오"
        description="내가 실제로 보유 중인 종목과 자산 기준으로 보유 관리와 자산 설정을 함께 다루는 화면입니다."
      />
      <PublicDataStatusBar summary={statusSummary} />
      <PortfolioOverviewBoard profile={profile} holdingActionBoard={response.holdingActionBoard} />
      <AccountPortfolioPanel
        initialProfile={{
          ...profile,
          name:
            profile.positions.length > 0 || profile.totalCapital > 0 || profile.availableCash > 0
              ? profile.name
              : `${session.user.displayName} 포트폴리오`
        }}
      />
    </main>
  );
}
