import type { SignalTone } from "@/types/recommendation";

export interface ScoreBreakdownItem {
  label: string;
  score: number;
  description: string;
}

export interface Scenario {
  label: "\uAE30\uBCF8" | "\uAC15\uC138" | "\uC57D\uC138";
  probability: number;
  expectation: string;
  trigger: string;
}

export interface RiskChecklistItem {
  label: string;
  status: "\uC591\uD638" | "\uD655\uC778 \uD544\uC694" | "\uC8FC\uC758";
  note: string;
}

export interface NewsImpactItem {
  headline: string;
  impact: SignalTone;
  summary: string;
  source: string;
  url: string;
  date: string;
  eventType: string;
}

export interface DataQualityItem {
  label: string;
  value: string;
  note: string;
}

export interface AnalysisSummaryMetric {
  label: string;
  value: string;
  note: string;
}

export interface KeyLevel {
  label: string;
  price: string;
  meaning: string;
}

export interface TickerAnalysis {
  ticker: string;
  company: string;
  signalTone: SignalTone;
  score: number;
  headline: string;
  invalidation: string;
  analysisSummary: AnalysisSummaryMetric[];
  keyLevels: KeyLevel[];
  decisionNotes: string[];
  scoreBreakdown: ScoreBreakdownItem[];
  scenarios: Scenario[];
  riskChecklist: RiskChecklistItem[];
  newsImpact: NewsImpactItem[];
  dataQuality: DataQualityItem[];
}
