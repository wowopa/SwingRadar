function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function getAutoPromotionPolicy(env = process.env) {
  return {
    enabled: env.SWING_RADAR_AUTO_PROMOTION_ENABLED === "true",
    lookbackRuns: parsePositiveInteger(env.SWING_RADAR_AUTO_PROMOTION_LOOKBACK_RUNS ?? "30", 30),
    minHistoryRuns: parsePositiveInteger(env.SWING_RADAR_AUTO_PROMOTION_MIN_HISTORY_RUNS ?? "20", 20),
    minAppearances: parsePositiveInteger(env.SWING_RADAR_AUTO_PROMOTION_MIN_APPEARANCES ?? "5", 5),
    minConsecutiveAppearances: parsePositiveInteger(
      env.SWING_RADAR_AUTO_PROMOTION_MIN_CONSECUTIVE_APPEARANCES ?? "2",
      2
    ),
    maxAverageRank: parsePositiveNumber(env.SWING_RADAR_AUTO_PROMOTION_MAX_AVERAGE_RANK ?? "18", 18),
    minBestRank: parsePositiveInteger(env.SWING_RADAR_AUTO_PROMOTION_MIN_BEST_RANK ?? "10", 10),
    minAverageCandidateScore: parsePositiveNumber(
      env.SWING_RADAR_AUTO_PROMOTION_MIN_AVERAGE_CANDIDATE_SCORE ?? "28",
      28
    ),
    minCurrentCandidateScore: parsePositiveNumber(
      env.SWING_RADAR_AUTO_PROMOTION_MIN_CURRENT_CANDIDATE_SCORE ?? "30",
      30
    ),
    minAverageTurnover20: parsePositiveNumber(
      env.SWING_RADAR_AUTO_PROMOTION_MIN_AVG_TURNOVER20 ?? "30000000000",
      30_000_000_000
    ),
    minCurrentPrice: parsePositiveNumber(env.SWING_RADAR_AUTO_PROMOTION_MIN_PRICE ?? "5000", 5000),
    minAverageVolumeRatio: parsePositiveNumber(env.SWING_RADAR_AUTO_PROMOTION_MIN_AVG_VOLUME_RATIO ?? "1.05", 1.05),
    minCurrentVolumeRatio: parsePositiveNumber(env.SWING_RADAR_AUTO_PROMOTION_MIN_CURRENT_VOLUME_RATIO ?? "1.2", 1.2),
    maxPromotionsPerRun: parsePositiveInteger(env.SWING_RADAR_AUTO_PROMOTION_MAX_PER_RUN ?? "1", 1),
    allowedSignalTones: (env.SWING_RADAR_AUTO_PROMOTION_ALLOWED_TONES ?? "긍정,중립")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  };
}

