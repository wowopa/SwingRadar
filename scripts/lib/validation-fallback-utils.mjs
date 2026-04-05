function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundNumber(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function resolveTrackingResult(item) {
  if (item.mae <= -5.5 || (item.holdingDays <= 5 && item.mfe < 2 && item.mae <= -4)) {
    return "무효화";
  }
  if (item.mfe >= 5 && item.mae > -4) {
    return "성공";
  }
  if (item.holdingDays >= 5 && item.mfe > 0) {
    return "진행중";
  }
  return "실패";
}

export function buildTrackingValidationProxy(item) {
  const result = resolveTrackingResult(item);
  const hitRateByResult = {
    성공: 62,
    진행중: 54,
    실패: 39,
    무효화: 28
  };
  const sampleSize = result === "성공" ? 10 : result === "진행중" ? 8 : 7;
  const avgReturn = roundNumber(clamp(item.mfe * 0.6 + item.mae * 0.2, -4.5, 7.5), 1);

  return {
    hitRate: hitRateByResult[result],
    avgReturn,
    sampleSize,
    maxDrawdown: roundNumber(item.mae, 1)
  };
}

export function aggregateValidationProfile(items, options = {}) {
  if (!items.length) {
    return null;
  }

  const minSampleSize = options.minSampleSize ?? 14;
  const maxSampleSize = options.maxSampleSize ?? 42;
  const totalWeight = items.reduce((sum, item) => sum + Math.max(item.sampleSize, 1), 0);
  const weighted = (field) =>
    items.reduce((sum, item) => sum + item[field] * Math.max(item.sampleSize, 1), 0) / Math.max(totalWeight, 1);

  const hitRate = Math.round(weighted("hitRate"));
  const avgReturn = roundNumber(weighted("avgReturn"), 1);
  const maxDrawdown = roundNumber(weighted("maxDrawdown"), 1);
  const sampleSize = clamp(Math.round(totalWeight / items.length), minSampleSize, maxSampleSize);

  return {
    hitRate,
    avgReturn,
    sampleSize,
    maxDrawdown,
    sourceCount: items.length
  };
}

export function buildDirectTrackingValidationProfile(trackingItems) {
  const closedItems = trackingItems.filter((item) => item.status !== "watch" && item.status !== "active");
  if (!closedItems.length) {
    return null;
  }

  const aggregate = aggregateValidationProfile(closedItems.map((item) => buildTrackingValidationProxy(item)), {
    minSampleSize: 12,
    maxSampleSize: 32
  });
  if (!aggregate) {
    return null;
  }

  return {
    ...aggregate,
    hitRate: clamp(Math.round(aggregate.hitRate), 42, 68),
    avgReturn: roundNumber(aggregate.avgReturn ?? 0, 1),
    sampleSize: clamp(Math.round(aggregate.sampleSize), 12, 32),
    maxDrawdown: roundNumber(aggregate.maxDrawdown ?? -1, 1),
    latestStatus: closedItems[0]?.status ?? null
  };
}
