import { notFound } from "next/navigation";

import { AnalysisDecisionPanel } from "@/components/analysis/analysis-decision-panel";
import { AnalysisNavigation } from "@/components/analysis/analysis-navigation";
import { AnalysisSummaryBoard } from "@/components/analysis/analysis-summary-board";
import { DataQualityPanel } from "@/components/analysis/data-quality-panel";
import { EventCoveragePanel } from "@/components/analysis/event-coverage-panel";
import { NewsImpactList } from "@/components/analysis/news-impact-list";
import { RiskChecklist } from "@/components/analysis/risk-checklist";
import { ScenarioPanel } from "@/components/analysis/scenario-panel";
import { ScoreBreakdown } from "@/components/analysis/score-breakdown";
import { PageHeader } from "@/components/shared/page-header";
import { PublicDataStatusBar } from "@/components/shared/public-data-status-bar";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalysisByTicker } from "@/lib/repositories/analysis";
import { buildPublicDataStatusSummary } from "@/lib/server/public-data-status";
import { getAdjacentReadySymbols } from "@/lib/symbols/master";
import { formatScore } from "@/lib/utils";

export default async function AnalysisPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const analysisPayload = await getAnalysisByTicker(ticker);

  if (!analysisPayload) {
    notFound();
  }

  const analysis = analysisPayload.item;
  const statusSummary = buildPublicDataStatusSummary("analysis", analysisPayload.generatedAt);
  const { previous, next, readyItems } = getAdjacentReadySymbols(ticker);

  return (
    <main>
      <PageHeader
        eyebrow="Analysis"
        title={`${analysis.company} ${analysis.ticker} 심화 분석`}
        description="관찰 근거, 기준 이탈, 가능한 시나리오를 한 화면에서 점검하는 분석 화면입니다."
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
      <section className="mb-6">
        <AnalysisSummaryBoard items={analysis.analysisSummary} />
      </section>
      <section className="mb-7 grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
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
      <section className="mb-6">
        <AnalysisDecisionPanel levels={analysis.keyLevels} notes={analysis.decisionNotes} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ScoreBreakdown items={analysis.scoreBreakdown} />
        <ScenarioPanel scenarios={analysis.scenarios} />
        <EventCoveragePanel items={analysis.newsImpact} />
        <DataQualityPanel items={analysis.dataQuality} />
        <div className="xl:col-span-2">
          <NewsImpactList items={analysis.newsImpact} />
        </div>
      </section>
    </main>
  );
}