export function buildPromotionMetrics(runs, ticker) {
  const appearances = runs.flatMap((run) => {
    const index = Array.isArray(run.topCandidates)
      ? run.topCandidates.findIndex((candidate) => candidate.ticker === ticker)
      : -1;

    if (index < 0) {
      return [];
    }

    const candidate = run.topCandidates[index];
    return [
      {
        generatedAt: run.generatedAt,
        rank: index + 1,
        candidateScore: Number(candidate.candidateScore ?? 0),
        averageTurnover20: Number(candidate.averageTurnover20 ?? 0),
        volumeRatio: Number(candidate.volumeRatio ?? 0),
        currentPrice: Number(candidate.currentPrice ?? 0),
        signalTone: candidate.signalTone ?? "중립"
      }
    ];
  });

  let consecutiveRecentAppearances = 0;
  for (const run of runs) {
    const hasCandidate = Array.isArray(run.topCandidates)
      ? run.topCandidates.some((candidate) => candidate.ticker === ticker)
      : false;
    if (!hasCandidate) {
      break;
    }
    consecutiveRecentAppearances += 1;
  }

  const appearanceCount = appearances.length;
  const totalRank = appearances.reduce((sum, item) => sum + item.rank, 0);
  const totalScore = appearances.reduce((sum, item) => sum + item.candidateScore, 0);
  const turnoverValues = appearances.map((item) => item.averageTurnover20).filter((value) => Number.isFinite(value) && value > 0);
  const volumeRatioValues = appearances.map((item) => item.volumeRatio).filter((value) => Number.isFinite(value) && value > 0);
  const latest = appearances[0] ?? null;

  return {
    appearanceCount,
    consecutiveRecentAppearances,
    averageRank: appearanceCount > 0 ? totalRank / appearanceCount : null,
    bestRank: appearanceCount > 0 ? Math.min(...appearances.map((item) => item.rank)) : null,
    averageCandidateScore: appearanceCount > 0 ? totalScore / appearanceCount : null,
    averageTurnover20:
      turnoverValues.length > 0 ? turnoverValues.reduce((sum, value) => sum + value, 0) / turnoverValues.length : null,
    averageVolumeRatio:
      volumeRatioValues.length > 0 ? volumeRatioValues.reduce((sum, value) => sum + value, 0) / volumeRatioValues.length : null,
    latestRank: latest?.rank ?? null,
    latestCandidateScore: latest?.candidateScore ?? null,
    latestCurrentPrice: latest?.currentPrice ?? null,
    latestVolumeRatio: latest?.volumeRatio ?? null,
    latestSignalTone: latest?.signalTone ?? null
  };
}

export function evaluateAutoPromotionCandidate(candidate, metrics, policy) {
  const reasons = [];

  if (!policy.allowedSignalTones.includes(candidate.signalTone ?? "")) {
    reasons.push("현재 신호 톤이 자동 편입 허용 범위가 아닙니다.");
  }
  if (metrics.appearanceCount < policy.minAppearances) {
    reasons.push(`최근 누적 등장 횟수가 ${policy.minAppearances}회보다 적습니다.`);
  }
  if (metrics.consecutiveRecentAppearances < policy.minConsecutiveAppearances) {
    reasons.push(`최근 연속 등장 횟수가 ${policy.minConsecutiveAppearances}회보다 적습니다.`);
  }
  if ((metrics.averageRank ?? Number.POSITIVE_INFINITY) > policy.maxAverageRank) {
    reasons.push(`평균 순위가 상위 ${policy.maxAverageRank}위 기준을 넘습니다.`);
  }
  if ((metrics.bestRank ?? Number.POSITIVE_INFINITY) > policy.minBestRank) {
    reasons.push(`최고 순위가 상위 ${policy.minBestRank}위 안에 들지 못했습니다.`);
  }
  if ((metrics.averageCandidateScore ?? 0) < policy.minAverageCandidateScore) {
    reasons.push(`평균 후보 점수가 ${policy.minAverageCandidateScore}점보다 낮습니다.`);
  }
  if (Number(candidate.candidateScore ?? 0) < policy.minCurrentCandidateScore) {
    reasons.push(`현재 후보 점수가 ${policy.minCurrentCandidateScore}점보다 낮습니다.`);
  }
  if ((metrics.averageTurnover20 ?? 0) < policy.minAverageTurnover20) {
    reasons.push("20일 평균 거래대금 기준을 충족하지 못했습니다.");
  }
  if (Number(candidate.currentPrice ?? 0) < policy.minCurrentPrice) {
    reasons.push("현재가가 자동 편입 최소 가격 기준보다 낮습니다.");
  }
  if ((metrics.averageVolumeRatio ?? 0) < policy.minAverageVolumeRatio) {
    reasons.push("평균 상대 거래량이 자동 편입 기준보다 낮습니다.");
  }
  if ((metrics.latestVolumeRatio ?? 0) < policy.minCurrentVolumeRatio) {
    reasons.push("최근 상대 거래량이 자동 편입 기준보다 낮습니다.");
  }

  return {
    qualifies: reasons.length === 0,
    reasons
  };
}
