function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getLiquidityAdjustment(averageTurnover20) {
  if (!Number.isFinite(averageTurnover20)) {
    return { score: -2, rating: "확인 필요" };
  }

  if (averageTurnover20 >= 150_000_000_000) {
    return { score: 4, rating: "매우 풍부" };
  }
  if (averageTurnover20 >= 70_000_000_000) {
    return { score: 3, rating: "풍부" };
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
  if (volumeRatio >= 0.9 && volumeRatio <= 2.5) {
    return 2;
  }
  if (volumeRatio >= 0.7 && volumeRatio <= 3) {
    return 1;
  }
  if (volumeRatio > 4) {
    return -2;
  }
  if (volumeRatio > 3) {
    return -1;
  }
  if (volumeRatio < 0.45) {
    return -2;
  }
  if (volumeRatio < 0.7) {
    return -1;
  }

  return 0;
}

export function getSignalToneAdjustment(signalTone) {
  if (signalTone === "긍정") {
    return 1.5;
  }
  if (signalTone === "주의") {
    return -2.5;
  }
  return 0;
}

export function calculateCandidateScore({
  score,
  validation,
  validationBasis,
  averageTurnover20,
  currentPrice,
  volumeRatio,
  signalTone
}) {
  const baseScore = Number(score ?? 0);
  const liquidity = getLiquidityAdjustment(averageTurnover20);
  const candidateScore =
    baseScore +
    getValidationAdjustment(validation, validationBasis) +
    liquidity.score +
    getVolumeRatioAdjustment(volumeRatio) +
    getSignalToneAdjustment(signalTone) +
    getLowPricePenalty(currentPrice, averageTurnover20);

  return Number(clamp(candidateScore, 0, 60).toFixed(1));
}
