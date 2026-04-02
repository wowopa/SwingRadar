import { notFound, redirect } from "next/navigation";

import { AnalysisDecisionPanel } from "@/components/analysis/analysis-decision-panel";
import { AnalysisNavigation } from "@/components/analysis/analysis-navigation";
import { AnalysisSummaryBoard } from "@/components/analysis/analysis-summary-board";
import { AnalysisTradePlanPanel } from "@/components/analysis/analysis-trade-plan-panel";
import { DataQualityPanel } from "@/components/analysis/data-quality-panel";
import { HistoricalValidationPanel } from "@/components/analysis/historical-validation-panel";
import { RiskChecklist } from "@/components/analysis/risk-checklist";
import { ScenarioPanel } from "@/components/analysis/scenario-panel";
import { ScoreBreakdown } from "@/components/analysis/score-breakdown";
import { TrackingDiagnosticPanel } from "@/components/analysis/tracking-diagnostic-panel";
import { TradingViewChartCard } from "@/components/analysis/tradingview-chart-card";
import { GoogleNewsSearchCard } from "@/components/shared/google-news-search-card";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFeaturedRankLabel } from "@/lib/copy/action-language";
import type { DataQualityItem } from "@/types/analysis";
import { getAnalysisByTicker } from "@/lib/repositories/analysis";
import { getDailyCandidates } from "@/lib/repositories/daily-candidates";
import { getTrackingPayload } from "@/lib/repositories/tracking";
import { getCompanyOverviewLines } from "@/lib/server/company-overview";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { getCurrentUserSession } from "@/lib/server/user-auth";
import { listRecommendations } from "@/lib/services/recommendations-service";
import {
  buildTradingViewSymbol,
  getReadySymbols,
  getSymbolByTicker,
  resolveTicker
} from "@/lib/server/runtime-symbol-master";

export const dynamic = "force-dynamic";

const EMPTY_TECHNICAL_INDICATORS = {
  sma20: null,
  sma60: null,
  ema20: null,
  macd: null,
  macdSignal: null,
  macdHistogram: null,
  rsi14: null,
  bollingerUpper: null,
  bollingerMiddle: null,
  bollingerLower: null,
  volumeRatio20: null,
  atr14: null,
  natr14: null,
  adx14: null,
  plusDi14: null,
  minusDi14: null,
  stochasticK: null,
  stochasticD: null,
  mfi14: null,
  roc20: null,
  cci20: null,
  cmf20: null,
  marketRelativeStrength20: null,
  marketRelativeSpread20: null
} as const;

const EMPTY_CHART_SERIES = [] as const;

function getHistoricalRead(dataQuality: DataQualityItem[]) {
  return (
    dataQuality.find((item) => item.label === "검증" || item.label.includes("검증"))?.note ??
    "아직 충분한 과거 검증 메모가 없으므로, 현재는 가격 구조와 손절 기준을 먼저 보는 보수적 해석이 적절합니다."
  );
}

function getMethodRead() {
  return "이 분석은 뉴스보다 가격 구조, 거래 흐름, 과거 검증, 리스크 체크리스트를 함께 보며 판단합니다. 먼저 액션 플랜에서 매수 구간, 손절 기준, 목표 구간을 확인한 뒤 세부 근거를 읽는 순서를 권장합니다.";
}

function buildFallbackOverview({
  company,
  ticker,
  market,
  region,
  status
}: {
  company: string;
  ticker: string;
  market: string;
  region: string;
  status: "ready" | "pending";
}) {
  const regionLabel = region === "KR" ? "국내" : "해외";
  const statusLabel =
    status === "ready"
      ? "현재 SwingRadar 분석 데이터를 바로 확인할 수 있습니다."
      : "아직 분석 데이터가 준비 중인 종목입니다.";

  return [
    `${company} (${ticker})는 ${market}에 상장된 ${regionLabel} 기업입니다.`,
    `현재 프로젝트에서 확인되는 분석 상태는 다음과 같습니다. ${statusLabel}`
  ];
}

