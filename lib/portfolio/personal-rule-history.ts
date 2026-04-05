import type { OpeningCheckRiskPatternDto } from "@/lib/api-contracts/swing-radar";
import {
  suggestOpeningRecheckStatusWithContext,
  type OpeningDecisionStatus
} from "@/lib/recommendations/opening-recheck";
import type { UserOpeningRecheckScanSnapshot } from "@/lib/server/user-opening-recheck-board";
import type { OpeningRecheckStatus, PortfolioPersonalRuleEntry } from "@/types/recommendation";

const DEFAULT_RECENT_WINDOW_DAYS = 14;

export interface PersonalRuleHistoryImpact {
  scanKey: string;
  ticker: string;
  updatedAt: string;
  savedStatus: OpeningRecheckStatus;
  baseStatus: OpeningDecisionStatus;
  suggestedStatus: OpeningDecisionStatus;
  reason: string;
  riskPatternTitle?: string;
}

export interface PersonalRuleHistorySummary {
  ruleId: string;
  totalImpactCount: number;
  recentImpactCount: number;
  lastAppliedAt?: string;
  recentTickers: string[];
  impacts: PersonalRuleHistoryImpact[];
}

export interface RecentRuleImpactSummary {
  scanKey: string;
  ticker: string;
  updatedAt: string;
  savedStatus: OpeningRecheckStatus;
  baseStatus: OpeningDecisionStatus;
  suggestedStatus: OpeningDecisionStatus;
  matchedRules: Array<{
    id: string;
    text: string;
    reason: string;
  }>;
  riskPatternTitle?: string;
}

function resolveReferenceTime(
  openingCheckScans: UserOpeningRecheckScanSnapshot[],
  referenceTime?: number
) {
  if (typeof referenceTime === "number" && Number.isFinite(referenceTime)) {
    return referenceTime;
  }

  for (const scan of openingCheckScans) {
    const scanTime = Date.parse(scan.updatedAt);
    if (!Number.isNaN(scanTime)) {
      return scanTime;
    }
  }

  return Date.now();
}

function isInsideRecentWindow(value: string, cutoffTime: number) {
  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && timestamp >= cutoffTime;
}

function collectRecentTickers(
  impacts: PersonalRuleHistoryImpact[],
  cutoffTime: number,
  maxCount = 3
) {
  const recentTickers = [
    ...new Set(impacts.filter((impact) => isInsideRecentWindow(impact.updatedAt, cutoffTime)).map((impact) => impact.ticker))
  ];

  if (recentTickers.length) {
    return recentTickers.slice(0, maxCount);
  }

  return [...new Set(impacts.map((impact) => impact.ticker))].slice(0, maxCount);
}

