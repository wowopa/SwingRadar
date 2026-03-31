import type { SignalHistoryEntryDto } from "@/lib/api-contracts/swing-radar";
import { getOpeningActionIntentMeta, getOpeningConfirmationMeta, getOpeningGapMeta, getOpeningRecheckStatusMeta } from "@/lib/recommendations/opening-recheck";
import type { OpeningRecheckScanSnapshot } from "@/lib/server/opening-recheck-board";
import type { OpeningRecheckReviewOutcome, OpeningRecheckTickerInsight } from "@/types/recommendation";

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

function resolveOutcome(result?: SignalHistoryEntryDto["result"]): OpeningRecheckReviewOutcome | undefined {
  if (!result) {
    return undefined;
  }

  if (result === "성공") {
    return "success";
  }

  if (result === "실패" || result === "무효화") {
    return "failure";
  }

  return "active";
}

function buildOutcomeCopy(outcome?: OpeningRecheckReviewOutcome, statusLabel?: string) {
  if (outcome === "success") {
    return {
      outcomeLabel: "성공 종료",
      outcomeNote: `${statusLabel ?? "이 판단"} 뒤 실제 관찰 결과가 성공으로 마감됐습니다.`
    };
  }

  if (outcome === "failure") {
    return {
      outcomeLabel: "실패 또는 무효화",
      outcomeNote: `${statusLabel ?? "이 판단"} 뒤 실제 관찰 결과가 실패/무효화로 끝났습니다.`
    };
  }

  if (outcome === "active") {
    return {
      outcomeLabel: "아직 진행 중",
      outcomeNote: `${statusLabel ?? "이 판단"} 뒤 아직 결과가 진행 중이라 추가 확인이 필요합니다.`
    };
  }

  return {
    outcomeLabel: undefined,
    outcomeNote: "장초 확인 판단 근거만 남아 있고, 연결된 관찰 결과는 아직 없습니다."
  };
}

export function buildOpeningRecheckTickerInsight(
  scans: OpeningRecheckScanSnapshot[],
  options: {
    ticker: string;
    signalDate?: string | null;
    trackingResult?: SignalHistoryEntryDto["result"];
  }
): OpeningRecheckTickerInsight | undefined {
  const normalizedTicker = options.ticker.toUpperCase();
  const matchedByDate = options.signalDate
    ? scans.find(
        (scan) =>
          toSeoulDate(scan.scanKey) === options.signalDate &&
          scan.items[normalizedTicker] &&
          scan.items[normalizedTicker]?.status !== "pending"
      )
    : undefined;
  const matchedByTicker =
    matchedByDate ??
    scans.find((scan) => scan.items[normalizedTicker] && scan.items[normalizedTicker]?.status !== "pending");

  if (!matchedByTicker) {
    return undefined;
  }

  const decision = matchedByTicker.items[normalizedTicker];
  if (!decision || decision.status === "pending") {
    return undefined;
  }

  const statusMeta = getOpeningRecheckStatusMeta(decision.status);
  const suggestedMeta = decision.suggestedStatus ? getOpeningRecheckStatusMeta(decision.suggestedStatus) : undefined;
  const outcome = resolveOutcome(options.trackingResult);
  const outcomeCopy = buildOutcomeCopy(outcome, statusMeta.label);

  return {
    scanKey: matchedByTicker.scanKey,
    signalDate: toSeoulDate(matchedByTicker.scanKey),
    status: decision.status,
    statusLabel: statusMeta.label,
    statusDescription: statusMeta.description,
    suggestedStatus: decision.suggestedStatus,
    suggestedStatusLabel: suggestedMeta?.label,
    gapLabel: decision.checklist ? getOpeningGapMeta(decision.checklist.gap).label : undefined,
    confirmationLabel: decision.checklist ? getOpeningConfirmationMeta(decision.checklist.confirmation).label : undefined,
    actionLabel: decision.checklist ? getOpeningActionIntentMeta(decision.checklist.action).label : undefined,
    note: decision.note,
    outcome,
    outcomeLabel: outcomeCopy.outcomeLabel,
    outcomeNote: outcomeCopy.outcomeNote,
    matchedBy: matchedByDate ? "signal_date" : "latest_ticker"
  };
}
