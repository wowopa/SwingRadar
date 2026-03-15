import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";
import { getProjectPaths } from "./lib/external-source-utils.mjs";
import { writeLiveSnapshotManifest } from "./lib/live-snapshot-manifest.mjs";
import { getRuntimePaths } from "./lib/runtime-paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

const KO = {
  positive: "긍정",
  neutral: "중립",
  caution: "주의",
  good: "양호",
  review: "확인 필요",
  basic: "기본",
  bull: "강세",
  bear: "약세"
};

function printHelp() {
  console.log(`
SWING-RADAR snapshot generator

Usage:
  node scripts/generate-snapshots.mjs [--raw-dir <path>] [--out-dir <path>]
`);
}

function getSnapshotGenerationReportPath() {
  return process.env.SWING_RADAR_SNAPSHOT_GENERATION_REPORT_PATH
    ? path.resolve(process.env.SWING_RADAR_SNAPSHOT_GENERATION_REPORT_PATH)
    : path.join(getRuntimePaths(projectRoot).opsDir, "latest-snapshot-generation.json");
}

function parseArgs(argv) {
  const defaults = getProjectPaths(projectRoot);
  const options = {
    rawDir: defaults.rawDir,
    outDir: defaults.liveDir
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--raw-dir") {
      options.rawDir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--out-dir") {
      options.outDir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function readJson(dir, filename) {
  const filePath = path.join(dir, filename);
  let lastError = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const content = (await readFile(filePath, "utf8")).replace(/^\uFEFF/, "").trim();
      if (!content) {
        throw new SyntaxError(`Empty JSON file: ${filePath}`);
      }
      return JSON.parse(content);
    } catch (error) {
      lastError = error;
      const isSyntaxError = error instanceof SyntaxError || /Unexpected end of JSON input/i.test(String(error));
      if (!isSyntaxError || attempt === 3) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error(`Failed to read JSON: ${filePath}`);
}

async function readOptionalJson(dir, filename, fallback) {
  try {
    return await readJson(dir, filename);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatPercent(value) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function roundNumber(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function calculateEMA(values, period) {
  if (values.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);
  let ema = average(values.slice(0, period));
  for (let index = period; index < values.length; index += 1) {
    ema = values[index] * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

function calculateRSI(values, period = 14) {
  if (values.length <= period) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const delta = values[index] - values[index - 1];
    if (delta >= 0) gains += delta;
    else losses += Math.abs(delta);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const rs = averageGain / averageLoss;
  return 100 - 100 / (1 + rs);
}

function calculateStdDev(values) {
  if (!values.length) {
    return null;
  }

  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function calculateTechnicalIndicators(item) {
  const closes = item.closes ?? [];
  const volumes = item.volumes ?? [];

  if (!closes.length) {
    return {
      sma20: null,
      sma60: null,
      ema20: null,
      rsi14: null,
      macd: null,
      macdSignal: null,
      macdHistogram: null,
      bollingerUpper: null,
      bollingerMiddle: null,
      bollingerLower: null,
      volumeRatio20: null
    };
  }

  const sma20 = closes.length >= 20 ? average(closes.slice(-20)) : null;
  const sma60 = closes.length >= 60 ? average(closes.slice(-60)) : null;
  const ema20 = calculateEMA(closes, 20);
  const ema12Series = [];
  const ema26Series = [];

  for (let index = 0; index < closes.length; index += 1) {
    const subset = closes.slice(0, index + 1);
    ema12Series.push(calculateEMA(subset, 12));
    ema26Series.push(calculateEMA(subset, 26));
  }

  const macdSeries = ema12Series
    .map((value, index) => (value !== null && ema26Series[index] !== null ? value - ema26Series[index] : null))
    .filter((value) => value !== null);

  const macd = macdSeries.length ? macdSeries.at(-1) : null;
  const macdSignal = macdSeries.length >= 9 ? calculateEMA(macdSeries, 9) : null;
  const macdHistogram = macd !== null && macdSignal !== null ? macd - macdSignal : null;
  const rsi14 = calculateRSI(closes, 14);
  const bollingerMiddle = sma20;
  const bollingerStdDev = closes.length >= 20 ? calculateStdDev(closes.slice(-20)) : null;
  const bollingerUpper = bollingerMiddle !== null && bollingerStdDev !== null ? bollingerMiddle + bollingerStdDev * 2 : null;
  const bollingerLower = bollingerMiddle !== null && bollingerStdDev !== null ? bollingerMiddle - bollingerStdDev * 2 : null;
  const avg20Volume = volumes.length >= 20 ? average(volumes.slice(-20)) : null;
  const latestVolume = volumes.length ? volumes.at(-1) : null;
  const volumeRatio20 = avg20Volume && latestVolume ? latestVolume / avg20Volume : null;

  return {
    sma20: roundNumber(sma20, 0),
    sma60: roundNumber(sma60, 0),
    ema20: roundNumber(ema20, 0),
    rsi14: roundNumber(rsi14, 1),
    macd: roundNumber(macd, 1),
    macdSignal: roundNumber(macdSignal, 1),
    macdHistogram: roundNumber(macdHistogram, 1),
    bollingerUpper: roundNumber(bollingerUpper, 0),
    bollingerMiddle: roundNumber(bollingerMiddle, 0),
    bollingerLower: roundNumber(bollingerLower, 0),
    volumeRatio20: roundNumber(volumeRatio20, 2)
  };
}

function resolveObservationWindow(sampleSize, hitRate) {
  if (sampleSize >= 35) return "5~15거래일";
  if (sampleSize >= 24 || hitRate >= 55) return "3~10거래일";
  return "1~7거래일";
}

function buildMeasuredValidationItem(item) {
  const basis = item.basis ?? "실측 기반";
  return {
    ...item,
    basis,
    observationWindow: item.observationWindow ?? resolveObservationWindow(item.sampleSize, item.hitRate),
    validationSummary: item.validationSummary ?? buildValidationSummary(item)
  };
}

function getScoreBand(score) {
  if (score >= 75) return "strong";
  if (score >= 60) return "balanced";
  return "watch";
}

function getSwingBaseScore(item) {
  const weighted =
    item.trendScore * 1.35 +
    item.flowScore * 1.15 +
    item.volatilityScore * 1.05 +
    item.eventScore * 0.7 +
    item.qualityScore * 1.15;

  return roundNumber(weighted / 5.4, 1) ?? 0;
}

function getMarketScore(item) {
  return getSwingBaseScore(item);
}

function resolveTrackingResult(item) {
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

function buildTrackingValidationProxy(item) {
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

function aggregateValidationProfile(items) {
  if (!items.length) {
    return null;
  }

  const totalWeight = items.reduce((sum, item) => sum + Math.max(item.sampleSize, 1), 0);
  const weighted = (field) =>
    items.reduce((sum, item) => sum + item[field] * Math.max(item.sampleSize, 1), 0) / Math.max(totalWeight, 1);

  const hitRate = Math.round(weighted("hitRate"));
  const avgReturn = roundNumber(weighted("avgReturn"), 1);
  const maxDrawdown = roundNumber(weighted("maxDrawdown"), 1);
  const sampleSize = clamp(Math.round(totalWeight / items.length), 14, 42);

  return {
    hitRate,
    avgReturn,
    sampleSize,
    maxDrawdown,
    sourceCount: items.length
  };
}

function buildValidationProfiles(validationItems, trackingItems, marketByTicker) {
  const sectorBuckets = new Map();
  const bandBuckets = new Map();

  const addProfile = (sector, band, profile) => {
    if (sector) {
      const sectorItems = sectorBuckets.get(sector) ?? [];
      sectorItems.push(profile);
      sectorBuckets.set(sector, sectorItems);
    }

    const bandItems = bandBuckets.get(band) ?? [];
    bandItems.push(profile);
    bandBuckets.set(band, bandItems);
  };

  for (const item of validationItems) {
    const marketItem = marketByTicker.get(item.ticker);
    if (!marketItem) {
      continue;
    }

    addProfile(
      marketItem.sector,
      getScoreBand(getMarketScore(marketItem)),
      {
        hitRate: item.hitRate,
        avgReturn: item.avgReturn,
        sampleSize: item.sampleSize,
        maxDrawdown: item.maxDrawdown
      }
    );
  }

  for (const item of trackingItems) {
    if (item.status === "watch" || item.status === "active") {
      continue;
    }

    const marketItem = marketByTicker.get(item.ticker);
    if (!marketItem) {
      continue;
    }

    addProfile(marketItem.sector, getScoreBand(item.entryScore), buildTrackingValidationProxy(item));
  }

  return {
    sector: new Map(Array.from(sectorBuckets.entries(), ([key, items]) => [key, aggregateValidationProfile(items)])),
    band: new Map(Array.from(bandBuckets.entries(), ([key, items]) => [key, aggregateValidationProfile(items)]))
  };
}

function buildEstimatedValidationItem(item, profiles) {
  const sectorProfile = profiles.sector.get(item.sector);
  const bandProfile = profiles.band.get(getScoreBand(getMarketScore(item)));
  const scoreBase = item.trendScore + item.flowScore + item.volatilityScore + item.qualityScore;

  if (sectorProfile && sectorProfile.sourceCount >= 1) {
    const hitRate = clamp(Math.round(sectorProfile.hitRate), 38, 66);
    const avgReturn = roundNumber(sectorProfile.avgReturn, 1);
    const sampleSize = clamp(Math.round(sectorProfile.sampleSize), 16, 38);
    const maxDrawdown = roundNumber(sectorProfile.maxDrawdown, 1);

    return {
      ticker: item.ticker,
      hitRate,
      avgReturn,
      sampleSize,
      maxDrawdown,
      basis: "유사 업종 참고",
      observationWindow: resolveObservationWindow(sampleSize, hitRate),
      validationSummary: `같은 업종 흐름 ${sectorProfile.sourceCount}건을 참고해 정리한 값입니다. 성공률 ${hitRate}%, 평균 움직임 ${formatPercent(avgReturn)}, 최대 하락 ${formatPercent(maxDrawdown)} 수준으로 보고 있습니다.`
    };
  }

  if (bandProfile && bandProfile.sourceCount >= 2) {
    const hitRate = clamp(Math.round(bandProfile.hitRate), 40, 63);
    const avgReturn = roundNumber(bandProfile.avgReturn, 1);
    const sampleSize = clamp(Math.round(bandProfile.sampleSize), 14, 30);
    const maxDrawdown = roundNumber(bandProfile.maxDrawdown, 1);

    return {
      ticker: item.ticker,
      hitRate,
      avgReturn,
      sampleSize,
      maxDrawdown,
      basis: "유사 흐름 참고",
      observationWindow: resolveObservationWindow(sampleSize, hitRate),
      validationSummary: `점수대가 비슷한 흐름 ${bandProfile.sourceCount}건을 참고한 값입니다. 실측 표본이 더 쌓이기 전까지는 참고용으로 가볍게 보는 편이 좋습니다.`
    };
  }

  const hitRate = clamp(Math.round(42 + scoreBase * 0.25), 45, 58);
  const avgReturn = Number((Math.max(0.8, (item.confirmationPrice - item.entryPrice) / Math.max(item.entryPrice, 1) * 100 * 0.45)).toFixed(1));
  const sampleSize = clamp(Math.round(12 + item.qualityScore * 0.8), 12, 24);
  const maxDrawdown = Number((((item.invalidationPrice - item.entryPrice) / Math.max(item.entryPrice, 1)) * 100).toFixed(1));

  return {
    ticker: item.ticker,
    hitRate,
    avgReturn,
    sampleSize,
    maxDrawdown,
    basis: "보수 계산",
    observationWindow: resolveObservationWindow(sampleSize, hitRate),
    validationSummary: "실측 표본이 아직 충분하지 않아 가격 거리와 점수를 기준으로 보수 계산한 참고값입니다."
  };
}

function buildValidationSummary(item) {
  const tone =
    item.hitRate >= 58 && item.avgReturn > 0
      ? "비슷한 흐름에서 비교적 좋은 결과가 자주 나왔습니다."
      : item.hitRate >= 48 && item.avgReturn >= 0
        ? "무리하게 들어가기보다 가격 확인 후 보는 편이 더 안전합니다."
        : "결과 차이가 큰 편이라 서두르지 말고 천천히 보는 편이 좋습니다.";

  return `비슷한 흐름 ${item.sampleSize}건 기준 성공률 ${item.hitRate}%, 평균 움직임 ${formatPercent(item.avgReturn)}, 가장 크게 밀린 폭 ${formatPercent(item.maxDrawdown)}입니다. ${tone}`;
}

function summarizeEventCoverage(newsItems) {
  const counts = {
    total: newsItems.length,
    disclosure: 0,
    curated: 0,
    externalNews: 0
  };

  for (const item of newsItems) {
    if (item.eventType === "curated-news") {
      counts.curated += 1;
      continue;
    }

    if (
      item.source === "dart" ||
      item.eventType?.includes("disclosure") ||
      item.eventType === "earnings" ||
      item.eventType === "treasury-stock" ||
      item.eventType === "contract" ||
      item.eventType === "clinical-approval" ||
      item.eventType === "capital-raise" ||
      item.eventType === "risk" ||
      item.eventType === "inquiry" ||
      item.eventType === "governance"
    ) {
      counts.disclosure += 1;
      continue;
    }

    counts.externalNews += 1;
  }

  const confidence =
    counts.disclosure + counts.curated >= 2
      ? "보강됨"
      : counts.disclosure + counts.curated >= 1 || counts.total >= 2
        ? "제한적"
        : "취약";

  const note =
    counts.total === 0
      ? "확인된 외부 이벤트가 부족해 점수 해석을 보수적으로 가져가야 합니다."
      : counts.externalNews === 0 && counts.disclosure + counts.curated > 0
        ? "기사 수는 적지만 공시와 큐레이션 이벤트로 커버리지를 보강했습니다."
        : counts.externalNews > 0 && counts.disclosure + counts.curated > 0
          ? "외부 기사와 공시 또는 큐레이션이 함께 반영된 구성입니다."
          : "기사 커버리지가 제한적이어서 시세와 무효화 기준을 함께 봐야 합니다.";

  return {
    ...counts,
    confidence,
    note
  };
}

function resolveSignalTone(score, invalidationDistance, hitRate) {
  if (score >= 22 && invalidationDistance <= -4 && invalidationDistance >= -14 && hitRate >= 55) return KO.positive;
  if (score >= 14 && invalidationDistance <= -2.5 && hitRate >= 50) return KO.neutral;
  return KO.caution;
}

function resolveSignalLabel(score, tone) {
  if (tone === KO.caution) return score >= 18 ? "신호는 있지만 보수적으로 보기" : "가볍게 지켜보기";
  if (tone === KO.positive) return score >= 24 ? "흐름이 강한 편" : "조금 더 확인해볼 만함";
  if (score >= 18) return "조금 더 확인해볼 만함";
  return "가볍게 지켜보기";
}

function buildCheckpoints(item) {
  return [
    `${item.invalidationPrice.toLocaleString()}원 근처를 지키는지 보기`,
    `${item.confirmationPrice.toLocaleString()}원을 넘는지 보기`,
    `${item.expansionPrice.toLocaleString()}원까지 힘이 이어지는지 보기`
  ];
}

function buildRationale(item, topNews, coverage) {
  const newsText = topNews
    ? `최근에는 '${topNews.headline}' 같은 이슈가 함께 반영되고 있습니다.`
    : "최근 참고할 만한 기사나 공시는 많지 않습니다.";
  const coverageText = `뉴스 신뢰도는 ${coverage.confidence} 수준입니다.`;
  return `${item.company}는 가격 흐름 ${item.trendScore}점, 거래 흐름 ${item.flowScore}점, 흔들림 관리 ${item.volatilityScore}점을 기준으로 살펴보고 있습니다. ${newsText} ${coverageText}`;
}

function buildInvalidation(item) {
  return `${item.invalidationPrice.toLocaleString()}원 아래로 내려가면 이번 흐름은 다시 봐야 합니다.`;
}

function buildAnalysisSummary(item, qualityLabel) {
  return [
    { label: "추세", value: `${item.trendScore}점`, note: "중기 구조 흐름" },
    { label: "수급", value: `${item.flowScore}점`, note: "거래대금 / 회전 흐름" },
    { label: "변동성", value: `${item.volatilityScore}점`, note: "무효화 거리 기준" },
    { label: "데이터 품질", value: qualityLabel, note: "시세 / 뉴스 정합성" }
  ];
}

function buildKeyLevels(item) {
  return [
    { label: "다시 볼 가격", price: `${item.invalidationPrice.toLocaleString()}원`, meaning: "이 가격 아래면 흐름을 다시 점검" },
    { label: "확인 가격", price: `${item.confirmationPrice.toLocaleString()}원`, meaning: "힘이 붙는지 확인하는 구간" },
    { label: "다음 목표", price: `${item.expansionPrice.toLocaleString()}원`, meaning: "상승이 이어질 때 보는 구간" }
  ];
}

function buildDecisionNotes(item, validationItem, topNews, coverage) {
  return [
    `비슷한 흐름의 성공률은 ${validationItem.hitRate}%이고 평균 움직임은 ${formatPercent(validationItem.avgReturn)}였습니다.`,
    `${item.invalidationPrice.toLocaleString()}원 아래로 가면 흐름이 약해졌다고 보는 기준입니다.`,
    topNews ? `가장 먼저 볼 이슈: ${topNews.headline}` : "참고할 이슈가 많지 않아 가격 흐름을 더 중요하게 봅니다.",
    `참고 자료: 공시 ${coverage.disclosure}건, 운영 메모 ${coverage.curated}건, 기사 ${coverage.externalNews}건`
  ];
}

function buildTechnicalNotes(indicators) {
  const notes = [];

  if (indicators.rsi14 !== null) {
    if (indicators.rsi14 >= 70) notes.push("RSI는 단기 과열 구간에 가깝습니다.");
    else if (indicators.rsi14 <= 35) notes.push("RSI는 반등 여지를 함께 볼 수 있는 구간입니다.");
    else notes.push("RSI는 중립 범위에서 움직이고 있습니다.");
  }

  if (indicators.macd !== null && indicators.macdSignal !== null) {
    if (indicators.macd > indicators.macdSignal) notes.push("MACD는 시그널선 위에서 움직이고 있습니다.");
    else notes.push("MACD는 시그널선 아래에 있어 추가 확인이 필요합니다.");
  }

  if (indicators.volumeRatio20 !== null) {
    if (indicators.volumeRatio20 >= 1.3) notes.push("거래량은 최근 20일 평균보다 강합니다.");
    else if (indicators.volumeRatio20 <= 0.8) notes.push("거래량은 최근 평균보다 가볍습니다.");
    else notes.push("거래량은 최근 평균 수준입니다.");
  }

  return notes;
}

function calculateTechnicalAdjustment(indicators, item) {
  let adjustment = 0;

  if (indicators.sma20 !== null && indicators.sma60 !== null) {
    adjustment += indicators.sma20 >= indicators.sma60 ? 2.8 : -2.6;
  }

  if (indicators.ema20 !== null && item.currentPrice) {
    adjustment += item.currentPrice >= indicators.ema20 ? 1.4 : -1.6;
  }

  if (indicators.sma20 !== null && item.currentPrice) {
    adjustment += item.currentPrice >= indicators.sma20 ? 1.2 : -1.5;
  }

  if (indicators.rsi14 !== null) {
    if (indicators.rsi14 >= 52 && indicators.rsi14 <= 66) {
      adjustment += 1.8;
    } else if (indicators.rsi14 >= 45 && indicators.rsi14 < 52) {
      adjustment += 0.9;
    } else if (indicators.rsi14 > 72) {
      adjustment -= 2.4;
    } else if (indicators.rsi14 < 40) {
      adjustment -= 1.3;
    }
  }

  if (indicators.macd !== null && indicators.macdSignal !== null && indicators.macdHistogram !== null) {
    if (indicators.macd >= indicators.macdSignal && indicators.macdHistogram >= 0) {
      adjustment += 2;
    } else if (indicators.macd >= indicators.macdSignal) {
      adjustment += 0.8;
    } else {
      adjustment -= 1.8;
    }
  }

  if (indicators.volumeRatio20 !== null) {
    if (indicators.volumeRatio20 >= 1.05 && indicators.volumeRatio20 <= 1.8) {
      adjustment += 1.6;
    } else if (indicators.volumeRatio20 > 1.8 && indicators.volumeRatio20 <= 3) {
      adjustment += 0.4;
    } else if (indicators.volumeRatio20 > 3) {
      adjustment -= 1.6;
    } else if (indicators.volumeRatio20 <= 0.75) {
      adjustment -= 1.4;
    } else if (indicators.volumeRatio20 < 0.95) {
      adjustment -= 0.6;
    }
  }

  if (
    indicators.bollingerUpper !== null &&
    indicators.bollingerLower !== null &&
    item.currentPrice &&
    item.currentPrice > 0
  ) {
    if (item.currentPrice > indicators.bollingerUpper) {
      adjustment -= 1.8;
    } else if (item.currentPrice < indicators.bollingerLower) {
      adjustment -= 1.2;
    }
  }

  return roundNumber(clamp(adjustment, -8, 8), 1) ?? 0;
}

function buildChartSeries(item) {
  const rawHistory = Array.isArray(item.history) ? item.history.filter((entry) => Number.isFinite(entry?.close)) : [];
  const fallbackCloses = item.closes ?? [];
  const fallbackVolumes = item.volumes ?? [];
  const historySeries = rawHistory.length
    ? rawHistory.slice(-120).map((entry) => ({
        open: Number.isFinite(entry.open) ? Number(entry.open) : null,
        high: Number.isFinite(entry.high) ? Number(entry.high) : null,
        low: Number.isFinite(entry.low) ? Number(entry.low) : null,
        close: Number(entry.close),
        volume: Number.isFinite(entry.volume) ? Number(entry.volume) : null
      }))
    : fallbackCloses.slice(-120).map((close, index, series) => ({
        open: index > 0 ? Math.round(series[index - 1]) : Math.round(close),
        high: Math.round(close),
        low: Math.round(close),
        close: Math.round(close),
        volume: fallbackVolumes.length >= fallbackCloses.length ? Math.round(fallbackVolumes.slice(-120)[index] ?? 0) : null
      }));

  if (!historySeries.length) {
    return [];
  }

  return historySeries.map((point, index, series) => {
    const history = series.slice(0, index + 1).map((entry) => entry.close);
    const sma20 = history.length >= 20 ? average(history.slice(-20)) : null;
    const sma60 = history.length >= 60 ? average(history.slice(-60)) : null;
    const ema20 = calculateEMA(history, 20);
    const stdDev = history.length >= 20 ? calculateStdDev(history.slice(-20)) : null;
    const bollingerMiddle = sma20;
    const bollingerUpper = bollingerMiddle !== null && stdDev !== null ? bollingerMiddle + stdDev * 2 : null;
    const bollingerLower = bollingerMiddle !== null && stdDev !== null ? bollingerMiddle - stdDev * 2 : null;
    const rsi14 = calculateRSI(history, 14);
    const ema12 = calculateEMA(history, 12);
    const ema26 = calculateEMA(history, 26);
    const macd = ema12 !== null && ema26 !== null ? ema12 - ema26 : null;
    const macdSeries = Array.from({ length: history.length }, (_, historyIndex) => {
      const subset = history.slice(0, historyIndex + 1);
      const subsetEma12 = calculateEMA(subset, 12);
      const subsetEma26 = calculateEMA(subset, 26);
      return subsetEma12 !== null && subsetEma26 !== null ? subsetEma12 - subsetEma26 : null;
    }).filter((value) => value !== null);
    const macdSignal = macdSeries.length >= 9 ? calculateEMA(macdSeries, 9) : null;

    return {
      label: `-${series.length - index - 1}일`,
      open: roundNumber(point.open, 0),
      high: roundNumber(point.high, 0),
      low: roundNumber(point.low, 0),
      close: Math.round(point.close),
      volume: point.volume !== null ? Math.round(point.volume) : null,
      sma20: roundNumber(sma20, 0),
      sma60: roundNumber(sma60, 0),
      ema20: roundNumber(ema20, 0),
      bollingerUpper: roundNumber(bollingerUpper, 0),
      bollingerLower: roundNumber(bollingerLower, 0),
      rsi14: roundNumber(rsi14, 1),
      macd: roundNumber(macd, 1),
      macdSignal: roundNumber(macdSignal, 1)
    };
  });
}

function buildScenarios(item) {
  return [
    {
      label: KO.basic,
      probability: clamp(45 + Math.round(item.trendScore / 2), 35, 65),
      expectation: "지금 흐름이 이어지는 경우",
      trigger: `${item.confirmationPrice.toLocaleString()}원 위에서 버티는지 확인`
    },
    {
      label: KO.bull,
      probability: clamp(15 + Math.round(item.flowScore / 2), 15, 30),
      expectation: "생각보다 더 강하게 오르는 경우",
      trigger: `${item.expansionPrice.toLocaleString()}원까지 빠르게 올라가는지 확인`
    },
    {
      label: KO.bear,
      probability: clamp(100 - (45 + Math.round(item.trendScore / 2)) - (15 + Math.round(item.flowScore / 2)), 15, 40),
      expectation: "흐름이 약해지는 경우",
      trigger: `${item.invalidationPrice.toLocaleString()}원 아래로 내려가는지 확인`
    }
  ];
}

function qualityLabel(item) {
  if (item.qualityScore >= 13) return "양호";
  if (item.qualityScore >= 10) return "보통";
  return "주의";
}

function buildQualityValue(item, coverage, validationItem) {
  let score = item.qualityScore;

  if (validationItem.basis === "실측 기반") score += 2;
  else if (validationItem.basis === "유사 업종 참고") score += 0.5;
  else if (validationItem.basis === "보수 계산") score -= 2.5;
  else score -= 1;

  if (coverage.confidence === "보강됨") score += 1.5;
  else if (coverage.confidence === "제한적") score -= 0.5;
  else if (coverage.confidence === "취약") score -= 1.5;

  if (item.eventRiskStatus === "양호") score += 0.5;
  else if (item.eventRiskStatus === "확인 필요") score -= 0.5;
  else if (item.eventRiskStatus === "주의") score -= 1;

  if (item.heatStatus === "확인 필요") score -= 0.5;
  else if (item.heatStatus === "주의") score -= 1.5;

  if (item.riskStatus === "확인 필요") score -= 1;
  else if (item.riskStatus === "주의") score -= 2;

  if (score >= 17.5) return "양호";
  if (score >= 13.5) return "보통";
  return "주의";
}

function buildMarketDataQuality(item) {
  const closeCount = Array.isArray(item.closes) ? item.closes.length : 0;
  const averageTurnover20 = Number(item.averageTurnover20 ?? 0);
  const latestTurnover = Number(item.latestTurnover ?? 0);
  const turnoverRatio = averageTurnover20 > 0 ? latestTurnover / averageTurnover20 : null;

  let value = "가격 이력 제한";
  if (closeCount >= 85 && averageTurnover20 >= 1000000000000) {
    value = "매우 풍부한 가격 이력";
  } else if (closeCount >= 80 && averageTurnover20 >= 100000000000) {
    value = "풍부한 가격 이력";
  } else if (closeCount >= 75 && averageTurnover20 >= 10000000000) {
    value = "안정적인 가격 이력";
  } else if (closeCount >= 60) {
    value = "기본 가격 이력";
  }

  const ratioText = turnoverRatio === null ? "거래대금 비교값 없음" : `최근 거래대금은 20일 평균의 ${turnoverRatio.toFixed(2)}배`;
  const note = `${closeCount}일 가격 이력 기준 · 20일 평균 거래대금 ${Math.round(averageTurnover20 / 100000000)}억원 · ${ratioText}`;

  return { value, note };
}

function buildQualityDataNote(item) {
  const parts = [
    `품질 점수 ${item.qualityScore}점`,
    `가격 리스크 ${item.riskStatus}`,
    `이벤트 리스크 ${item.eventRiskStatus}`,
    `과열 상태 ${item.heatStatus}`
  ];

  return parts.join(" · ");
}

function riskStatusForChecklist(status) {
  if (status === KO.good || status === KO.review || status === KO.caution) return status;
  return KO.review;
}

function buildTrackingNews(newsItems) {
  return newsItems.map((item, index) => ({
    id: `${item.ticker}-news-${index + 1}`,
    date: item.date,
    headline: item.headline,
    impact: item.impact,
    note: item.summary,
    source: item.source ?? "external",
    url: item.url ?? "",
    eventType: item.eventType ?? "news"
  }));
}

function buildTrackingSummary(item, recommendation, validationItem) {
  const company = recommendation?.company ?? item.ticker;
  const hitRate = validationItem?.hitRate ?? 0;
  return `${company}는 시작 점수 ${item.entryScore}점에서 출발했고, 이후 가장 많이 오른 폭은 ${formatPercent(item.mfe)}, 가장 많이 밀린 폭은 ${formatPercent(item.mae)}였습니다. 비슷한 흐름의 성공률 ${hitRate}%와 비교하면 지금 결과는 ${item.result === "성공" ? "기대보다 좋은 편" : item.result === "진행중" ? "아직 진행 중" : "다시 점검이 필요한 편"}입니다.`;
}

function buildInvalidationReview(item, recommendation) {
  const invalidation = recommendation?.invalidation ?? "다시 봐야 하는 가격 기준";
  if (item.result === "무효화") {
    return `${invalidation} 기준이 깨져서 이번 흐름은 종료로 봤습니다. 다시 들어갈지는 새 흐름을 보고 판단하는 편이 좋습니다.`;
  }
  if (item.mae <= -3.5) {
    return "가격이 다시 봐야 하는 구간 가까이 내려왔지만 아직 기준은 지키고 있습니다. 서두르기보다 버티는 힘을 먼저 보는 편이 좋습니다.";
  }
  return "아직은 다시 봐야 하는 가격 아래로 내려가지 않았습니다. 다만 단기 과열이나 거래 약화는 계속 확인해야 합니다.";
}

function buildAfterActionReview(item, validationItem) {
  const avgReturn = validationItem?.avgReturn ?? 0;
  if (item.result === "성공") {
    return `이번 결과는 과거 평균 움직임 ${formatPercent(avgReturn)}보다 좋았습니다. 비슷한 흐름이 비교적 잘 이어진 사례로 볼 수 있습니다.`;
  }
  if (item.result === "진행중") {
    return "아직 결론을 내리기보다는 조금 더 지켜봐야 합니다. 현재까지는 괜찮지만 더 강한 상승 확인이 필요합니다.";
  }
  if (item.result === "무효화") {
    return "이번에는 기대보다 가격 흔들림과 이슈 영향이 더 크게 작용했습니다. 다음에는 처음부터 버틸 수 있는 가격 구간을 더 좁게 보는 편이 좋습니다.";
  }
  return "이번 결과는 과거 평균보다 약했습니다. 다음에는 거래량과 가격 확인이 함께 나오는지 더 꼼꼼히 보는 편이 안전합니다.";
}

function buildReviewChecklist(item) {
  return [
    `처음 ${Math.abs(item.mae).toFixed(1)}% 밀릴 때도 다시 봐야 하는 가격을 지켰는지 확인`,
    `${item.holdingDays}거래일 동안 가격과 거래량이 함께 움직였는지 확인`,
    `가장 많이 오른 폭 ${formatPercent(item.mfe)}과 가장 많이 밀린 폭 ${formatPercent(item.mae)}의 차이가 괜찮았는지 확인`
  ];
}

function buildTrackingMetrics(item, coverage) {
  const outcome =
    item.result === "성공"
      ? "기준 상회"
      : item.result === "진행중"
        ? "관찰 지속"
        : item.result === "무효화"
          ? "기준 훼손"
          : "기준 하회";

  const efficiency =
    item.mfe + item.mae >= 2
      ? "양호"
      : item.mfe + item.mae >= -1.5
        ? "보통"
        : "불리";

  const eventFlow =
    coverage.disclosure + coverage.curated >= 2
      ? "보강"
      : coverage.total >= 2
        ? "제한적"
        : "취약";

  return [
    { label: "결과 요약", value: outcome, note: `현재 상태 ${item.result}` },
    { label: "흐름 안정감", value: efficiency, note: `오른 폭 ${formatPercent(item.mfe)} / 밀린 폭 ${formatPercent(item.mae)}` },
    { label: "이슈 참고도", value: eventFlow, note: `공시 ${coverage.disclosure}건 / 운영 메모 ${coverage.curated}건 / 기사 ${coverage.externalNews}건` }
  ];
}

function buildChartSnapshot(item, basePrice) {
  const points = Math.max(Math.min(item.holdingDays, 6), 4);
  const peakPrice = basePrice * (1 + item.mfe / 100);
  const endPrice = basePrice * (1 + (item.mfe + item.mae * 0.35) / 100);

  return Array.from({ length: points }, (_, index) => {
    const ratio = index / Math.max(points - 1, 1);
    let price = basePrice;

    if (index === 1) {
      price = basePrice * (1 + item.mae / 100 / 2);
    } else if (index === points - 1) {
      price = endPrice;
    } else if (index > 1) {
      price = basePrice + (peakPrice - basePrice) * ratio;
    }

    return {
      label: `D${index + 1}`,
      price: Math.round(price)
    };
  });
}

function buildScoreLog(item, recommendation) {
  const score = recommendation?.score ?? item.entryScore;
  return [
    {
      timestamp: `${item.signalDate} 09:00`,
      factor: "초기 구조",
      delta: Math.round(score / 12),
      reason: `초기 진입 점수 ${score}점 기반`
    },
    {
      timestamp: `${item.signalDate} 13:00`,
      factor: "사후 경로",
      delta: Math.round(item.mfe / 2),
      reason: `최대 유리구간 ${formatPercent(item.mfe)} 반영`
    },
    {
      timestamp: `${item.signalDate} 15:00`,
      factor: "리스크 반영",
      delta: -Math.round(Math.abs(item.mae) / 2),
      reason: `최대 불리구간 ${formatPercent(item.mae)} 반영`
    }
  ];
}

function getServiceTrackingStatePath() {
  return path.join(getRuntimePaths(projectRoot).trackingDir, "service-tracking-state.json");
}

function getTrackingEventsPath(rawDir) {
  return path.join(rawDir, "tracking-events.json");
}

function getDailyCandidatesPath() {
  return path.join(getRuntimePaths(projectRoot).universeDir, "daily-candidates.json");
}

function parseDateOnly(value) {
  return new Date(`${value}T00:00:00+09:00`);
}

function diffDays(startDate, endDate) {
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000));
}

function getAverageTurnover20(item) {
  if (!item.averageVolume20 || !item.currentPrice) {
    return 0;
  }

  return item.averageVolume20 * item.currentPrice;
}

function buildRankingStats(runs) {
  const stats = new Map();

  for (const run of runs) {
    const topCandidates = run.topCandidates ?? [];
    topCandidates.forEach((candidate, index) => {
      const current = stats.get(candidate.ticker) ?? {
        appearances: 0,
        latestRank: null,
        bestRank: null,
        averageRank: null
      };

      current.appearances += 1;
      current.bestRank = current.bestRank === null ? index + 1 : Math.min(current.bestRank, index + 1);
      current.latestRank = current.latestRank === null ? index + 1 : current.latestRank;
      current.averageRank =
        current.averageRank === null
          ? index + 1
          : roundNumber((current.averageRank * (current.appearances - 1) + (index + 1)) / current.appearances, 1);

      stats.set(candidate.ticker, current);
    });
  }

  return stats;
}

function getTrackingConfig() {
  return {
    maxActive: Number(process.env.SWING_RADAR_TRACKING_MAX_ACTIVE ?? 8),
    maxWatch: Number(process.env.SWING_RADAR_TRACKING_MAX_WATCH ?? 12),
    minAverageTurnover20: Number(process.env.SWING_RADAR_TRACKING_MIN_AVG_TURNOVER20 ?? 3000000000),
    minWatchActivationScore: Number(process.env.SWING_RADAR_TRACKING_MIN_WATCH_ACTIVATION_SCORE ?? 52),
    minEntryActivationScore: Number(process.env.SWING_RADAR_TRACKING_MIN_ENTRY_ACTIVATION_SCORE ?? 68),
    minEntryAppearances: Number(process.env.SWING_RADAR_TRACKING_MIN_ENTRY_APPEARANCES ?? 1),
    minEntryAverageTurnover20: Number(process.env.SWING_RADAR_TRACKING_MIN_ENTRY_AVG_TURNOVER20 ?? 3000000000),
    confirmationBufferRatio: Number(process.env.SWING_RADAR_TRACKING_CONFIRMATION_BUFFER_RATIO ?? 0.97),
    forceEntryMaxRank: Number(process.env.SWING_RADAR_TRACKING_FORCE_ENTRY_MAX_RANK ?? 100),
    forceEntryMinHoldingDays: Number(process.env.SWING_RADAR_TRACKING_FORCE_ENTRY_MIN_HOLDING_DAYS ?? 1),
    cooldownDays: Number(process.env.SWING_RADAR_TRACKING_REENTRY_COOLDOWN_DAYS ?? 5),
    maxWatchDays: Number(process.env.SWING_RADAR_TRACKING_MAX_WATCH_DAYS ?? 7),
    maxHoldingDays: Number(process.env.SWING_RADAR_TRACKING_MAX_HOLDING_DAYS ?? 20)
  };
}

function buildActivationScore(item, rankingStat) {
  const historyBonus = (rankingStat?.appearances ?? 0) * 1.5;
  const rankBonus = rankingStat?.latestRank ? Math.max(0, 24 - rankingStat.latestRank) * 0.9 : 0;
  const liquidityBonus = getAverageTurnover20(item) >= 10000000000 ? 4 : getAverageTurnover20(item) >= 5000000000 ? 2 : 0;
  const structureBonus = item.currentPrice > item.invalidationPrice ? 6 : -8;

  return (
    item.trendScore * 1.1 +
    item.flowScore * 1.05 +
    item.qualityScore +
    item.eventScore * 0.75 +
    item.volatilityScore * 0.35 +
    historyBonus +
    rankBonus +
    liquidityBonus +
    structureBonus
  );
}

function buildTrackingEntryPlan(item) {
  const indicators = calculateTechnicalIndicators(item);
  const currentPrice = Number(item.currentPrice ?? item.entryPrice ?? 0);
  const breakoutLevel = Math.max(
    Number(item.confirmationPrice ?? currentPrice),
    Number(indicators.sma20 ?? 0),
    Number(indicators.ema20 ?? 0)
  );
  const volumeConfirmed = (indicators.volumeRatio20 ?? 0) >= 1.05 || item.flowScore >= 18;
  const trendConfirmed =
    (((indicators.sma20 ?? 0) > 0 && (indicators.sma60 ?? 0) > 0 && (indicators.sma20 ?? 0) >= (indicators.sma60 ?? 0))) ||
    item.trendScore >= 20;
  const momentumConfirmed = (indicators.rsi14 ?? 50) >= 47;
  const entryReady = currentPrice >= breakoutLevel * 0.995 && volumeConfirmed && trendConfirmed && momentumConfirmed;
  const entryPrice = roundNumber(Math.max(currentPrice, breakoutLevel), 0) ?? currentPrice;
  const bounds = buildTrackingPositionBounds(item, entryPrice, breakoutLevel);

  return {
    entryReady,
    entryPrice,
    invalidationPrice: bounds.invalidationPrice,
    targetPrice: bounds.targetPrice
  };
}

function buildTrackingPositionBounds(item, entryPrice, breakoutLevel = null) {
  const safeEntryPrice = Number(entryPrice ?? item.currentPrice ?? item.entryPrice ?? 0);
  const invalidationFloor = Number(item.invalidationPrice ?? safeEntryPrice);
  const structureAnchor = Math.max(
    Number(breakoutLevel ?? item.confirmationPrice ?? safeEntryPrice),
    Number(item.confirmationPrice ?? safeEntryPrice)
  );
  const invalidationPrice = roundNumber(Math.max(invalidationFloor, safeEntryPrice * 0.92), 0) ?? invalidationFloor;
  const riskPercent = clamp(((safeEntryPrice - invalidationPrice) / Math.max(safeEntryPrice, 1)) * 100, 2.5, 9.5);
  const expansionPercent = clamp(((Math.max(item.expansionPrice ?? safeEntryPrice, structureAnchor) - safeEntryPrice) / Math.max(safeEntryPrice, 1)) * 100, 3.5, 18);
  const targetPercent = clamp(Math.max(riskPercent * 1.8, expansionPercent * 0.6), 4.5, 16);
  const targetPrice = roundNumber(safeEntryPrice * (1 + targetPercent / 100), 0) ?? item.expansionPrice ?? item.confirmationPrice;

  return {
    invalidationPrice,
    targetPrice
  };
}

function resolveTrackingOutcome(entry, config) {
  if (entry.currentPrice <= entry.invalidationPrice) {
    return {
      status: "closed_loss",
      closedReason: "기준 이탈"
    };
  }

  if (entry.currentPrice >= entry.targetPrice) {
    return {
      status: "closed_win",
      closedReason: "목표 도달"
    };
  }

  if (entry.holdingDays >= config.maxHoldingDays) {
    return {
      status: "closed_timeout",
      closedReason: "보유 기간 종료"
    };
  }

  if (
    entry.holdingDays >= 5 &&
    entry.currentPrice < entry.entryPrice &&
    entry.activationScore < config.minWatchActivationScore
  ) {
    return {
      status: "closed_timeout",
      closedReason: "흐름 둔화"
    };
  }

  return {
    status: "active",
    closedReason: null
  };
}

function isWatchCandidateEligible(item, activationScore, rankingStat, config) {
  return (
    activationScore >= config.minWatchActivationScore &&
    getAverageTurnover20(item) >= config.minAverageTurnover20 &&
    item.currentPrice > item.invalidationPrice &&
    (rankingStat?.appearances ?? 0) >= 1
  );
}

function isEntryCandidateEligible(item, activationScore, rankingStat, config) {
  const entryPlan = buildTrackingEntryPlan(item);
  const confirmationBuffer = item.confirmationPrice * config.confirmationBufferRatio;
  const rankEligible = (rankingStat?.latestRank ?? Number.POSITIVE_INFINITY) <= config.forceEntryMaxRank;
  const structureEligible =
    entryPlan.entryReady ||
    (rankEligible && item.currentPrice > confirmationBuffer && item.currentPrice > item.invalidationPrice);

  return (
    activationScore >= config.minEntryActivationScore &&
    getAverageTurnover20(item) >= config.minEntryAverageTurnover20 &&
    structureEligible &&
    (rankingStat?.appearances ?? 0) >= config.minEntryAppearances
  );
}

function buildTrackingState({ generatedAt, candidateEntries, marketByTicker, previousState, rankingStats }) {
  const config = getTrackingConfig();
  const today = generatedAt.slice(0, 10);
  const stateVersion = 3;
  const previousEntries = previousState?.version === stateVersion && Array.isArray(previousState?.entries) ? previousState.entries : [];
  const entries = [];
  const liveTickers = new Set();
  const latestClosedByTicker = new Map();

  for (const entry of previousEntries) {
    const marketItem = marketByTicker.get(entry.ticker);
    if (!marketItem) {
      entries.push(entry);
      continue;
    }

    const currentPrice = marketItem.currentPrice;
    const highestPrice = Math.max(entry.highestPrice ?? entry.entryPrice, currentPrice);
    const lowestPrice = Math.min(entry.lowestPrice ?? entry.entryPrice, currentPrice);
    const holdingDays = diffDays(parseDateOnly(entry.signalDate), parseDateOnly(today)) + 1;
    const rankingStat = rankingStats.get(entry.ticker);
    const activationScore = roundNumber(buildActivationScore(marketItem, rankingStat), 1) ?? entry.activationScore ?? 0;

    const updated = {
      ...entry,
      company: marketItem.company,
      currentPrice,
      highestPrice,
      lowestPrice,
      holdingDays,
      latestRank: rankingStat?.latestRank ?? null,
      appearances: rankingStat?.appearances ?? 0,
      activationScore
    };

    if (entry.status === "active") {
      const bounds = buildTrackingPositionBounds(marketItem, updated.entryPrice);
      updated.invalidationPrice = bounds.invalidationPrice;
      updated.targetPrice = bounds.targetPrice;
      const outcome = resolveTrackingOutcome(updated, config);
      updated.status = outcome.status;
      if (outcome.status !== "active") {
        updated.closedAt = generatedAt;
        updated.closedReason = outcome.closedReason;
      }
    } else if (entry.status === "watch") {
      if (isEntryCandidateEligible(marketItem, activationScore, rankingStat, config)) {
        const entryPlan = buildTrackingEntryPlan(marketItem);
        updated.status = "active";
        updated.startedAt = generatedAt;
        updated.entryPrice = entryPlan.entryPrice;
        updated.highestPrice = Math.max(entryPlan.entryPrice, currentPrice);
        updated.lowestPrice = Math.min(entryPlan.entryPrice, currentPrice);
        updated.invalidationPrice = entryPlan.invalidationPrice;
        updated.targetPrice = entryPlan.targetPrice;
        updated.closedAt = null;
        updated.closedReason = null;
      } else if (!isWatchCandidateEligible(marketItem, activationScore, rankingStat, config) || updated.holdingDays > config.maxWatchDays) {
        updated.status = "closed_timeout";
        updated.closedAt = generatedAt;
        updated.closedReason = !isWatchCandidateEligible(marketItem, activationScore, rankingStat, config) ? "감시 기준 이탈" : "감시 기간 종료";
      } else if (
        updated.holdingDays >= config.forceEntryMinHoldingDays &&
        (rankingStat?.latestRank ?? Number.POSITIVE_INFINITY) <= config.forceEntryMaxRank &&
        marketItem.currentPrice > marketItem.invalidationPrice
      ) {
        updated.status = "active";
        updated.closedAt = null;
        updated.closedReason = null;
      }
    }

    entries.push(updated);

    if (updated.status === "active" || updated.status === "watch") {
      liveTickers.add(updated.ticker);
    } else if (updated.closedAt) {
      latestClosedByTicker.set(updated.ticker, updated);
    }
  }

  const activeEntries = entries.filter((entry) => entry.status === "active");
  const watchEntries = entries.filter((entry) => entry.status === "watch");
  const availableSlots = Math.max(config.maxActive - activeEntries.length, 0);
  const availableWatchSlots = Math.max(config.maxWatch - watchEntries.length - activeEntries.length, 0);

  if (availableWatchSlots > 0) {
    const watchCandidates = candidateEntries
      .map((candidateEntry) => marketByTicker.get(candidateEntry.ticker))
      .filter(Boolean)
      .map((item) => {
        const rankingStat = rankingStats.get(item.ticker);
        const activationScore = roundNumber(buildActivationScore(item, rankingStat), 1) ?? 0;
        const lastClosed = latestClosedByTicker.get(item.ticker);
        const cooldownDays = lastClosed?.closedAt ? diffDays(parseDateOnly(lastClosed.signalDate), parseDateOnly(today)) : null;

        return {
          item,
          activationScore,
          rankingStat,
          inCooldown: cooldownDays !== null && cooldownDays < config.cooldownDays
        };
      })
      .filter(({ item, activationScore, rankingStat, inCooldown }) => {
        if (liveTickers.has(item.ticker) || inCooldown) {
          return false;
        }

        return isWatchCandidateEligible(item, activationScore, rankingStat, config);
      })
      .sort((left, right) => {
        if (right.activationScore !== left.activationScore) {
          return right.activationScore - left.activationScore;
        }

        return (left.rankingStat?.latestRank ?? Number.POSITIVE_INFINITY) - (right.rankingStat?.latestRank ?? Number.POSITIVE_INFINITY);
      })
      .slice(0, availableWatchSlots);

    for (const candidate of watchCandidates) {
      const item = candidate.item;
      const entryPlan = buildTrackingEntryPlan(item);
      entries.push({
        id: `svc-${item.ticker}-${today.replace(/-/g, "")}`,
        ticker: item.ticker,
        company: item.company,
        signalDate: today,
        startedAt: null,
        entryPrice: entryPlan.entryPrice,
        currentPrice: item.currentPrice,
        highestPrice: entryPlan.entryPrice,
        lowestPrice: entryPlan.entryPrice,
        invalidationPrice: entryPlan.invalidationPrice,
        targetPrice: entryPlan.targetPrice,
        entryScore: roundNumber(getMarketScore(item), 1) ?? 0,
        activationScore: candidate.activationScore,
        holdingDays: 1,
        appearances: candidate.rankingStat?.appearances ?? 0,
        latestRank: candidate.rankingStat?.latestRank ?? null,
        status: "watch",
        closedAt: null,
        closedReason: null
      });
      liveTickers.add(item.ticker);
    }
  }

  if (availableSlots > 0) {
    const candidates = entries
      .filter((entry) => entry.status === "watch")
      .map((entry) => {
        const item = marketByTicker.get(entry.ticker);
        const rankingStat = rankingStats.get(entry.ticker);
        const activationScore = item ? roundNumber(buildActivationScore(item, rankingStat), 1) ?? entry.activationScore ?? 0 : entry.activationScore ?? 0;

        return {
          entry,
          item,
          activationScore,
          rankingStat
        };
      })
      .filter(({ item, activationScore, rankingStat }) => item && isEntryCandidateEligible(item, activationScore, rankingStat, config))
      .sort((left, right) => {
        if (right.activationScore !== left.activationScore) {
          return right.activationScore - left.activationScore;
        }

        return (left.rankingStat?.latestRank ?? Number.POSITIVE_INFINITY) - (right.rankingStat?.latestRank ?? Number.POSITIVE_INFINITY);
      })
      .slice(0, availableSlots);

    for (const candidate of candidates) {
      const entryPlan = buildTrackingEntryPlan(candidate.item);
      candidate.entry.status = "active";
      candidate.entry.startedAt = generatedAt;
      candidate.entry.entryPrice = entryPlan.entryPrice;
      candidate.entry.highestPrice = Math.max(entryPlan.entryPrice, candidate.item.currentPrice);
      candidate.entry.lowestPrice = Math.min(entryPlan.entryPrice, candidate.item.currentPrice);
      candidate.entry.invalidationPrice = entryPlan.invalidationPrice;
      candidate.entry.targetPrice = entryPlan.targetPrice;
      candidate.entry.closedAt = null;
      candidate.entry.closedReason = null;
      candidate.entry.activationScore = candidate.activationScore;
    }
  }

  return {
    version: stateVersion,
    generatedAt,
    entries: entries.sort((left, right) => {
      const leftDate = left.closedAt ?? left.startedAt ?? `${left.signalDate}T00:00:00+09:00`;
      const rightDate = right.closedAt ?? right.startedAt ?? `${right.signalDate}T00:00:00+09:00`;
      return rightDate.localeCompare(leftDate);
    })
  };
}

function buildTrackingEventsFromState(state) {
  return {
    asOf: state.generatedAt,
    items: state.entries.map((entry) => {
      if (entry.status === "watch") {
        return {
          historyId: entry.id,
          ticker: entry.ticker,
          company: entry.company,
          signalDate: entry.signalDate,
          entryScore: entry.entryScore,
          status: entry.status,
          mfe: 0,
          mae: 0,
          currentReturn: 0,
          holdingDays: entry.holdingDays
        };
      }

      const mfe = entry.entryPrice > 0 ? roundNumber(((entry.highestPrice - entry.entryPrice) / entry.entryPrice) * 100, 1) ?? 0 : 0;
      const mae = entry.entryPrice > 0 ? roundNumber(((entry.lowestPrice - entry.entryPrice) / entry.entryPrice) * 100, 1) ?? 0 : 0;
      const currentReturn =
        entry.entryPrice > 0 ? roundNumber(((entry.currentPrice - entry.entryPrice) / entry.entryPrice) * 100, 1) ?? 0 : 0;

      return {
        historyId: entry.id,
        ticker: entry.ticker,
        company: entry.company,
        signalDate: entry.signalDate,
        entryScore: entry.entryScore,
        status: entry.status,
        mfe,
        mae,
        currentReturn,
        holdingDays: entry.holdingDays
      };
    })
  };
}

function mapTrackingStateToResult(status) {
  if (status === "watch") {
    return "감시중";
  }
  if (status === "active") {
    return "진행중";
  }
  if (status === "closed_win") {
    return "성공";
  }
  if (status === "closed_loss") {
    return "무효화";
  }
  if (status === "closed_timeout") {
    return "실패";
  }
  return "진행중";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const defaults = getProjectPaths(projectRoot);
  if (options.help) {
    printHelp();
    return;
  }
  const startedAt = new Date().toISOString();

  const [market, news, validation, watchlistDocument, candidateHistoryDocument, currentDailyCandidatesDocument, previousTrackingState] = await Promise.all([
    readJson(options.rawDir, "market-snapshot.json"),
    readJson(options.rawDir, "news-snapshot.json"),
    readOptionalJson(options.rawDir, "validation-snapshot.json", { items: [] }),
    readOptionalJson(path.join(projectRoot, "data", "config"), "watchlist.json", { tickers: [] }),
    readOptionalJson(getRuntimePaths(projectRoot).universeDir, "daily-candidates-history.json", { runs: [] }),
    readOptionalJson(path.dirname(getDailyCandidatesPath()), path.basename(getDailyCandidatesPath()), { topCandidates: [] }),
    readOptionalJson(getRuntimePaths(projectRoot).trackingDir, "service-tracking-state.json", { generatedAt: null, entries: [] })
  ]);

  const generatedAt = market.asOf;
  const newsByTicker = new Map();
  for (const item of news.items) {
    if (!newsByTicker.has(item.ticker)) newsByTicker.set(item.ticker, []);
    newsByTicker.get(item.ticker).push(item);
  }

  const marketByTicker = new Map(market.items.map((item) => [item.ticker, item]));
  const trackingPool = new Map();
  for (const entry of watchlistDocument.tickers ?? []) {
    if (entry?.ticker) {
      trackingPool.set(entry.ticker, entry);
    }
  }
  for (const candidate of currentDailyCandidatesDocument.topCandidates ?? []) {
    if (candidate?.ticker) {
      trackingPool.set(candidate.ticker, {
        ticker: candidate.ticker,
        company: candidate.company ?? marketByTicker.get(candidate.ticker)?.company ?? candidate.ticker,
        note: "daily-top-candidate"
      });
    }
  }

  const trackingState = buildTrackingState({
    generatedAt,
    candidateEntries: Array.from(trackingPool.values()),
    marketByTicker,
    previousState: previousTrackingState,
    rankingStats: buildRankingStats(candidateHistoryDocument.runs ?? [])
  });
  const trackingEvents = buildTrackingEventsFromState(trackingState);
  const validationByTicker = new Map(validation.items.map((item) => [item.ticker, buildMeasuredValidationItem(item)]));
  const validationProfiles = buildValidationProfiles(validation.items, trackingEvents.items, marketByTicker);
  const recommendations = [];
  const analysisItems = [];
  const validationFallbackTickers = [];
  const validationBasisCounts = {
    measured: 0,
    tracking: 0,
    sector: 0,
    pattern: 0,
    heuristic: 0
  };

  for (const item of market.items) {
    const usesEstimatedValidation = !validationByTicker.has(item.ticker);
    const validationItem = validationByTicker.get(item.ticker) ?? buildEstimatedValidationItem(item, validationProfiles);
    if (usesEstimatedValidation) {
      validationFallbackTickers.push(item.ticker);
      console.warn(`Validation data missing for ${item.ticker}; using ${validationItem.basis}.`);
    }

    if (validationItem.basis === "실측 기반") {
      validationBasisCounts.measured += 1;
    } else if (validationItem.basis === "공용 추적 참고") {
      validationBasisCounts.tracking += 1;
    } else if (validationItem.basis === "유사 업종 참고") {
      validationBasisCounts.sector += 1;
    } else if (validationItem.basis === "유사 흐름 참고") {
      validationBasisCounts.pattern += 1;
    } else {
      validationBasisCounts.heuristic += 1;
    }

    const tickerNews = newsByTicker.get(item.ticker) ?? [];
    const topNews = tickerNews[0];
    const coverage = summarizeEventCoverage(tickerNews);
    const technicalIndicators = calculateTechnicalIndicators(item);
    const technicalAdjustment = calculateTechnicalAdjustment(technicalIndicators, item);
    const baseScore = getSwingBaseScore(item);
    const score = clamp(roundNumber(baseScore + technicalAdjustment, 1) ?? baseScore, 0, 100);
    const invalidationDistance = Number((((item.invalidationPrice - item.currentPrice) / item.currentPrice) * 100).toFixed(1));
    const signalTone = resolveSignalTone(score, invalidationDistance, validationItem.hitRate);
    const label = resolveSignalLabel(score, signalTone);
    const quality = buildQualityValue(item, coverage, validationItem);
    const marketQuality = buildMarketDataQuality(item);

    recommendations.push({
      ticker: item.ticker,
      company: item.company,
      sector: item.sector,
      signalTone,
      score,
      signalLabel: label,
      rationale: buildRationale(item, topNews, coverage),
      invalidation: buildInvalidation(item),
      invalidationDistance,
      riskRewardRatio: score >= 22 ? "1 : 2.2" : score >= 14 ? "1 : 1.5" : "1 : 0.9",
      validationSummary: validationItem.validationSummary,
      validationBasis: validationItem.basis,
      checkpoints: buildCheckpoints(item),
      validation: {
        hitRate: validationItem.hitRate,
        avgReturn: validationItem.avgReturn,
        sampleSize: validationItem.sampleSize,
        maxDrawdown: validationItem.maxDrawdown
      },
      observationWindow: validationItem.observationWindow,
      updatedAt: generatedAt.replace("T", " ").slice(0, 16)
    });

    analysisItems.push({
      ticker: item.ticker,
      company: item.company,
      signalTone,
      score,
      headline: `${item.company} 관찰 신호는 ${label} 관점에서 해석합니다.`,
      invalidation: buildInvalidation(item),
      analysisSummary: buildAnalysisSummary(item, quality),
      keyLevels: buildKeyLevels(item),
      technicalIndicators,
      chartSeries: buildChartSeries(item),
      decisionNotes: buildDecisionNotes(item, validationItem, topNews, coverage),
      scoreBreakdown: [
        { label: "추세", score: item.trendScore, description: "중기 추세 구조 점검" },
        { label: "수급", score: item.flowScore, description: "거래량 / 회전 흐름" },
        { label: "변동성", score: item.volatilityScore, description: "무효화 거리 기준" },
        { label: "이벤트", score: item.eventScore, description: "기사 / 공시 / 큐레이션 반영" },
        { label: "품질", score: item.qualityScore, description: "데이터 정합성" },
        { label: "기술", score: technicalAdjustment, description: "이동평균 / RSI / MACD / 거래량 반영" }
      ],
      scenarios: buildScenarios(item),
      riskChecklist: [
        { label: "무효화 거리", status: riskStatusForChecklist(item.riskStatus), note: `${formatPercent(invalidationDistance)} 기준` },
        { label: "이벤트 리스크", status: riskStatusForChecklist(item.eventRiskStatus), note: `공시 ${coverage.disclosure}건 / 큐레이션 ${coverage.curated}건 / 기사 ${coverage.externalNews}건` },
        { label: "과열 여부", status: riskStatusForChecklist(item.heatStatus), note: "가격 / 회전 점검" }
      ],
      newsImpact: tickerNews.map((entry) => ({
        headline: entry.headline,
        impact: entry.impact,
        summary: entry.summary,
        source: entry.source ?? "external",
        url: entry.url ?? "",
        date: entry.date,
        eventType: entry.eventType ?? "news"
      })),
      dataQuality: [
        { label: "시세", value: marketQuality.value, note: marketQuality.note },
        { label: "이벤트", value: `${tickerNews.length}건`, note: topNews ? topNews.headline : "해당 없음" },
        { label: "커버리지", value: coverage.confidence, note: coverage.note },
        {
          label: "검증",
          value: validationItem.basis,
          note:
            validationItem.basis === "실측 기반"
              ? `비슷한 흐름 ${validationItem.sampleSize}건 기준으로 정리한 값입니다.`
              : validationItem.validationSummary
        },
        { label: "품질", value: quality, note: buildQualityDataNote(item) },
        {
          label: "보조지표",
          value: technicalIndicators.rsi14 !== null ? `RSI ${technicalIndicators.rsi14}` : "계산 중",
          note: buildTechnicalNotes(technicalIndicators).join(" ") || "가격 이력 기반 계산"
        }
      ]
    });
  }

  recommendations.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.company.localeCompare(right.company, "ko");
  });

  analysisItems.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.company.localeCompare(right.company, "ko");
  });

  const recommendationByTicker = new Map(recommendations.map((item) => [item.ticker, item]));

  const trackingStateById = new Map(trackingState.entries.map((entry) => [entry.id, entry]));

  const trackingHistory = trackingEvents.items.map((item) => {
    const marketItem = marketByTicker.get(item.ticker);
    const recommendation = recommendationByTicker.get(item.ticker);
    const stateEntry = trackingStateById.get(item.historyId);

    return {
      id: item.historyId,
      ticker: item.ticker,
      company: marketItem?.company ?? item.company ?? item.ticker,
      signalDate: item.signalDate,
      startedAt: stateEntry?.startedAt ?? null,
      closedAt: stateEntry?.closedAt ?? null,
      closedReason: stateEntry?.closedReason ?? null,
      signalTone: recommendation?.signalTone ?? KO.neutral,
      entryScore: item.entryScore,
      result: mapTrackingStateToResult(stateEntry?.status),
      mfe: item.mfe,
      mae: item.mae,
      currentReturn: item.currentReturn ?? 0,
      holdingDays: item.holdingDays
    };
  });

  const trackingDetails = Object.fromEntries(
    trackingEvents.items.map((item) => {
      const history = trackingHistory.find((entry) => entry.id === item.historyId);
      const recommendation = recommendationByTicker.get(item.ticker);
      const validationItem = validationByTicker.get(item.ticker);
      const tickerNews = newsByTicker.get(item.ticker) ?? [];
      const coverage = summarizeEventCoverage(tickerNews);
      const stateEntry = trackingStateById.get(item.historyId);
      const basePrice = stateEntry?.entryPrice ?? marketByTicker.get(item.ticker)?.currentPrice ?? 100000;

      return [
        item.historyId,
        {
          historyId: item.historyId,
          summary: buildTrackingSummary(history, recommendation, validationItem),
          invalidationReview: buildInvalidationReview(history, recommendation),
          afterActionReview: buildAfterActionReview(history, validationItem),
          reviewChecklist: buildReviewChecklist(history),
          metrics: buildTrackingMetrics(history, coverage),
          chartSnapshot: buildChartSnapshot(history, basePrice),
          historicalNews: buildTrackingNews(tickerNews),
          scoreLog: buildScoreLog(history, recommendation)
        }
      ];
    })
  );

  await mkdir(options.outDir, { recursive: true });
  await mkdir(path.dirname(getServiceTrackingStatePath()), { recursive: true });
  await mkdir(options.rawDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(options.outDir, "recommendations.json"), `${JSON.stringify({ generatedAt, items: recommendations }, null, 2)}\n`, "utf8"),
    writeFile(path.join(options.outDir, "analysis.json"), `${JSON.stringify({ generatedAt, items: analysisItems }, null, 2)}\n`, "utf8"),
    writeFile(path.join(options.outDir, "tracking.json"), `${JSON.stringify({ generatedAt, history: trackingHistory, details: trackingDetails }, null, 2)}\n`, "utf8"),
    writeFile(getServiceTrackingStatePath(), `${JSON.stringify(trackingState, null, 2)}\n`, "utf8"),
    writeFile(getTrackingEventsPath(options.rawDir), `${JSON.stringify(trackingEvents, null, 2)}\n`, "utf8")
  ]);
  await mkdir(path.dirname(getSnapshotGenerationReportPath()), { recursive: true });
  await writeFile(
    getSnapshotGenerationReportPath(),
    `${JSON.stringify(
      {
        startedAt,
        completedAt: new Date().toISOString(),
        generatedAt,
        totalTickers: market.items.length,
        recommendationCount: recommendations.length,
        analysisCount: analysisItems.length,
        trackingHistoryCount: trackingHistory.length,
        validationFallbackCount: validationFallbackTickers.length,
        validationFallbackTickers,
        validationBasisCounts
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  if (path.resolve(options.outDir) === path.resolve(defaults.liveDir)) {
    await writeLiveSnapshotManifest(projectRoot, options.outDir);
  }

  console.log("Snapshot generation completed.");
  console.log(`- recommendations: ${recommendations.length}`);
  console.log(`- analysis: ${analysisItems.length}`);
  console.log(`- tracking history: ${trackingHistory.length}`);
  console.log(`- report: ${getSnapshotGenerationReportPath()}`);
}

main().catch((error) => {
  console.error("Snapshot generation failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