export function buildPersonalRuleHistorySummaries({
  openingCheckScans,
  rules,
  openingCheckRiskPatterns = [],
  recentWindowDays = DEFAULT_RECENT_WINDOW_DAYS,
  referenceTime
}: {
  openingCheckScans: UserOpeningRecheckScanSnapshot[];
  rules: PortfolioPersonalRuleEntry[];
  openingCheckRiskPatterns?: OpeningCheckRiskPatternDto[];
  recentWindowDays?: number;
  referenceTime?: number;
}) {
  if (!rules.length || !openingCheckScans.length) {
    return rules.map((rule) => ({
      ruleId: rule.id,
      totalImpactCount: 0,
      recentImpactCount: 0,
      lastAppliedAt: undefined,
      recentTickers: [],
      impacts: []
    } satisfies PersonalRuleHistorySummary));
  }

  const orderedScans = [...openingCheckScans].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const cutoffTime = resolveReferenceTime(orderedScans, referenceTime) - recentWindowDays * 86_400_000;
  const impactsByRuleId = new Map<string, PersonalRuleHistoryImpact[]>();

  for (const scan of orderedScans) {
    const orderedItems = Object.values(scan.items).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    for (const item of orderedItems) {
      if (!item.checklist) {
        continue;
      }

      const riskPatternTitle =
        suggestOpeningRecheckStatusWithContext(item.checklist, {
          riskPatterns: openingCheckRiskPatterns
        }).riskPattern?.title ?? undefined;

      for (const rule of rules) {
        const suggestion = suggestOpeningRecheckStatusWithContext(item.checklist, {
          personalRuleText: rule.text
        });

        if (suggestion.status === suggestion.baseStatus || !suggestion.personalRuleReason) {
          continue;
        }

        const impacts = impactsByRuleId.get(rule.id) ?? [];
        impacts.push({
          scanKey: scan.scanKey,
          ticker: item.ticker,
          updatedAt: item.updatedAt,
          savedStatus: item.status,
          baseStatus: suggestion.baseStatus,
          suggestedStatus: suggestion.status,
          reason: suggestion.personalRuleReason,
          riskPatternTitle
        });
        impactsByRuleId.set(rule.id, impacts);
      }
    }
  }

  return rules.map((rule) => {
    const impacts = (impactsByRuleId.get(rule.id) ?? []).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return {
      ruleId: rule.id,
      totalImpactCount: impacts.length,
      recentImpactCount: impacts.filter((impact) => isInsideRecentWindow(impact.updatedAt, cutoffTime)).length,
      lastAppliedAt: impacts[0]?.updatedAt,
      recentTickers: collectRecentTickers(impacts, cutoffTime),
      impacts
    } satisfies PersonalRuleHistorySummary;
  });
}

export function buildRecentRuleImpacts({
  openingCheckScans,
  rules,
  openingCheckRiskPatterns = [],
  recentWindowDays = DEFAULT_RECENT_WINDOW_DAYS,
  referenceTime
}: {
  openingCheckScans: UserOpeningRecheckScanSnapshot[];
  rules: PortfolioPersonalRuleEntry[];
  openingCheckRiskPatterns?: OpeningCheckRiskPatternDto[];
  recentWindowDays?: number;
  referenceTime?: number;
}) {
  const activeRules = rules.filter((rule) => rule.isActive);
  if (!activeRules.length || !openingCheckScans.length) {
    return [] satisfies RecentRuleImpactSummary[];
  }

  const orderedScans = [...openingCheckScans].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const combinedRuleText = activeRules.map((rule) => rule.text).join(" ");
  const cutoffTime = resolveReferenceTime(orderedScans, referenceTime) - recentWindowDays * 86_400_000;

  return orderedScans
    .flatMap((scan) =>
      Object.values(scan.items).flatMap((item) => {
        const checklist = item.checklist;
        if (!checklist) {
          return [];
        }

        const fullSuggestion = suggestOpeningRecheckStatusWithContext(checklist, {
          personalRuleText: combinedRuleText,
          riskPatterns: openingCheckRiskPatterns
        });
        const matchedRules = activeRules
          .map((rule) => {
            const suggestion = suggestOpeningRecheckStatusWithContext(checklist, {
              personalRuleText: rule.text
            });

            if (suggestion.status === suggestion.baseStatus || !suggestion.personalRuleReason) {
              return null;
            }

            return {
              id: rule.id,
              text: rule.text,
              reason: suggestion.personalRuleReason
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
          .slice(0, 2);

        if (
          fullSuggestion.status === fullSuggestion.baseStatus &&
          !matchedRules.length &&
          !fullSuggestion.riskPattern
        ) {
          return [];
        }

        return [
          {
            scanKey: scan.scanKey,
            ticker: item.ticker,
            updatedAt: item.updatedAt,
            savedStatus: item.status,
            baseStatus: fullSuggestion.baseStatus,
            suggestedStatus: fullSuggestion.status,
            matchedRules,
            riskPatternTitle: fullSuggestion.riskPattern?.title
          } satisfies RecentRuleImpactSummary
        ];
      })
    )
    .filter((impact) => isInsideRecentWindow(impact.updatedAt, cutoffTime))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
