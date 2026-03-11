import { notFound, redirect } from "next/navigation";

import { AnalysisDecisionPanel } from "@/components/analysis/analysis-decision-panel";
import { AnalysisNavigation } from "@/components/analysis/analysis-navigation";
import { AnalysisSummaryBoard } from "@/components/analysis/analysis-summary-board";
import { DataQualityPanel } from "@/components/analysis/data-quality-panel";
import { EventCoveragePanel } from "@/components/analysis/event-coverage-panel";
import { HistoricalValidationPanel } from "@/components/analysis/historical-validation-panel";
import { NewsImpactList } from "@/components/analysis/news-impact-list";
import { RiskChecklist } from "@/components/analysis/risk-checklist";
import { ScenarioPanel } from "@/components/analysis/scenario-panel";
import { ScoreBreakdown } from "@/components/analysis/score-breakdown";
import { TradingViewChartCard } from "@/components/analysis/tradingview-chart-card";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DataQualityItem, NewsImpactItem, RiskChecklistItem, TickerAnalysis } from "@/types/analysis";
import { getAnalysisByTicker } from "@/lib/repositories/analysis";
import { getTrackingPayload } from "@/lib/repositories/tracking";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { buildTradingViewSymbol, getAdjacentReadySymbols, getSymbolByTicker, resolveTicker } from "@/lib/symbols/master";
import { formatScore } from "@/lib/utils";

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
  volumeRatio20: null
} as const;

const EMPTY_CHART_SERIES = [] as const;

function summarizeCoverage(items: NewsImpactItem[]) {
  const disclosure = items.filter((item) =>
    item.source === "dart" ||
    [
      "earnings",
      "treasury-stock",
      "contract",
      "clinical-approval",
      "capital-raise",
      "risk",
      "inquiry",
      "governance",
      "general-disclosure"
    ].includes(item.eventType)
  ).length;
  const curated = items.filter((item) => item.eventType === "curated-news").length;
  const external = Math.max(items.length - disclosure - curated, 0);

  return {
    total: items.length,
    disclosure,
    curated,
    external
  };
}

function pickActionTitle(signalTone: TickerAnalysis["signalTone"]) {
  if (signalTone === "긍정") {
    return "지금은 우선 관찰하고 눌림 기회를 볼 만한 후보입니다.";
  }
  if (signalTone === "주의") {
    return "좋아 보이는 부분은 있지만 진입 전 확인이 더 필요한 후보입니다.";
  }
  return "바로 추격하기보다 조건을 더 확인하며 지켜볼 후보입니다.";
}

function buildTopReasons(analysis: TickerAnalysis) {
  return analysis.analysisSummary
    .slice(0, 3)
    .map((item) => `${item.label}: ${item.value} (${item.note})`);
}

function buildWatchouts(analysis: TickerAnalysis) {
  const warnings = analysis.riskChecklist.filter((item) => item.status !== "양호");

  if (warnings.length) {
    return warnings.slice(0, 3).map((item) => `${item.label}: ${item.note}`);
  }

  return analysis.decisionNotes.slice(0, 2);
}

function getHistoricalRead(dataQuality: DataQualityItem[]) {
  return dataQuality.find((item) => item.label === "검증")?.note ?? "히스토릭 검증 메모가 아직 충분하지 않습니다.";
}

function getCoverageRead(newsImpact: NewsImpactItem[], riskChecklist: RiskChecklistItem[]) {
  const coverageRisk = riskChecklist.find((item) => item.label.includes("커버리지"));
  const coverageSummary = summarizeCoverage(newsImpact);

  if (!coverageSummary.total) {
    return "이벤트 근거가 비어 있어 차트와 무효화 기준을 더 보수적으로 읽어야 합니다.";
  }

  return `${coverageRisk?.note ?? "이벤트 커버리지를 함께 해석합니다."} 현재 공시 ${coverageSummary.disclosure}건, 큐레이션 ${coverageSummary.curated}건, 외부 기사 ${coverageSummary.external}건입니다.`;
}

