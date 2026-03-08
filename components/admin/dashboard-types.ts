"use client";

export type HealthPayload = {
  status: "ok" | "warning";
  service: string;
  recentAuditCount: number;
  dataProvider: {
    configured: { provider: string; mode: string };
    lastUsed?: { provider: string; mode: string };
    fallbackTriggered: boolean;
  };
  warnings: string[];
};

export type AuditItem = {
  id: number;
  eventType: string;
  actor: string;
  status: "success" | "failure" | "warning";
  requestId: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type EditorialDraftItem = {
  ticker: string;
  recommendation: {
    signalLabel: string;
    rationale: string;
    invalidation: string;
    checkpoints: string[];
  };
  analysis: {
    headline: string;
    invalidation: string;
    decisionNotes: string[];
  };
  operatorNote: string;
};

export type EditorialDraftDocument = {
  updatedAt: string;
  updatedBy: string;
  items: EditorialDraftItem[];
};

export type EditorialCatalogItem = {
  ticker: string;
  company: string;
  signalTone: string;
  score: number;
};

export type EditorialDiffField = {
  field: string;
  label: string;
  before: string;
  after: string;
};

export type EditorialDiffItem = {
  ticker: string;
  company: string;
  score: number;
  changes: string[];
  details: EditorialDiffField[];
};

export type PublishHistoryItem = {
  id: string;
  publishedAt: string;
  publishedBy: string;
  requestId: string;
  approvalStage: string;
  rollbackReason?: string;
  tickers: number;
  diffCount: number;
  notes: string[];
  changes: EditorialDiffItem[];
};

export type CuratedNewsImpact = "긍정" | "중립" | "주의";

export type CuratedNewsItem = {
  id: string;
  ticker: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  date: string;
  impact: CuratedNewsImpact;
  pinned: boolean;
  operatorNote: string;
};

export type NewsCurationDocument = {
  updatedAt: string;
  updatedBy: string;
  items: CuratedNewsItem[];
};

export type SymbolSearchItem = {
  ticker: string;
  company: string;
  sector: string;
  market: "KOSPI" | "KOSDAQ";
  status: "ready" | "pending";
};

export type WatchlistEntry = {
  ticker: string;
  company: string;
  sector: string;
  newsQuery: string;
  requiredKeywords: string[];
  contextKeywords: string[];
  blockedKeywords: string[];
  blockedDomains: string[];
  preferredDomains: string[];
  minArticleScore: number;
  dartCorpCode?: string;
};

export type WatchlistChange = {
  field: string;
  before: string;
  after: string;
};