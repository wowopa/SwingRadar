import { mergePortfolioProfileWithJournal } from "@/lib/portfolio/merge-profile-with-journal";
import { formatPrice } from "@/lib/utils";
import type { PortfolioJournal, PortfolioProfile, PortfolioProfilePosition } from "@/types/recommendation";

export type PortfolioStateConsistencyIssueType =
  | "missing_profile_position"
  | "stale_profile_position"
  | "quantity_mismatch"
  | "average_price_mismatch";

export interface PortfolioStateConsistencyIssue {
  ticker: string;
  type: PortfolioStateConsistencyIssueType;
  detail: string;
}

export interface PortfolioStateConsistencyReport {
  status: "aligned" | "warning";
  summary: string;
  issueCount: number;
  issues: PortfolioStateConsistencyIssue[];
}

function buildPositionMap(positions: PortfolioProfilePosition[]) {
  return new Map(positions.map((position) => [position.ticker, position]));
}

function hasMeaningfulPriceDelta(left: number, right: number) {
  return Math.abs(left - right) >= 0.01;
}

export function buildPortfolioStateConsistencyReport(
  profile: PortfolioProfile,
  journal: PortfolioJournal
): PortfolioStateConsistencyReport {
  const expectedProfile = mergePortfolioProfileWithJournal(profile, journal);
  const actualPositions = buildPositionMap(profile.positions);
  const expectedPositions = buildPositionMap(expectedProfile.positions);
  const tickers = [...new Set([...actualPositions.keys(), ...expectedPositions.keys()])].sort((left, right) =>
    left.localeCompare(right, "en")
  );
  const issues: PortfolioStateConsistencyIssue[] = [];

  for (const ticker of tickers) {
    const actual = actualPositions.get(ticker);
    const expected = expectedPositions.get(ticker);

    if (!actual && expected) {
      issues.push({
        ticker,
        type: "missing_profile_position",
        detail: `${ticker} 포지션이 holdings에 없지만 저널 기준 수량 ${expected.quantity}주가 남아 있습니다.`
      });
      continue;
    }

    if (actual && !expected) {
      issues.push({
        ticker,
        type: "stale_profile_position",
        detail: `${ticker} 포지션이 holdings에는 남아 있지만 저널 기준으로는 이미 종료됐습니다.`
      });
      continue;
    }

    if (!actual || !expected) {
      continue;
    }

    if (actual.quantity !== expected.quantity) {
      issues.push({
        ticker,
        type: "quantity_mismatch",
        detail: `${ticker} 수량이 holdings ${actual.quantity}주, 저널 기준 ${expected.quantity}주로 다릅니다.`
      });
    }

    if (hasMeaningfulPriceDelta(actual.averagePrice, expected.averagePrice)) {
      issues.push({
        ticker,
        type: "average_price_mismatch",
        detail: `${ticker} 평단이 holdings ${formatPrice(actual.averagePrice)}, 저널 기준 ${formatPrice(expected.averagePrice)}로 다릅니다.`
      });
    }
  }

  if (!issues.length) {
    return {
      status: "aligned",
      summary: "Holdings와 Journal 기준 포지션이 일치합니다.",
      issueCount: 0,
      issues: []
    };
  }

  return {
    status: "warning",
    summary: `Holdings와 Journal 기준이 어긋난 항목 ${issues.length}건이 있습니다.`,
    issueCount: issues.length,
    issues
  };
}