export default async function AnalysisPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const resolvedTicker = resolveTicker(ticker);

  if (resolvedTicker !== ticker) {
    redirect(`/analysis/${resolvedTicker}`);
  }

  const analysisPayload = await getAnalysisByTicker(resolvedTicker);
  const trackingPayload = await getTrackingPayload().catch(() => null);

  if (!analysisPayload) {
    notFound();
  }

  const analysis = analysisPayload.item;
  const statusSummary = buildPublicDataStatusSummary("analysis", analysisPayload.generatedAt);
  const { previous, next, readyItems } = getAdjacentReadySymbols(resolvedTicker);
  const symbol = getSymbolByTicker(resolvedTicker);
  const tradingViewSymbol = symbol ? buildTradingViewSymbol(symbol.ticker, symbol.market) : null;
  const topReasons = buildTopReasons(analysis);
  const watchouts = buildWatchouts(analysis);
  const historicalRead = getHistoricalRead(analysis.dataQuality);
  const coverageRead = getCoverageRead(analysis.newsImpact, analysis.riskChecklist);
  const historicalItems =
    trackingPayload?.history.filter((item) => resolveTicker(item.ticker) === resolvedTicker).sort((left, right) => right.signalDate.localeCompare(left.signalDate)) ?? [];
  const historicalDetails = Object.fromEntries(
    historicalItems.map((item) => [item.id, trackingPayload?.details[item.id]]).filter((entry): entry is [string, NonNullable<typeof trackingPayload>["details"][string]] => Boolean(entry[1]))
  );

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Analysis"
        title={`${analysis.company} ${analysis.ticker} 스윙 판단 리포트`}
        description="이 종목을 지금 스윙 관점에서 봐야 하는지, 무엇을 조심해야 하는지, 과거엔 어땠는지를 한 흐름으로 읽는 화면입니다."
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card>
          <CardHeader className="gap-5 pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">현재 판단</p>
                <CardTitle className="mt-2 text-3xl text-foreground sm:text-[2.2rem]">{formatScore(analysis.score)}</CardTitle>
              </div>
              <SignalToneBadge tone={analysis.signalTone} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-lg font-semibold text-foreground">{pickActionTitle(analysis.signalTone)}</p>
              <p className="mt-3 max-w-3xl text-base leading-8 text-foreground/82">{analysis.headline}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] border border-border/70 bg-secondary/25 p-5">
                <p className="text-sm font-semibold text-foreground">왜 지금 볼까</p>
                <div className="mt-3 space-y-2">
                  {topReasons.map((reason) => (
                    <p key={reason} className="text-sm leading-7 text-foreground/80">
                      {reason}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-[28px] border border-border/70 bg-secondary/25 p-5">
                <p className="text-sm font-semibold text-foreground">무엇을 먼저 조심할까</p>
                <div className="mt-3 space-y-2">
                  {watchouts.map((item) => (
                    <p key={item} className="text-sm leading-7 text-foreground/78">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-caution/20 bg-caution/8 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-caution">기준 이탈</p>
              <p className="mt-3 text-sm leading-7 text-foreground/78">{analysis.invalidation}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <RiskChecklist items={analysis.riskChecklist} />
          <Card>
            <CardHeader>
              <CardTitle>과거 검증 해석</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-foreground/80">{historicalRead}</p>
              <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4 text-sm leading-7 text-muted-foreground">
                {coverageRead}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <AnalysisSummaryBoard items={analysis.analysisSummary} />

      <HistoricalValidationPanel history={historicalItems} details={historicalDetails} />

      <TradingViewChartCard
        company={analysis.company}
        symbol={tradingViewSymbol}
        points={analysis.chartSeries ?? EMPTY_CHART_SERIES}
        indicators={analysis.technicalIndicators ?? EMPTY_TECHNICAL_INDICATORS}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <AnalysisDecisionPanel levels={analysis.keyLevels} notes={analysis.decisionNotes} />
        <ScenarioPanel scenarios={analysis.scenarios} />
      </section>

      <section>
        <ScoreBreakdown items={analysis.scoreBreakdown} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <EventCoveragePanel items={analysis.newsImpact} />
        <DataQualityPanel items={analysis.dataQuality} />
      </section>

      <NewsImpactList items={analysis.newsImpact} />
    </main>
  );
}
