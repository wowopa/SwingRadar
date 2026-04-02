import { notFound, redirect } from "next/navigation";

import { PositionDetailView } from "@/components/portfolio/position-detail-view";
import { getPortfolioCloseReviewKeyForGroup } from "@/lib/portfolio/review-keys";
import { PageHeader } from "@/components/shared/page-header";
import { buildOpeningRecheckTickerInsight } from "@/lib/recommendations/opening-recheck-insight";
import { listOpeningRecheckScans } from "@/lib/server/opening-recheck-board";
import { loadPortfolioCloseReviewsForUser } from "@/lib/server/portfolio-close-reviews";
import { loadPortfolioJournalForUser } from "@/lib/server/portfolio-journal";
import { loadPortfolioProfileForUser } from "@/lib/server/portfolio-profile";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { findPortfolioJournalGroup } from "@/lib/portfolio/journal-insights";
import { resolveTickerAnalysisForQuery } from "@/lib/services/analysis-resolver";
import { listRecommendations } from "@/lib/services/recommendations-service";
import { getTrackingSnapshot } from "@/lib/services/tracking-service";
import { resolveTicker } from "@/lib/server/runtime-symbol-master";

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

  const [profile, journal, response, tracking, openingRecheckScans, analysis, closeReviews] = await Promise.all([
    loadPortfolioProfileForUser(session.user.id),
    loadPortfolioJournalForUser(session.user.id),
    listRecommendations({ sort: "score_desc" }, { userId: session.user.id }),
    getTrackingSnapshot({ ticker, limit: 10 }),
    listOpeningRecheckScans(),
    resolveTickerAnalysisForQuery(ticker, { includeNews: "false", includeQuality: "false" }).catch(() => null),
    loadPortfolioCloseReviewsForUser(session.user.id)
  ]);

  const journalGroup = findPortfolioJournalGroup(journal.events, ticker);
  const position = profile.positions.find((item) => item.ticker === ticker) ?? null;
  const actionItem = response.holdingActionBoard?.items.find((item) => item.ticker === ticker) ?? null;
  const closeReviewEntry = journalGroup ? closeReviews[getPortfolioCloseReviewKeyForGroup(journalGroup)] ?? null : null;

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
        analysis={analysis?.item ?? null}
        closeReviewEntry={closeReviewEntry}
      />
    </main>
  );
}
