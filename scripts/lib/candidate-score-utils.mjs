function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toFiniteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function toPercentDistance(currentPrice, referencePrice) {
  const current = toFiniteNumber(currentPrice);
  const reference = toFiniteNumber(referencePrice);
  if (current === null || reference === null || reference <= 0) {
    return null;
  }

  return ((current - reference) / reference) * 100;
}

export function getLiquidityAdjustment(averageTurnover20) {
  if (!Number.isFinite(averageTurnover20)) {
    return { score: -2, rating: "확인 필요" };
  }

  if (averageTurnover20 >= 150_000_000_000) {
    return { score: 4, rating: "매우 높음" };
  }
  if (averageTurnover20 >= 70_000_000_000) {
    return { score: 3, rating: "높음" };
  }
  if (averageTurnover20 >= 30_000_000_000) {
    return { score: 2, rating: "양호" };
  }
  if (averageTurnover20 >= 10_000_000_000) {
    return { score: 0, rating: "보통" };
  }
  if (averageTurnover20 >= 5_000_000_000) {
    return { score: -2, rating: "다소 약함" };
  }

  return { score: -5, rating: "부족" };
}

export function getLowPricePenalty(currentPrice, averageTurnover20) {
  const turnover = averageTurnover20 ?? 0;

  if (!Number.isFinite(currentPrice)) {
    return -2;
  }
  if (currentPrice < 1_500) {
    return -6;
  }
  if (currentPrice < 2_000) {
    return -5;
  }
  if (currentPrice < 3_000) {
    return turnover >= 20_000_000_000 ? -3 : -4;
  }
  if (currentPrice < 5_000) {
    return turnover >= 20_000_000_000 ? -1 : -2;
  }
  if (currentPrice < 10_000) {
    return -1;
  }

  return 0;
}

export function getValidationAdjustment(validation = {}, validationBasis) {
  const hitRate = Number(validation.hitRate ?? 0);
  const avgReturn = Number(validation.avgReturn ?? 0);
  const sampleSize = Number(validation.sampleSize ?? 0);

  const hitRateScore = clamp((hitRate - 45) / 2.5, -4, 8);
  const avgReturnScore = clamp(avgReturn * 1.2, -6, 8);

  let sampleScore = 0;
  if (sampleSize >= 25) sampleScore = 4;
  else if (sampleSize >= 15) sampleScore = 3;
  else if (sampleSize >= 8) sampleScore = 2;
  else if (sampleSize >= 3) sampleScore = 1;

  let basisScore = 0;
  if (validationBasis === "실측 기반") basisScore = 2;
  else if (validationBasis === "공용 추적 참고") basisScore = 1.5;
  else if (validationBasis === "유사 업종 참고") basisScore = 1;
  else if (validationBasis === "유사 흐름 참고") basisScore = 0.5;
  else if (validationBasis === "보수 계산") basisScore = -1.5;

  return Number((hitRateScore + avgReturnScore + sampleScore + basisScore).toFixed(1));
}

export function getVolumeRatioAdjustment(volumeRatio) {
  if (!Number.isFinite(volumeRatio)) {
    return 0;
  }
  if (volumeRatio >= 0.85 && volumeRatio <= 2.2) {
    return 2;
  }
  if (volumeRatio >= 0.65 && volumeRatio <= 2.8) {
    return 1;
  }
  if (volumeRatio > 5.5) {
    return -4;
  }
  if (volumeRatio > 4.2) {
    return -3;
  }
  if (volumeRatio > 3.2) {
    return -2;
  }
  if (volumeRatio > 2.8) {
    return -1;
  }
  if (volumeRatio < 0.45) {
    return -2;
  }
  if (volumeRatio < 0.65) {
    return -1;
  }

  return 0;
}

export function getSignalToneAdjustment(signalTone) {
  if (signalTone === "긍정") {
    return 1;
  }
  if (signalTone === "주의") {
    return -2.5;
  }
  return 0;
}

