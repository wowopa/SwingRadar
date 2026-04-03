"use client";

export type HealthPayload = {
  status: "ok" | "warning" | "critical";
  service: string;
  recentAuditCount: number;
  dataProvider: {
    configured: { provider: string; mode: string };
    lastUsed?: { provider: string; mode: string };
    fallbackTriggered: boolean;
  };
  warnings: string[];
};

export type OperationalIncident = {
  id: string;
  severity: "warning" | "critical";
  source: "health" | "provider" | "daily-cycle" | "ops-recovery";
  summary: string;
  detail: string;
  detectedAt: string;
};

export type OpsHealthReportPayload = {
  checkedAt: string;
  mode: "check-only" | "auto-recover";
  initialHealth: {
    status: "ok" | "warning";
    warnings: string[];
  };
  recovery: {
    attempted: boolean;
    timings: {
      refreshExternalMs: number;
      ingestPostgresMs: number | null;
    };
  } | null;
  finalHealth: {
    status: "ok" | "warning";
    warnings: string[];
  };
};

export type DailyCycleReportPayload = {
  startedAt: string;
  completedAt: string | null;
  status: "ok" | "warning" | "failed" | "running";
  steps: Array<{
    name: string;
    status: "running" | "completed" | "failed";
    startedAt: string;
    completedAt?: string;
    durationMs: number | null;
    error: string | null;
  }>;
  summary: {
    generatedAt: string | null;
    topCandidateCount: number;
    totalBatches: number;
    succeededBatches: number;
    failedBatchCount: number;
    batchSize: number | null;
  } | null;
  error: string | null;
};

export type AutoHealReportPayload = {
  startedAt: string;
  completedAt: string | null;
  status: "ok" | "warning" | "failed" | "running";
  triggers: string[];
  actions: Array<{
    name: string;
    status: "skipped" | "completed" | "failed";
    startedAt: string;
    completedAt?: string;
    durationMs: number | null;
    detail: string;
    error: string | null;
  }>;
  error: string | null;
};

export type NewsFetchReportPayload = {
  startedAt: string;
  completedAt: string | null;
  providerOrder: string[];
  requestedProvider: string;
  totalTickers: number;
  liveFetchTickers: number;
  cacheFallbackTickers: number;
  fileFallbackTickers: number;
  retryCount: number;
  providerFailures: Array<{
    ticker: string;
    provider: string;
    status: number | null;
    attempt: number | null;
    delayMs: number | null;
    url: string | null;
    phase: string;
    message?: string;
  }>;
  totalItems: number;
};

export type SnapshotGenerationReportPayload = {
  startedAt: string;
  completedAt: string;
  generatedAt: string;
  totalTickers: number;
  recommendationCount: number;
  analysisCount: number;
  trackingHistoryCount: number;
  validationFallbackCount: number;
  validationFallbackTickers: string[];
  validationBasisCounts?: {
    measured: number;
    sector: number;
    pattern: number;
    heuristic: number;
  };
};

export type PostLaunchHistoryEntryPayload = {
  checkedAt: string;
  healthStatus: string;
  overallStatus: string;
  dailyTaskRegistered: boolean;
  autoHealTaskRegistered: boolean;
  incidents: {
    criticalCount: number;
    warningCount: number;
  };
  audits: {
    total: number;
    failureCount: number;
    warningCount: number;
  };
};

export type ThresholdAdviceReportPayload = {
  generatedAt: string;
  sampleSize: number;
  currentPolicy: {
    newsLiveFetchWarningPercent: number;
    newsLiveFetchCriticalPercent: number;
    validationFallbackWarningPercent: number;
    validationFallbackCriticalPercent: number;
  };
  observations: {
    averageWarningIncidents: number;
    averageCriticalIncidents: number;
    averageAuditFailures: number;
    latestLiveFetchPercent: number | null;
    latestValidationFallbackCount: number | null;
    latestValidationFallbackPercent: number | null;
  };
  recommendations: Array<{
    key: string;
    currentValue: number;
    suggestedValue: number;
    reason: string;
  }>;
};

export type RuntimeStorageReportPayload = {
  generatedAt: string;
  runtimeRoot: string;
  totalSizeBytes: number;
  totalSizeLabel: string;
  totalFiles: number;
  sections: Record<
    string,
    {
      sizeBytes: number;
      sizeLabel: string;
      fileCount: number;
    }
  >;
  metadata?: Record<string, unknown>;
};

