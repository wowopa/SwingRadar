import { notFound, redirect } from "next/navigation";

import { AnalysisDecisionPanel } from "@/components/analysis/analysis-decision-panel";
import { AnalysisNavigation } from "@/components/analysis/analysis-navigation";
import { AnalysisSummaryBoard } from "@/components/analysis/analysis-summary-board";
import { DataQualityPanel } from "@/components/analysis/data-quality-panel";
import { EventCoveragePanel } from "@/components/analysis/event-coverage-panel";
import { NewsImpactList } from "@/components/analysis/news-impact-list";
import { RiskChecklist } from "@/components/analysis/risk-checklist";
import { ScenarioPanel } from "@/components/analysis/scenario-panel";
import { ScoreBreakdown } from "@/components/analysis/score-breakdown";
import { TechnicalIndicatorsPanel } from "@/components/analysis/technical-indicators-panel";
import { TradingViewChartCard } from "@/components/analysis/tradingview-chart-card";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalysisByTicker } from "@/lib/repositories/analysis";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { buildTradingViewSymbol, getAdjacentReadySymbols, getSymbolByTicker, resolveTicker } from "@/lib/symbols/master";
import { formatScore } from "@/lib/utils";

const EMPTY_TECHNICAL_INDICATORS = {
  sma20: null,
  sma60: null,
  ema20: null,
  rsi14: null,
  macd: null,
  macdSignal: null,
  macdHistogram: null,
  bollingerUpper: null,
  bollingerMiddle: null,
  bollingerLower: null,
  volumeRatio20: null
} as const;

const EMPTY_CHART_SERIES = [] as const;

export default async function AnalysisPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const resolvedTicker = resolveTicker(ticker);

  if (resolvedTicker !== ticker) {
    redirect(`/analysis/${resolvedTicker}`);
  }

  const analysisPayload = await getAnalysisByTicker(resolvedTicker);

  if (!analysisPayload) {
    notFound();
  }

  const analysis = analysisPayload.item;
  const statusSummary = buildPublicDataStatusSummary("analysis", analysisPayload.generatedAt);
  const { previous, next, readyItems } = getAdjacentReadySymbols(resolvedTicker);
  const symbol = getSymbolByTicker(resolvedTicker);
  const tradingViewSymbol = symbol ? buildTradingViewSymbol(symbol.ticker, symbol.market) : null;

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Analysis"
        title={`${analysis.company} ${analysis.ticker} 심화 분석`}
        description="핵심 판단, 차트, 가격 기준, 신뢰도와 이벤트를 넓은 흐름으로 읽을 수 있게 다시 정리한 분석 화면입니다."
      />
      <PublicDataStatusBar summary={statusSummary} />
      <AnalysisNavigation
        currentTicker={analysis.ticker}
        previous={previous}
        next={next}
        readyItems={readyItems.map((item) => ({
          ticker: item.ticker,
          company: item.company,
          sector: item.sector
        }))}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader className="gap-4 pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">현재 신호</p>
                <CardTitle className="mt-2 text-3xl text-foreground sm:text-[2.2rem]">{formatScore(analysis.score)}</CardTitle>
              </div>
              <SignalToneBadge tone={analysis.signalTone} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="max-w-3xl text-base leading-8 text-foreground/82">{analysis.headline}</p>
            <div className="rounded-[28px] border border-caution/20 bg-caution/8 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-caution">기준 이탈</p>
              <p className="mt-3 text-sm leading-7 text-foreground/78">{analysis.invalidation}</p>
            </div>
          </CardContent>
        </Card>
        <RiskChecklist items={analysis.riskChecklist} />
      </section>

      <AnalysisSummaryBoard items={analysis.analysisSummary} />

      <TradingViewChartCard company={analysis.company} symbol={tradingViewSymbol} points={analysis.chartSeries ?? EMPTY_CHART_SERIES} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <AnalysisDecisionPanel levels={analysis.keyLevels} notes={analysis.decisionNotes} />
        <ScenarioPanel scenarios={analysis.scenarios} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ScoreBreakdown items={analysis.scoreBreakdown} />
        <TechnicalIndicatorsPanel indicators={analysis.technicalIndicators ?? EMPTY_TECHNICAL_INDICATORS} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <EventCoveragePanel items={analysis.newsImpact} />
        <DataQualityPanel items={analysis.dataQuality} />
      </section>

      <NewsImpactList items={analysis.newsImpact} />
    </main>
  );
}
