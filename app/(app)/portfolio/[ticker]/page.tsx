import { notFound, redirect } from "next/navigation";

import { PositionDetailView } from "@/components/portfolio/position-detail-view";
import { PageHeader } from "@/components/shared/page-header";
import { buildOpeningRecheckTickerInsight } from "@/lib/recommendations/opening-recheck-insight";
import { listOpeningRecheckScans } from "@/lib/server/opening-recheck-board";
import { loadPortfolioJournalForUser } from "@/lib/server/portfolio-journal";
import { loadPortfolioProfileForUser } from "@/lib/server/portfolio-profile";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { findPortfolioJournalGroup } from "@/lib/portfolio/journal-insights";
import { listRecommendations } from "@/lib/services/recommendations-service";
import { getTrackingSnapshot } from "@/lib/services/tracking-service";
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

  const [profile, journal, response, tracking, openingRecheckScans] = await Promise.all([
    loadPortfolioProfileForUser(session.user.id),
    loadPortfolioJournalForUser(session.user.id),
    listRecommendations({ sort: "score_desc" }, { userId: session.user.id }),
    getTrackingSnapshot({ ticker, limit: 10 }),
    listOpeningRecheckScans()
  ]);

  const journalGroup = findPortfolioJournalGroup(journal.events, ticker);
  const position = profile.positions.find((item) => item.ticker === ticker) ?? null;
  const actionItem = response.holdingActionBoard?.items.find((item) => item.ticker === ticker) ?? null;

  if (!journalGroup && !position && !actionItem) {
    notFound();
  }

  const trackingEntry = tracking.history.find((item) => item.ticker === ticker) ?? null;
  const openingCheckInsight =
    (trackingEntry ? tracking.details[trackingEntry.id]?.openingCheckInsight : undefined) ??
    buildOpeningRecheckTickerInsight(openingRecheckScans, {
      ticker,
      signalDate: trackingEntry?.signalDate ?? null,
      trackingResult: trackingEntry?.result
    });

  const company = position?.company ?? journalGroup?.company ?? actionItem?.company ?? ticker;
  const sector = position?.sector ?? journalGroup?.sector ?? actionItem?.sector ?? "미분류";
  const statusSummary = buildPublicDataStatusSummary("recommendations", response.generatedAt);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Portfolio Detail"
        title={`${company} 포지션`}
        description="실제 체결 타임라인과 현재 운용 계획, 종료 회고, 장초 체크 기록까지 함께 보며 이 종목의 생애주기를 확인합니다."
      />
      <PublicDataStatusBar summary={statusSummary} />
      <PositionDetailView
        ticker={ticker}
        company={company}
        sector={sector}
        position={position}
        journalGroup={journalGroup}
        actionItem={actionItem}
        openingCheckInsight={openingCheckInsight}
      />
    </main>
  );
}
