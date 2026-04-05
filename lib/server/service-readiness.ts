import type { OperationalIncident } from "@/lib/server/operational-incidents";
import { getOperationalPolicy } from "@/lib/server/operations-policy";
import type { AutoHealReport, DailyCycleReport, PostLaunchHistoryEntry } from "@/lib/server/ops-reports";
import type { HealthReport } from "@/lib/services/health-service";

type ServiceReadinessStatus = "ready" | "monitor" | "blocked";
type ServiceReadinessCheckStatus = "pass" | "warn" | "fail";

export interface ServiceReadinessCheck {
  key: "health" | "scheduler" | "batch" | "validation" | "news" | "release-safety";
  label: string;
  status: ServiceReadinessCheckStatus;
  note: string;
}

export interface ServiceReadinessSummary {
  status: ServiceReadinessStatus;
  label: string;
  summary: string;
  nextAction: string;
  passCount: number;
  warningCount: number;
  failureCount: number;
  blockers: string[];
  checks: ServiceReadinessCheck[];
}

interface BuildServiceReadinessSummaryArgs {
  overallStatus: "ok" | "warning" | "critical";
  health: HealthReport;
  dailyCycleReport: DailyCycleReport | null;
  autoHealReport: AutoHealReport | null;
  incidents: OperationalIncident[];
  postLaunchHistory: PostLaunchHistoryEntry[];
  statusWarnings: string[];
  dataQualitySummary: {
    validationFallbackPercent: number | null;
    measuredValidationPercent: number | null;
    failedBatchCount: number | null;
    newsLiveFetchPercent: number | null;
  };
}

function buildHealthCheck(args: BuildServiceReadinessSummaryArgs): ServiceReadinessCheck {
  const criticalIncidentCount = args.incidents.filter((item) => item.severity === "critical").length;
  const warningIncidentCount = args.incidents.filter((item) => item.severity === "warning").length;

  if (args.health.status === "critical" || criticalIncidentCount > 0) {
    return {
      key: "health",
      label: "헬스 상태",
      status: "fail",
      note: criticalIncidentCount > 0 ? `치명 incident ${criticalIncidentCount}건이 남아 있습니다.` : "헬스 체크가 critical 상태입니다."
    };
  }

  if (args.health.status === "warning" || warningIncidentCount > 0) {
    return {
      key: "health",
      label: "헬스 상태",
      status: "warn",
      note: warningIncidentCount > 0 ? `warning incident ${warningIncidentCount}건을 먼저 확인하세요.` : "헬스 경고가 남아 있습니다."
    };
  }

  return {
    key: "health",
    label: "헬스 상태",
    status: "pass",
    note: "스냅샷 freshness와 provider 상태가 안정적입니다."
  };
}

function buildSchedulerCheck(args: BuildServiceReadinessSummaryArgs): ServiceReadinessCheck {
  if (!args.dailyCycleReport || !args.autoHealReport) {
    const missing = [
      !args.dailyCycleReport ? "daily cycle" : null,
      !args.autoHealReport ? "auto-heal" : null
    ].filter(Boolean);

    return {
      key: "scheduler",
      label: "자동화 등록",
      status: "fail",
      note: `${missing.join(", ")} 리포트가 없어 스케줄러 실운영 여부를 확인할 수 없습니다.`
    };
  }

  if (args.autoHealReport.status === "failed") {
    return {
      key: "scheduler",
      label: "자동화 등록",
      status: "warn",
      note: "auto-heal 최근 실행이 실패했습니다."
    };
  }

  if (args.autoHealReport.status === "running") {
    return {
      key: "scheduler",
      label: "자동화 등록",
      status: "warn",
      note: "auto-heal이 아직 실행 중입니다."
    };
  }

  return {
    key: "scheduler",
    label: "자동화 등록",
    status: "pass",
    note: "daily cycle과 auto-heal 리포트가 모두 잡혀 있습니다."
  };
}

