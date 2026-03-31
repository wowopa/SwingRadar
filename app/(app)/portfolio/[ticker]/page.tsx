import { notFound, redirect } from "next/navigation";

import { PositionDetailView } from "@/components/portfolio/position-detail-view";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { findPortfolioJournalGroup } from "@/lib/portfolio/journal-insights";
import { loadPortfolioJournalForUser } from "@/lib/server/portfolio-journal";
import { loadPortfolioProfileForUser } from "@/lib/server/portfolio-profile";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { listRecommendations } from "@/lib/services/recommendations-service";
import { resolveTicker } from "@/lib/symbols/master";

export const dynamic = "force-dynamic";

export default async function PortfolioPositionPage({
  params
}: {
  params: Promise<{ ticker: string }>;
}) {
  const session = await getCurrentUserSession();

  if (!session) {
    redirect("/?auth=login&next=%2Fportfolio");
  }

  const { ticker: rawTicker } = await params;
  const ticker = resolveTicker(rawTicker);

  const [profile, journal, response] = await Promise.all([
    loadPortfolioProfileForUser(session.user.id),
    loadPortfolioJournalForUser(session.user.id),
    listRecommendations({ sort: "score_desc" }, { userId: session.user.id })
  ]);

  const journalGroup = findPortfolioJournalGroup(journal.events, ticker);
  const position = profile.positions.find((item) => item.ticker === ticker) ?? null;
  const actionItem = response.holdingActionBoard?.items.find((item) => item.ticker === ticker) ?? null;

  if (!journalGroup && !position && !actionItem) {
    notFound();
  }

  const company = position?.company ?? journalGroup?.company ?? actionItem?.company ?? ticker;
  const sector = position?.sector ?? journalGroup?.sector ?? actionItem?.sector ?? "미분류";
  const statusSummary = buildPublicDataStatusSummary("recommendations", response.generatedAt);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Portfolio Detail"
        title={`${company} 포지션`}
        description="실제 체결 타임라인과 현재 운용 계획, 종료 회고를 함께 보며 한 종목의 생애주기를 확인합니다."
      />
      <PublicDataStatusBar summary={statusSummary} />
      <PositionDetailView
        ticker={ticker}
        company={company}
        sector={sector}
        position={position}
        journalGroup={journalGroup}
        actionItem={actionItem}
      />
    </main>
  );
}
