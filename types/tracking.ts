import type { SignalTone } from "@/types/recommendation";

export interface SignalHistoryEntry {
  id: string;
  ticker: string;
  company: string;
  signalDate: string;
  signalTone: SignalTone;
  entryScore: number;
  result: "\uC9C4\uD589\uC911" | "\uC131\uACF5" | "\uC2E4\uD328" | "\uBB34\uD6A8\uD654";
  mfe: number;
  mae: number;
  holdingDays: number;
}

export interface HistoricalSnapshotPoint {
  label: string;
  price: number;
}

export interface TrackingNewsCard {
  id: string;
  date: string;
  headline: string;
  impact: SignalTone;
  note: string;
  source: string;
  url: string;
  eventType: string;
}

export interface ScoreLogEntry {
  timestamp: string;
  factor: string;
  delta: number;
  reason: string;
}

export interface TrackingMetric {
  label: string;
  value: string;
  note: string;
}

export interface TrackingDetail {
  historyId: string;
  summary: string;
  invalidationReview: string;
  afterActionReview: string;
  reviewChecklist: string[];
  metrics: TrackingMetric[];
  chartSnapshot: HistoricalSnapshotPoint[];
  historicalNews: TrackingNewsCard[];
  scoreLog: ScoreLogEntry[];
}

export interface TrackingDetailSource {
  getHistory(): SignalHistoryEntry[];
  getDetail(historyId: string): TrackingDetail | undefined;
}
