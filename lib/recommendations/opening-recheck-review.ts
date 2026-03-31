import type { SignalHistoryEntryDto } from "@/lib/api-contracts/swing-radar";
import type { OpeningRecheckScanSnapshot } from "@/lib/server/opening-recheck-board";
import type {
  OpeningRecheckDecision,
  OpeningRecheckReview,
  OpeningRecheckReviewOutcome,
  OpeningRecheckStatus
} from "@/types/recommendation";

import {
  getOpeningActionIntentMeta,
  getOpeningConfirmationMeta,
  getOpeningGapMeta,
  getOpeningRecheckStatusMeta
} from "@/lib/recommendations/opening-recheck";

type ReviewStatus = Exclude<OpeningRecheckStatus, "pending">;

interface OpeningReviewMatch {
  scanKey: string;
  signalDate: string;
  ticker: string;
  status: ReviewStatus;
  decision: OpeningRecheckDecision;
  outcome: OpeningRecheckReviewOutcome;
}

function toSeoulDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function toTrackingKey(signalDate: string, ticker: string) {
  return `${signalDate}:${ticker.toUpperCase()}`;
}

function resolveOutcome(result: SignalHistoryEntryDto["result"]): OpeningRecheckReviewOutcome {
  if (result === "성공") {
    return "success";
  }

  if (result === "실패" || result === "무효화") {
    return "failure";
  }

  return "active";
}

function summarizeMatches(matches: OpeningReviewMatch[]) {
  const resolvedMatches = matches.filter((match) => match.outcome !== "active");
  const successCount = matches.filter((match) => match.outcome === "success").length;
  const failureCount = matches.filter((match) => match.outcome === "failure").length;
  const activeCount = matches.filter((match) => match.outcome === "active").length;

  return {
    count: matches.length,
    resolvedCount: resolvedMatches.length,
    successCount,
    failureCount,
    activeCount
  };
}

function buildStatusNote(status: ReviewStatus, matches: OpeningReviewMatch[]) {
  const summary = summarizeMatches(matches);

  if (!summary.count) {
    return "아직 회고할 기록이 없습니다.";
  }

  if (!summary.resolvedCount) {
    return `${summary.count}건이 아직 진행 중입니다.`;
  }

  if (status === "passed") {
    return `${summary.resolvedCount}건 중 ${summary.successCount}건이 성공으로 마감됐습니다.`;
  }

  if (status === "watch") {
    return `${summary.resolvedCount}건 중 ${summary.successCount}건은 성공, ${summary.failureCount}건은 실패/무효화였습니다.`;
  }

  return `${summary.resolvedCount}건 중 ${summary.failureCount}건이 실제로 실패/무효화로 끝났습니다.`;
}

function buildPatternNote(matches: OpeningReviewMatch[]) {
  const summary = summarizeMatches(matches);

  if (!summary.resolvedCount) {
    return `${summary.count}건이 아직 진행 중입니다.`;
  }

  return `${summary.resolvedCount}건 중 ${summary.successCount}건 성공, ${summary.failureCount}건 실패/무효화`;
}

export function buildOpeningRecheckReview(
  scans: OpeningRecheckScanSnapshot[],
  history: SignalHistoryEntryDto[]
): OpeningRecheckReview | undefined {
  const historyByKey = new Map<string, SignalHistoryEntryDto>();

  for (const item of history) {
    const key = toTrackingKey(item.signalDate, item.ticker);
    const existing = historyByKey.get(key);

    if (!existing || Boolean(existing.closedAt) === false) {
      historyByKey.set(key, item);
    }
  }

  const matches: OpeningReviewMatch[] = [];

  for (const scan of scans) {
    const signalDate = toSeoulDate(scan.scanKey);

    for (const decision of Object.values(scan.items)) {
      if (decision.status === "pending") {
        continue;
      }

      const trackingItem = historyByKey.get(toTrackingKey(signalDate, decision.ticker));
      if (!trackingItem) {
        continue;
      }

      matches.push({
        scanKey: scan.scanKey,
        signalDate,
        ticker: decision.ticker,
        status: decision.status,
        decision,
        outcome: resolveOutcome(trackingItem.result)
      });
    }
  }

  if (!matches.length) {
    return undefined;
  }

  const summary = summarizeMatches(matches);
  const passedMatches = matches.filter((match) => match.status === "passed");
  const avoidedMatches = matches.filter((match) => match.status === "avoid" || match.status === "excluded");
  const passedResolved = summarizeMatches(passedMatches).resolvedCount;
  const avoidedResolved = summarizeMatches(avoidedMatches).resolvedCount;
  const passedWinRate =
    passedResolved > 0 ? (summarizeMatches(passedMatches).successCount / passedResolved) * 100 : undefined;
  const avoidedFailureRate =
    avoidedResolved > 0 ? (summarizeMatches(avoidedMatches).failureCount / avoidedResolved) * 100 : undefined;

  const statusBreakdown = (["passed", "watch", "avoid", "excluded"] as ReviewStatus[]).map((status) => {
    const statusMatches = matches.filter((match) => match.status === status);
    const statusSummary = summarizeMatches(statusMatches);

    return {
      status,
      label: getOpeningRecheckStatusMeta(status).label,
      count: statusSummary.count,
      resolvedCount: statusSummary.resolvedCount,
      successCount: statusSummary.successCount,
      failureCount: statusSummary.failureCount,
      activeCount: statusSummary.activeCount,
      note: buildStatusNote(status, statusMatches)
    };
  });

  const patterns = Array.from(
    matches.reduce((map, match) => {
      if (!match.decision.checklist) {
        return map;
      }

      const key = `${match.decision.checklist.gap}:${match.decision.checklist.confirmation}:${match.decision.checklist.action}`;
      const group = map.get(key) ?? [];
      group.push(match);
      map.set(key, group);
      return map;
    }, new Map<string, OpeningReviewMatch[]>())
  )
    .map(([id, groupedMatches]) => {
      const first = groupedMatches[0];
      if (!first) {
        throw new Error("Opening recheck pattern requires at least one match.");
      }
      const checklist = first.decision.checklist;
      if (!checklist) {
        throw new Error("Opening recheck pattern requires a checklist.");
      }
      const title = [
        getOpeningGapMeta(checklist.gap).label,
        getOpeningConfirmationMeta(checklist.confirmation).label,
        getOpeningActionIntentMeta(checklist.action).label
      ].join(" · ");
      const groupedSummary = summarizeMatches(groupedMatches);

      return {
        id,
        title,
        count: groupedSummary.count,
        resolvedCount: groupedSummary.resolvedCount,
        successCount: groupedSummary.successCount,
        failureCount: groupedSummary.failureCount,
        activeCount: groupedSummary.activeCount,
        note: buildPatternNote(groupedMatches)
      };
    })
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return right.resolvedCount - left.resolvedCount;
    })
    .slice(0, 3);

  return {
    summary: {
      headline: `장초 체크 회고 ${summary.count}건`,
      note:
        summary.resolvedCount > 0
          ? "장초 판단이 실제 추적 결과와 어떻게 이어졌는지 짧게 확인할 수 있습니다."
          : "아직 진행 중인 장초 체크가 많아 결과가 더 쌓이면 판단 근거가 선명해집니다.",
      matchedCount: summary.count,
      resolvedCount: summary.resolvedCount,
      successCount: summary.successCount,
      failureCount: summary.failureCount,
      activeCount: summary.activeCount,
      passedWinRate,
      avoidedFailureRate
    },
    statusBreakdown,
    patterns
  };
}