function buildBatchCheck(args: BuildServiceReadinessSummaryArgs): ServiceReadinessCheck {
  if (!args.dailyCycleReport) {
    return {
      key: "batch",
      label: "일일 배치",
      status: "fail",
      note: "최근 일일 배치 리포트가 없습니다."
    };
  }

  if (args.dailyCycleReport.status === "failed") {
    return {
      key: "batch",
      label: "일일 배치",
      status: "fail",
      note: "최근 일일 배치가 실패했습니다."
    };
  }

  const recentCriticalHistory = args.postLaunchHistory.some((item) => item.incidents.criticalCount > 0);
  if (recentCriticalHistory) {
    return {
      key: "batch",
      label: "일일 배치",
      status: "warn",
      note: "최근 post-launch history에 치명 incident가 남아 있습니다."
    };
  }

  if (args.dailyCycleReport.status === "warning" || (args.dataQualitySummary.failedBatchCount ?? 0) > 0) {
    const failedBatchCount = args.dataQualitySummary.failedBatchCount ?? 0;
    return {
      key: "batch",
      label: "일일 배치",
      status: "warn",
      note: failedBatchCount > 0 ? `최근 배치에서 실패 batch ${failedBatchCount}건이 있었습니다.` : "최근 일일 배치가 warning 상태였습니다."
    };
  }

  return {
    key: "batch",
    label: "일일 배치",
    status: "pass",
    note: "최근 배치가 실패 없이 완료됐습니다."
  };
}

function buildValidationCheck(args: BuildServiceReadinessSummaryArgs): ServiceReadinessCheck {
  const policy = getOperationalPolicy();
  const validationFallbackPercent = args.dataQualitySummary.validationFallbackPercent;
  const measuredValidationPercent = args.dataQualitySummary.measuredValidationPercent;

  if (validationFallbackPercent == null) {
    return {
      key: "validation",
      label: "검증 품질",
      status: "warn",
      note: "validation fallback 비율 리포트가 없어 검증 품질을 판단하기 어렵습니다."
    };
  }

  if (validationFallbackPercent >= policy.escalation.validationFallbackCriticalPercent) {
    return {
      key: "validation",
      label: "검증 품질",
      status: "fail",
      note: `validation fallback 비율이 ${validationFallbackPercent}%로 치명 기준 이상입니다.`
    };
  }

  if (
    validationFallbackPercent >= policy.escalation.validationFallbackWarningPercent ||
    (measuredValidationPercent != null && measuredValidationPercent < 35)
  ) {
    const detail =
      measuredValidationPercent != null && measuredValidationPercent < 35
        ? `실측 기반 검증 비율이 ${measuredValidationPercent}%로 낮습니다.`
        : `validation fallback 비율이 ${validationFallbackPercent}%입니다.`;
    return {
      key: "validation",
      label: "검증 품질",
      status: "warn",
      note: detail
    };
  }

  return {
    key: "validation",
    label: "검증 품질",
    status: "pass",
    note: `validation fallback ${validationFallbackPercent}%로 관리 기준 안쪽입니다.`
  };
}

function buildNewsCheck(args: BuildServiceReadinessSummaryArgs): ServiceReadinessCheck {
  const policy = getOperationalPolicy();
  const newsLiveFetchPercent = args.dataQualitySummary.newsLiveFetchPercent;

  if (newsLiveFetchPercent == null) {
    return {
      key: "news",
      label: "뉴스 신선도",
      status: "warn",
      note: "live fetch 비율 리포트가 없어 뉴스 품질을 판단하기 어렵습니다."
    };
  }

  if (newsLiveFetchPercent <= policy.escalation.newsLiveFetchCriticalPercent) {
    return {
      key: "news",
      label: "뉴스 신선도",
      status: "fail",
      note: `실시간 뉴스 수집 비율이 ${newsLiveFetchPercent}%로 치명 기준 이하입니다.`
    };
  }

  if (newsLiveFetchPercent <= policy.escalation.newsLiveFetchWarningPercent) {
    return {
      key: "news",
      label: "뉴스 신선도",
      status: "warn",
      note: `실시간 뉴스 수집 비율이 ${newsLiveFetchPercent}%로 낮습니다.`
    };
  }

  return {
    key: "news",
    label: "뉴스 신선도",
    status: "pass",
    note: `실시간 뉴스 수집 비율 ${newsLiveFetchPercent}%를 유지하고 있습니다.`
  };
}

