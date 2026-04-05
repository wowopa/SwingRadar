import type { PostLaunchHistoryEntry } from "@/lib/server/ops-reports";
import type { ServiceReadinessSummary } from "@/lib/server/service-readiness";

type PrelaunchDryRunStatus = "ready" | "trial" | "blocked";
type PrelaunchDryRunCheckStatus = "pass" | "warn" | "fail";

export interface PrelaunchDryRunCheck {
  key: "ops" | "history" | "support" | "feedback";
  label: string;
  status: PrelaunchDryRunCheckStatus;
  note: string;
}

export interface PrelaunchDryRunSummary {
  status: PrelaunchDryRunStatus;
  label: string;
  summary: string;
  nextAction: string;
  recommendedCohort: string;
  passCount: number;
  warningCount: number;
  failureCount: number;
  blockers: string[];
  dailyChecks: string[];
  checks: PrelaunchDryRunCheck[];
}

interface BuildPrelaunchDryRunSummaryArgs {
  serviceReadiness: ServiceReadinessSummary;
  postLaunchHistory: PostLaunchHistoryEntry[];
  recentAuditCount: number;
  uniqueVisitorsLast7Days: number | null;
}

function buildOpsCheck(args: BuildPrelaunchDryRunSummaryArgs): PrelaunchDryRunCheck {
  const recentHistory = args.postLaunchHistory.slice(-5);
  const criticalDays = recentHistory.filter(
    (item) => item.overallStatus === "critical" || item.incidents.criticalCount > 0
  ).length;
  const warningDays = recentHistory.filter(
    (item) => item.overallStatus === "warning" || item.incidents.warningCount > 0
  ).length;

  if (args.serviceReadiness.status === "blocked" || criticalDays > 0) {
    return {
      key: "ops",
      label: "운영 안정성",
      status: "fail",
      note:
        criticalDays > 0
          ? `최근 운영 기록 ${criticalDays}회에서 치명적 incident가 남아 있어 외부 사용자 드라이런 전에 먼저 정리해야 합니다.`
          : "서비스 개시 기준이 아직 blocked 상태라 외부 사용자 드라이런을 열기에는 이릅니다."
    };
  }

  if (args.serviceReadiness.status === "monitor" || warningDays >= 2) {
    return {
      key: "ops",
      label: "운영 안정성",
      status: "warn",
      note:
        warningDays >= 2
          ? `최근 운영 기록 ${warningDays}회에서 warning이 반복돼 소수 파일럿만 권장됩니다.`
          : "핵심 구조는 갖췄지만 운영 경고가 남아 있어 작은 사용자군으로만 검증하는 편이 안전합니다."
    };
  }

  return {
    key: "ops",
    label: "운영 안정성",
    status: "pass",
    note: "최근 운영 기록과 서비스 개시 기준이 안정적이라 비공개 베타 드라이런을 시작할 수 있습니다."
  };
}

function buildHistoryCheck(args: BuildPrelaunchDryRunSummaryArgs): PrelaunchDryRunCheck {
  const historyCount = args.postLaunchHistory.length;

  if (historyCount < 3) {
    return {
      key: "history",
      label: "운영 관찰 기간",
      status: "warn",
      note: `최근 운영 히스토리가 ${historyCount}회뿐이라 최소 3회 이상은 더 누적한 뒤 외부 드라이런 폭을 넓히는 편이 좋습니다.`
    };
  }

  if (historyCount < 8) {
    return {
      key: "history",
      label: "운영 관찰 기간",
      status: "warn",
      note: `운영 히스토리 ${historyCount}회가 쌓여 1차 파일럿은 가능하지만, 2주 수준의 관찰 기록은 더 필요합니다.`
    };
  }

  return {
    key: "history",
    label: "운영 관찰 기간",
    status: "pass",
    note: `운영 히스토리 ${historyCount}회가 쌓여 드라이런 중 패턴을 비교하고 회귀를 찾기 좋은 상태입니다.`
  };
}

function buildSupportCheck(args: BuildPrelaunchDryRunSummaryArgs): PrelaunchDryRunCheck {
  const recentHistory = args.postLaunchHistory.slice(-5);
  const auditFailures = recentHistory.reduce((total, item) => total + item.audits.failureCount, 0);

  if (auditFailures > 0) {
    return {
      key: "support",
      label: "운영자 대응",
      status: "warn",
      note: `최근 운영 기록에서 audit failure ${auditFailures}건이 남아 있어 문의/공지/복구 흐름을 한 번 더 리허설하는 편이 좋습니다.`
    };
  }

  if (args.recentAuditCount === 0) {
    return {
      key: "support",
      label: "운영자 대응",
      status: "warn",
      note: "최근 운영자 로그가 없어 계정 세션 정리나 공지 수정 같은 대응 흐름을 아직 충분히 밟아보지 못했습니다."
    };
  }

  return {
    key: "support",
    label: "운영자 대응",
    status: "pass",
    note: "운영자 audit 로그가 들어오고 있어 계정·공지·복구 흐름을 추적하면서 드라이런을 받을 수 있습니다."
  };
}