export type AccessStatsReportPayload = {
  generatedAt: string;
  totalUniqueVisitors: number;
  today: {
    date: string;
    uniqueVisitors: number;
  };
  last7Days: {
    startDate: string;
    endDate: string;
    uniqueVisitors: number;
  };
  last30Days: {
    startDate: string;
    endDate: string;
    uniqueVisitors: number;
  };
  trackedDays: number;
  recentDaily: Array<{
    date: string;
    uniqueVisitors: number;
  }>;
};

export type AccessStatsLookupPayload = {
  requestedDate: string;
  uniqueVisitors: number;
  tracked: boolean;
};

export type DatabaseStorageReportPayload = {
  checkedAt: string;
  databaseSizeBytes: number;
  databaseSizeLabel: string;
  tables: Array<{
    tableName: string;
    totalBytes: number;
    totalSizeLabel: string;
    liveRows: number;
    deadRows: number;
    lastVacuum: string | null;
    lastAutovacuum: string | null;
  }>;
  runtimeDocuments: {
    documentCount: number;
    totalPayloadBytes: number;
    totalPayloadLabel: string;
    largestDocuments: Array<{
      name: string;
      payloadBytes: number;
      payloadLabel: string;
    }>;
  };
};

export type PopupNoticeDocument = {
  enabled: boolean;
  title: string;
  body: string;
  imageUrl: string | null;
  imageAlt: string | null;
  startAt: string | null;
  endAt: string | null;
  updatedAt: string;
  updatedBy: string;
};

export type AdminDataQualitySummaryPayload = {
  validationFallbackCount: number | null;
  validationFallbackPercent: number | null;
  measuredValidationPercent: number | null;
  newsLiveFetchPercent: number | null;
  newsCacheFallbackPercent: number | null;
  newsFileFallbackPercent: number | null;
};

export type AdminStatusPayload = {
  ok: boolean;
  requestId: string;
  operationalMode: string;
  overallStatus: "ok" | "warning" | "critical";
  statusWarnings?: string[];
  health: HealthPayload;
  opsHealthReport: OpsHealthReportPayload | null;
  dailyCycleReport: DailyCycleReportPayload | null;
  autoHealReport: AutoHealReportPayload | null;
  newsFetchReport: NewsFetchReportPayload | null;
  snapshotGenerationReport: SnapshotGenerationReportPayload | null;
  postLaunchHistory: PostLaunchHistoryEntryPayload[];
  thresholdAdviceReport: ThresholdAdviceReportPayload | null;
  dataQualitySummary: AdminDataQualitySummaryPayload | null;
  accessStatsReport: AccessStatsReportPayload | null;
  runtimeStorageReport: RuntimeStorageReportPayload | null;
  databaseStorageReport: DatabaseStorageReportPayload | null;
  incidents: OperationalIncident[];
};

export type UniverseReviewStatus = "new" | "reviewing" | "hold" | "promoted" | "rejected";

export type UniverseCandidateReview = {
  ticker: string;
  status: UniverseReviewStatus;
  note: string;
  updatedAt: string;
  updatedBy: string;
};

export type UniverseCandidateItem = {
  batch: number;
  ticker: string;
  company: string;
  sector: string;
  signalTone: "긍정" | "중립" | "주의";
  score: number;
  candidateScore: number;
  invalidation: string;
  validationSummary: string;
  observationWindow: string;
  rationale: string;
  eventCoverage: string;
  review?: UniverseCandidateReview;
};

export type UniverseFailedBatch = {
  ok: false;
  batch: number;
  count: number;
  errors: string[];
};

export type UniverseDailyCandidates = {
  generatedAt: string;
  batchSize: number;
  totalTickers: number;
  totalBatches: number;
  succeededBatches: number;
  failedBatches: UniverseFailedBatch[];
  topCandidates: UniverseCandidateItem[];
  batchSummaries: Array<{
    batch: number;
    count: number;
    generatedAt: string;
    topTicker: string | null;
    trackingRows: number;
    warnings?: string[];
  }>;
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
  market: "KOSPI" | "KOSDAQ" | "NYSE" | "NASDAQ" | "AMEX";
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

export type WatchlistSyncStatus = {
  ticker: string;
  state: "idle" | "syncing" | "ready" | "failed";
  message: string;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastDurationMs: number | null;
};

export type PortfolioProfilePositionPayload = {
  ticker: string;
  company: string;
  sector: string;
  quantity: number;
  averagePrice: number;
  enteredAt?: string;
  note?: string;
};

export type PortfolioProfilePayload = {
  name: string;
  totalCapital: number;
  availableCash: number;
  maxRiskPerTradePercent: number;
  maxConcurrentPositions: number;
  sectorLimit: number;
  positions: PortfolioProfilePositionPayload[];
  updatedAt: string;
  updatedBy: string;
};