export default async function AnalysisPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const resolvedTicker = resolveTicker(ticker);

  if (resolvedTicker !== ticker) {
    redirect(`/analysis/${resolvedTicker}`);
  }

  const session = await getCurrentUserSession();
  const analysisPayload = await getAnalysisByTicker(resolvedTicker);
  const [dailyCandidates, trackingPayload, recommendationsResponse] = await Promise.all([
    getDailyCandidates().catch(() => null),
    getTrackingPayload().catch(() => null),
    listRecommendations({ sort: "score_desc" }, { userId: session?.user.id })
  ]);

  if (!analysisPayload) {
    notFound();
  }

  const analysis = analysisPayload.item;
  const statusSummary = buildPublicDataStatusSummary("analysis", analysisPayload.generatedAt);
  const readyItems = getReadySymbols();
  const symbol = getSymbolByTicker(resolvedTicker);
  const tradingViewSymbol = symbol ? buildTradingViewSymbol(symbol.ticker, symbol.market) : null;
  const visibleRiskChecklist = analysis.riskChecklist.filter((item) => item.label !== "이벤트 리스크");
  const historicalRead = getHistoricalRead(analysis.dataQuality);
  const methodRead = getMethodRead();
  const featuredRank = dailyCandidates?.topCandidates.findIndex((item) => item.ticker === resolvedTicker) ?? -1;
  const featuredCandidate = featuredRank >= 0 ? dailyCandidates?.topCandidates[featuredRank] : undefined;
  const historicalItems =
    trackingPayload?.history
      .filter((item) => resolveTicker(item.ticker) === resolvedTicker)
      .sort((left, right) => right.signalDate.localeCompare(left.signalDate)) ?? [];
  const historicalDetails = Object.fromEntries(
    historicalItems
      .map((item) => [item.id, trackingPayload?.details[item.id]])
      .filter(
        (entry): entry is [string, NonNullable<typeof trackingPayload>["details"][string]] => Boolean(entry[1])
      )
  );
  const headerTitle =
    featuredRank >= 0
      ? `${analysis.company} (${analysis.ticker}) - ${getFeaturedRankLabel(featuredRank + 1)}`
      : `${analysis.company} (${analysis.ticker})`;
  const fetchedOverviewLines = (await getCompanyOverviewLines(analysis.ticker)).slice(0, 3);
  const overview = {
    company: analysis.company,
    ticker: analysis.ticker,
    market: symbol?.market ?? "KRX",
    region: symbol?.region ?? "KR",
    status: symbol?.status ?? "ready",
    summaryLines: fetchedOverviewLines.length
      ? fetchedOverviewLines
      : buildFallbackOverview({
          company: analysis.company,
          ticker: analysis.ticker,
          market: symbol?.market ?? "KRX",
          region: symbol?.region ?? "KR",
          status: symbol?.status ?? "ready"
        })
  };

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Analysis"
        title={headerTitle}
        description="이 종목을 지금 사도 되는지, 무엇을 기다려야 하는지, 어디서 끊을지까지 한 번에 판단하는 상세 화면입니다."
      />
      <PublicDataStatusBar summary={statusSummary} />
      <AnalysisNavigation
        currentTicker={analysis.ticker}
        readyItems={readyItems.map((item) => ({
          ticker: item.ticker,
          company: item.company,
          sector: item.sector
        }))}
        overview={overview}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <AnalysisTradePlanPanel
          analysis={analysis}
          featuredCandidate={featuredCandidate}
          featuredRank={featuredRank >= 0 ? featuredRank + 1 : undefined}
          openingCheckRiskPatterns={recommendationsResponse.openingCheckRiskPatterns}
          openingCheckPositivePattern={recommendationsResponse.openingCheckPositivePattern}
        />

        <div className="space-y-6">
          <RiskChecklist items={visibleRiskChecklist} />
          <TrackingDiagnosticPanel diagnostic={analysis.trackingDiagnostic} />
          <Card>
            <CardHeader>
              <CardTitle>과거 검증 읽는 법</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-foreground/80">{historicalRead}</p>
              <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4 text-sm leading-7 text-muted-foreground">
                {methodRead}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <AnalysisSummaryBoard items={analysis.analysisSummary} />
      </section>

      <section>
        <ScoreBreakdown items={analysis.scoreBreakdown} />
      </section>

      <HistoricalValidationPanel
        history={historicalItems}
        details={historicalDetails}
        validation={analysis.validation}
        validationBasis={analysis.validationBasis}
        insight={analysis.validationInsight}
      />

      <TradingViewChartCard
        company={analysis.company}
        symbol={tradingViewSymbol}
        points={analysis.chartSeries ?? EMPTY_CHART_SERIES}
        indicators={analysis.technicalIndicators ?? EMPTY_TECHNICAL_INDICATORS}
        levels={analysis.keyLevels}
        snapshotGeneratedAt={analysisPayload.generatedAt}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <AnalysisDecisionPanel notes={analysis.decisionNotes} />
        <ScenarioPanel scenarios={analysis.scenarios} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-start">
        <DataQualityPanel items={analysis.dataQuality} />
        <GoogleNewsSearchCard
          company={analysis.company}
          ticker={analysis.ticker}
          description="서비스 안에서 뉴스를 모두 모아 보여주기보다, 필요할 때 바로 관련 기사 흐름을 확인할 수 있도록 빠른 뉴스 검색으로 연결합니다."
        />
      </section>
    </main>
  );
}
