import type {
  AutoHealReport,
  DailyCycleReport,
  NewsFetchReport,
  OpsHealthCheckReport,
  PostLaunchHistoryEntry,
  SnapshotGenerationReport,
  ThresholdAdviceReport
} from "@/lib/server/ops-reports";

export type RuntimeSyncTrustStatus = "healthy" | "watch" | "blocked";

export interface RuntimeSyncTrustCheck {
  key: string;
  label: string;
  status: RuntimeSyncTrustStatus;
  updatedAt: string | null;
  ageMinutes: number | null;
  note: string;
}

export interface RuntimeSyncTrustSummary {
  status: RuntimeSyncTrustStatus;
  label: string;
  summary: string;
  missingCount: number;
  staleCount: number;
  blockingCount: number;
  checks: RuntimeSyncTrustCheck[];
}

interface RuntimeSyncSource {
  key: string;
  label: string;
  updatedAt: string | null;
  warningAfterMinutes: number;
  blockedAfterMinutes: number;
  missingNote: string;
  staleNote: string;
  healthyNote: string;
}

function getAgeMinutes(value: string | null, now: Date) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  return Math.max(0, Math.round((now.getTime() - timestamp.getTime()) / 60000));
}

function buildCheck(source: RuntimeSyncSource, now: Date): RuntimeSyncTrustCheck {
  const ageMinutes = getAgeMinutes(source.updatedAt, now);
  if (!source.updatedAt || ageMinutes === null) {
    return {
      key: source.key,
      label: source.label,
      status: "blocked",
      updatedAt: source.updatedAt,
      ageMinutes,
      note: source.missingNote
    };
  }

  if (ageMinutes >= source.blockedAfterMinutes) {
    return {
      key: source.key,
      label: source.label,
      status: "blocked",
      updatedAt: source.updatedAt,
      ageMinutes,
      note: `${source.staleNote} ${ageMinutes}m ago.`
    };
  }

  if (ageMinutes >= source.warningAfterMinutes) {
    return {
      key: source.key,
      label: source.label,
      status: "watch",
      updatedAt: source.updatedAt,
      ageMinutes,
      note: `${source.staleNote} ${ageMinutes}m ago.`
    };
  }

  return {
    key: source.key,
    label: source.label,
    status: "healthy",
    updatedAt: source.updatedAt,
    ageMinutes,
    note: source.healthyNote
  };
}

function getStatusLabel(status: RuntimeSyncTrustStatus) {
  if (status === "blocked") {
    return "Runtime blocked";
  }

  if (status === "watch") {
    return "Runtime watch";
  }

  return "Runtime healthy";
}

function getLatestHistoryTimestamp(history: PostLaunchHistoryEntry[] | null) {
  if (!history?.length) {
    return null;
  }

  return history
    .map((item) => item.checkedAt)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
}

export function buildRuntimeSyncTrustSummary(args: {
  opsHealthReport: OpsHealthCheckReport | null;
  dailyCycleReport: DailyCycleReport | null;
  autoHealReport: AutoHealReport | null;
  newsFetchReport: NewsFetchReport | null;
  snapshotGenerationReport: SnapshotGenerationReport | null;
  thresholdAdviceReport: ThresholdAdviceReport | null;
  postLaunchHistory: PostLaunchHistoryEntry[] | null;
  now?: Date;
}): RuntimeSyncTrustSummary {
  const now = args.now ?? new Date();
  const checks = [
    buildCheck(
      {
        key: "ops-health-report",
        label: "Ops health",
        updatedAt: args.opsHealthReport?.checkedAt ?? null,
        warningAfterMinutes: 24 * 60,
        blockedAfterMinutes: 72 * 60,
        missingNote: "Ops health report is missing.",
        staleNote: "Ops health report is stale.",
        healthyNote: "Ops health report is recent."
      },
      now
    ),
    buildCheck(
      {
        key: "daily-cycle-report",
        label: "Daily cycle",
        updatedAt: args.dailyCycleReport?.completedAt ?? args.dailyCycleReport?.startedAt ?? null,
        warningAfterMinutes: 24 * 60,
        blockedAfterMinutes: 72 * 60,
        missingNote: "Daily cycle report is missing.",
        staleNote: "Daily cycle report is stale.",
        healthyNote: "Daily cycle report is recent."
      },
      now
    ),
    buildCheck(
      {
        key: "auto-heal-report",
        label: "Auto heal",
        updatedAt: args.autoHealReport?.completedAt ?? args.autoHealReport?.startedAt ?? null,
        warningAfterMinutes: 24 * 60,
        blockedAfterMinutes: 72 * 60,
        missingNote: "Auto-heal report is missing.",
        staleNote: "Auto-heal report is stale.",
        healthyNote: "Auto-heal report is recent."
      },
      now
    ),
    buildCheck(
      {
        key: "news-fetch-report",
        label: "News fetch",
        updatedAt: args.newsFetchReport?.completedAt ?? args.newsFetchReport?.startedAt ?? null,
        warningAfterMinutes: 24 * 60,
        blockedAfterMinutes: 72 * 60,
        missingNote: "News fetch report is missing.",
        staleNote: "News fetch report is stale.",
        healthyNote: "News fetch report is recent."
      },
      now
    ),
    buildCheck(
      {
        key: "snapshot-generation-report",
        label: "Snapshot generation",
        updatedAt: args.snapshotGenerationReport?.completedAt ?? null,
        warningAfterMinutes: 24 * 60,
        blockedAfterMinutes: 72 * 60,
        missingNote: "Snapshot generation report is missing.",
        staleNote: "Snapshot generation report is stale.",
        healthyNote: "Snapshot generation report is recent."
      },
      now
    ),
    buildCheck(
      {
        key: "threshold-advice-report",
        label: "Threshold advice",
        updatedAt: args.thresholdAdviceReport?.generatedAt ?? null,
        warningAfterMinutes: 48 * 60,
        blockedAfterMinutes: 96 * 60,
        missingNote: "Threshold advice report is missing.",
        staleNote: "Threshold advice report is stale.",
        healthyNote: "Threshold advice report is recent."
      },
      now
    ),
    buildCheck(
      {
        key: "post-launch-history",
        label: "Post-launch history",
        updatedAt: getLatestHistoryTimestamp(args.postLaunchHistory),
        warningAfterMinutes: 48 * 60,
        blockedAfterMinutes: 120 * 60,
        missingNote: "Post-launch history is missing.",
        staleNote: "Post-launch history is stale.",
        healthyNote: "Post-launch history is recent."
      },
      now
    )
  ];

  const missingCount = checks.filter((item) => item.updatedAt === null || item.ageMinutes === null).length;
  const blockingCount = checks.filter((item) => item.status === "blocked").length;
  const staleCount = checks.filter((item) => item.status === "watch" || item.status === "blocked").length;
  const status: RuntimeSyncTrustStatus =
    blockingCount > 0 ? "blocked" : staleCount > 0 ? "watch" : "healthy";

  const summary =
    status === "blocked"
      ? `${blockingCount} runtime document(s) are missing or too old.`
      : status === "watch"
        ? `${staleCount} runtime document(s) need a freshness check.`
        : "Runtime documents are refreshing on schedule.";

  return {
    status,
    label: getStatusLabel(status),
    summary,
    missingCount,
    staleCount,
    blockingCount,
    checks
  };
}