function buildReleaseSafetyCheck(args: BuildServiceReadinessSummaryArgs): ServiceReadinessCheck {
  const recentHistory = args.postLaunchHistory.slice(0, 3);
  const warningHistoryCount = recentHistory.filter(
    (item) => item.overallStatus === "warning" || item.incidents.warningCount > 0
  ).length;

  if (args.statusWarnings.length >= 3) {
    return {
      key: "release-safety",
      label: "릴리스 세이프티",
      status: "fail",
      note: `admin status 로드 경고가 ${args.statusWarnings.length}건 발생했습니다.`
    };
  }

  if (args.statusWarnings.length > 0 || warningHistoryCount > 0) {
    return {
      key: "release-safety",
      label: "릴리스 세이프티",
      status: "warn",
      note:
        args.statusWarnings.length > 0
          ? `admin status 로드 경고 ${args.statusWarnings.length}건을 먼저 정리하세요.`
          : "최근 post-launch history에 운영 경고가 남아 있습니다."
    };
  }

  return {
    key: "release-safety",
    label: "릴리스 세이프티",
    status: "pass",
    note: "최근 운영 이력상 별도 릴리스 경고가 없습니다."
  };
}

function getReadinessLabel(status: ServiceReadinessStatus) {
  if (status === "blocked") {
    return "공개 보류";
  }

  if (status === "monitor") {
    return "모니터링 필요";
  }

  return "공개 가능";
}

function getNextAction(check: ServiceReadinessCheck | undefined) {
  switch (check?.key) {
    case "health":
      return "Overview와 Data Quality 탭에서 stale snapshot과 provider fallback 원인을 먼저 정리하세요.";
    case "scheduler":
      return "daily cycle과 auto-heal 스케줄러 등록 및 최근 실행 이력을 먼저 확인하세요.";
    case "batch":
      return "candidate ops와 ops 로그에서 실패 batch 원인을 재현 없이 정리하세요.";
    case "validation":
      return "validation fallback 비율과 실측 기반 검증 비율을 먼저 낮추고 올리세요.";
    case "news":
      return "news fetch 경로와 cache/file fallback 비중을 먼저 점검하세요.";
    case "release-safety":
      return "admin status 경고와 최근 post-launch history warning을 먼저 정리하세요.";
    default:
      return "치명 항목 없이 최근 거래일 운영 로그가 안정적인지 계속 확인하세요.";
  }
}

export function buildServiceReadinessSummary(args: BuildServiceReadinessSummaryArgs): ServiceReadinessSummary {
  const checks = [
    buildHealthCheck(args),
    buildSchedulerCheck(args),
    buildBatchCheck(args),
    buildValidationCheck(args),
    buildNewsCheck(args),
    buildReleaseSafetyCheck(args)
  ];

  const failureCount = checks.filter((check) => check.status === "fail").length;
  const warningCount = checks.filter((check) => check.status === "warn").length;
  const passCount = checks.filter((check) => check.status === "pass").length;
  const status: ServiceReadinessStatus =
    args.overallStatus === "critical" || failureCount > 0
      ? "blocked"
      : args.overallStatus === "warning" || warningCount > 0
        ? "monitor"
        : "ready";

  const blockers = checks.filter((check) => check.status !== "pass").map((check) => `${check.label}: ${check.note}`);
  const primaryActionCheck = checks.find((check) => check.status === "fail") ?? checks.find((check) => check.status === "warn");

  const summary =
    status === "blocked"
      ? "치명 운영 항목이 남아 있어 공개 베타를 열기 전에 먼저 정리해야 합니다."
      : status === "monitor"
        ? "기본 구조는 갖춰졌지만 일반 공개 전에는 운영 모니터링을 더 쌓는 편이 안전합니다."
        : "현재 기준으로는 무료 공개 베타를 시작해도 될 만큼 운영 신뢰성이 안정적입니다.";

  return {
    status,
    label: getReadinessLabel(status),
    summary,
    nextAction: getNextAction(primaryActionCheck),
    passCount,
    warningCount,
    failureCount,
    blockers,
    checks
  };
}
