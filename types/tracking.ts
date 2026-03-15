import type { SignalTone } from "@/types/recommendation";

export interface SignalHistoryEntry {
  id: string;
  ticker: string;
  company: string;
  signalDate: string;
  startedAt?: string | null;
  closedAt?: string | null;
  closedReason?: string | null;
  signalTone: SignalTone;
  entryScore: number;
  result: "감시중" | "진행중" | "성공" | "실패" | "무효화";
  mfe: number;
  mae: number;
  currentReturn?: number;
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