export function buildSwingCandidateProfile({
  currentPrice,
  confirmationPrice,
  expansionPrice,
  invalidationPrice,
  invalidationDistance,
  observationWindow
}) {
  const chasePercent = toPercentDistance(currentPrice, confirmationPrice);
  const riskPercentFromPrice =
    Number.isFinite(currentPrice) && Number.isFinite(invalidationPrice) && Number(currentPrice) > 0
      ? ((Number(currentPrice) - Number(invalidationPrice)) / Number(currentPrice)) * 100
      : null;
  const riskPercent =
    Number.isFinite(invalidationDistance) ? Math.abs(Number(invalidationDistance)) : riskPercentFromPrice;
  const runwayPercent =
    Number.isFinite(currentPrice) && Number.isFinite(expansionPrice) && Number(currentPrice) > 0
      ? ((Number(expansionPrice) - Number(currentPrice)) / Number(currentPrice)) * 100
      : null;
  const normalizedWindow = String(observationWindow ?? "");
  const isShortWindow = normalizedWindow.includes("1~7");
  const isSwingWindow = normalizedWindow.includes("3~10") || normalizedWindow.includes("5~15");
  const isLateBreakout = chasePercent !== null && chasePercent >= 7;
  const isWideStop = riskPercent !== null && riskPercent >= 12;
  const isTightRunway = runwayPercent !== null && runwayPercent <= 4;

  return {
    chasePercent: chasePercent !== null ? Number(chasePercent.toFixed(1)) : null,
    riskPercent: riskPercent !== null ? Number(riskPercent.toFixed(1)) : null,
    runwayPercent: runwayPercent !== null ? Number(runwayPercent.toFixed(1)) : null,
    flags: {
      isShortWindow,
      isSwingWindow,
      isLateBreakout,
      isWideStop,
      isTightRunway
    }
  };
}

export function calculateSwingDurabilityAdjustment(profile) {
  let adjustment = 0;

  if (profile.flags.isSwingWindow) {
    adjustment += 2;
  } else if (profile.flags.isShortWindow) {
    adjustment -= 3;
  }

  if (profile.chasePercent !== null) {
    if (profile.chasePercent >= 12) {
      adjustment -= 8;
    } else if (profile.chasePercent >= 8) {
      adjustment -= 5;
    } else if (profile.chasePercent >= 5) {
      adjustment -= 3;
    } else if (profile.chasePercent >= 2.5) {
      adjustment -= 1;
    } else if (profile.chasePercent >= -1.5) {
      adjustment += 1;
    }
  }

  if (profile.riskPercent !== null) {
    if (profile.riskPercent >= 14) {
      adjustment -= 7;
    } else if (profile.riskPercent >= 12) {
      adjustment -= 5;
    } else if (profile.riskPercent >= 10) {
      adjustment -= 3;
    } else if (profile.riskPercent >= 8.5) {
      adjustment -= 1;
    } else if (profile.riskPercent >= 4 && profile.riskPercent <= 7.5) {
      adjustment += 2;
    } else if (profile.riskPercent < 2.5) {
      adjustment -= 2;
    }
  }

  if (profile.runwayPercent !== null) {
    if (profile.runwayPercent < 3) {
      adjustment -= 4;
    } else if (profile.runwayPercent < 4.5) {
      adjustment -= 2;
    } else if (profile.runwayPercent >= 6 && profile.runwayPercent <= 18) {
      adjustment += 1.5;
    }
  }

  return Number(adjustment.toFixed(1));
}

export function calculateCandidateScore({
  score,
  validation,
  validationBasis,
  averageTurnover20,
  currentPrice,
  confirmationPrice,
  expansionPrice,
  invalidationPrice,
  invalidationDistance,
  observationWindow,
  volumeRatio,
  signalTone
}) {
  const baseScore = Number(score ?? 0);
  const liquidity = getLiquidityAdjustment(averageTurnover20);
  const swingProfile = buildSwingCandidateProfile({
    currentPrice,
    confirmationPrice,
    expansionPrice,
    invalidationPrice,
    invalidationDistance,
    observationWindow
  });
  const candidateScore =
    baseScore +
    getValidationAdjustment(validation, validationBasis) +
    liquidity.score +
    getVolumeRatioAdjustment(volumeRatio) +
    getSignalToneAdjustment(signalTone) +
    getLowPricePenalty(currentPrice, averageTurnover20) +
    calculateSwingDurabilityAdjustment(swingProfile);

  return Number(clamp(candidateScore, 0, 60).toFixed(1));
}