function buildFeedbackCheck(args: BuildPrelaunchDryRunSummaryArgs): PrelaunchDryRunCheck {
  if (args.uniqueVisitorsLast7Days == null) {
    return {
      key: "feedback",
      label: "피드백 채집",
      status: "warn",
      note: "최근 접근 통계가 없어 드라이런 규모를 보수적으로 잡고 직접 피드백을 수집하는 편이 좋습니다."
    };
  }

  if (args.uniqueVisitorsLast7Days < 5) {
    return {
      key: "feedback",
      label: "피드백 채집",
      status: "warn",
      note: `최근 7일 고유 방문 ${args.uniqueVisitorsLast7Days}명 수준이라 10명 내외 파일럿부터 천천히 여는 편이 안전합니다.`
    };
  }

  return {
    key: "feedback",
    label: "피드백 채집",
    status: "pass",
    note: `최근 7일 고유 방문 ${args.uniqueVisitorsLast7Days}명 기준으로도 드라이런 피드백을 모으기 시작할 수 있습니다.`
  };
}

function getStatusLabel(status: PrelaunchDryRunStatus) {
  if (status === "blocked") {
    return "내부 리허설 우선";
  }

  if (status === "trial") {
    return "소수 파일럿 권장";
  }

  return "비공개 베타 가능";
}

function getNextAction(check: PrelaunchDryRunCheck | undefined) {
  switch (check?.key) {
    case "ops":
      return "Data Quality와 Service Readiness에서 경고 원인을 먼저 줄이고, 그 뒤에만 외부 사용자군을 여는 편이 안전합니다.";
    case "history":
      return "최소 며칠 더 운영 로그를 쌓아 반복 경향을 본 뒤 드라이런 규모를 키우세요.";
    case "support":
      return "문의 대응, 세션 정리, 공지 수정처럼 운영자 개입이 필요한 흐름을 한 번 더 리허설하세요.";
    case "feedback":
      return "10명 안팎 파일럿으로 시작해 피드백을 수집하고, 대응 템플릿이 쌓이면 다음 단계로 넓히세요.";
    default:
      return "드라이런 동안에는 운영 요약, 사용자 피드백, 데이터 품질 경고를 매일 같이 확인하세요.";
  }
}

function getSummary(status: PrelaunchDryRunStatus) {
  if (status === "blocked") {
    return "외부 사용자 드라이런 전에 내부 운영 리허설과 경고 정리를 먼저 끝내는 편이 안전합니다.";
  }

  if (status === "trial") {
    return "핵심 흐름은 갖췄고 10명 안팎의 소수 파일럿은 시작할 수 있지만, 운영자가 매일 체크리스트를 같이 돌려야 합니다.";
  }

  return "20명 안팎 비공개 베타 드라이런을 운영하면서 실제 사용성, 데이터 신뢰도, 지원 응답을 함께 검증할 수 있는 상태입니다.";
}

function getRecommendedCohort(status: PrelaunchDryRunStatus) {
  if (status === "blocked") {
    return "내부 계정 3개 · 3거래일";
  }

  if (status === "trial") {
    return "10명 내외 · 5거래일";
  }

  return "20명 내외 · 10거래일";
}

export function buildPrelaunchDryRunSummary(
  args: BuildPrelaunchDryRunSummaryArgs
): PrelaunchDryRunSummary {
  const checks = [
    buildOpsCheck(args),
    buildHistoryCheck(args),
    buildSupportCheck(args),
    buildFeedbackCheck(args)
  ];
  const failureCount = checks.filter((check) => check.status === "fail").length;
  const warningCount = checks.filter((check) => check.status === "warn").length;
  const passCount = checks.filter((check) => check.status === "pass").length;
  const status: PrelaunchDryRunStatus = failureCount > 0 ? "blocked" : warningCount > 0 ? "trial" : "ready";
  const primaryCheck = checks.find((check) => check.status === "fail") ?? checks.find((check) => check.status === "warn");

  return {
    status,
    label: getStatusLabel(status),
    summary: getSummary(status),
    nextAction: getNextAction(primaryCheck),
    recommendedCohort: getRecommendedCohort(status),
    passCount,
    warningCount,
    failureCount,
    blockers: checks.filter((check) => check.status !== "pass").map((check) => `${check.label}: ${check.note}`),
    dailyChecks: [
      "오전에는 Overview와 Data Quality에서 stale/fallback 경고를 먼저 확인합니다.",
      "실사용 계정으로 Today → Opening Check → Portfolio 흐름을 한 번 직접 밟아봅니다.",
      "문의, 공지, 세션 정리처럼 운영자 개입이 필요한 동선을 하루 한 번은 리허설합니다.",
      "드라이런 피드백과 재현 버그는 당일 안에 audit 또는 작업 노트에 남겨 다음 배포 전에 정리합니다."
    ],
    checks
  };
}
