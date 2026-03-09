import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";

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
    : path.join(projectRoot, "data", "ops", "latest-snapshot-generation.json");
}

function resolveProjectPath(configuredPath, fallbackPath) {
  if (!configuredPath) {
    return path.resolve(fallbackPath);
  }

  return path.isAbsolute(configuredPath)
    ? path.resolve(configuredPath)
    : path.resolve(projectRoot, configuredPath);
}

function parseArgs(argv) {
  const options = {
    rawDir: resolveProjectPath(process.env.SWING_RADAR_RAW_DATA_DIR, path.join(projectRoot, "data/raw")),
    outDir: resolveProjectPath(process.env.SWING_RADAR_DATA_DIR, path.join(projectRoot, "data/live"))
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--raw-dir") {
      options.rawDir = resolveProjectPath(argv[index + 1], options.rawDir);
      index += 1;
      continue;
    }
    if (arg === "--out-dir") {
      options.outDir = resolveProjectPath(argv[index + 1], options.outDir);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function readJson(dir, filename) {
  return JSON.parse(await readFile(path.join(dir, filename), "utf8"));
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

function buildFallbackValidationItem(item) {
  const scoreBase = item.trendScore + item.flowScore + item.volatilityScore + item.qualityScore;
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
    observationWindow: resolveObservationWindow(sampleSize, hitRate),
    validationSummary: "검증 표본이 아직 적어 보수적으로 계산한 참고값입니다."
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
  if (score >= 75 && invalidationDistance <= -3 && hitRate >= 55) return KO.positive;
  if (score < 55 || invalidationDistance > -2.5) return KO.caution;
  return KO.neutral;
}

function resolveSignalLabel(score) {
  if (score >= 75) return "흐름이 강한 편";
  if (score >= 55) return "조금 더 확인해볼 만함";
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

function buildChartSeries(item) {
  const closes = item.closes ?? [];
  const volumes = item.volumes ?? [];
  if (!closes.length) {
    return [];
  }

  return closes.slice(-60).map((close, index, series) => {
    const history = series.slice(0, index + 1);
    const sma20 = history.length >= 20 ? average(history.slice(-20)) : null;
    const sma60 = history.length >= 60 ? average(history.slice(-60)) : null;
    const stdDev = history.length >= 20 ? calculateStdDev(history.slice(-20)) : null;
    const bollingerMiddle = sma20;
    const bollingerUpper = bollingerMiddle !== null && stdDev !== null ? bollingerMiddle + stdDev * 2 : null;
    const bollingerLower = bollingerMiddle !== null && stdDev !== null ? bollingerMiddle - stdDev * 2 : null;

    return {
      label: `-${series.length - index - 1}일`,
      close: Math.round(close),
      volume: volumes.length >= closes.length ? Math.round(volumes.slice(-60)[index] ?? 0) : null,
      sma20: roundNumber(sma20, 0),
      sma60: roundNumber(sma60, 0),
      bollingerUpper: roundNumber(bollingerUpper, 0),
      bollingerLower: roundNumber(bollingerLower, 0)
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const startedAt = new Date().toISOString();

  const [market, news, validation, trackingEvents] = await Promise.all([
    readJson(options.rawDir, "market-snapshot.json"),
    readJson(options.rawDir, "news-snapshot.json"),
    readOptionalJson(options.rawDir, "validation-snapshot.json", { items: [] }),
    readOptionalJson(options.rawDir, "tracking-events.json", { items: [] })
  ]);

  const generatedAt = market.asOf;
  const newsByTicker = new Map();
  for (const item of news.items) {
    if (!newsByTicker.has(item.ticker)) newsByTicker.set(item.ticker, []);
    newsByTicker.get(item.ticker).push(item);
  }

  const validationByTicker = new Map(
    validation.items.map((item) => [
      item.ticker,
      {
        ...item,
        observationWindow: resolveObservationWindow(item.sampleSize, item.hitRate),
        validationSummary: buildValidationSummary(item)
      }
    ])
  );

  const marketByTicker = new Map(market.items.map((item) => [item.ticker, item]));
  const recommendations = [];
  const analysisItems = [];
  const validationFallbackTickers = [];

  for (const item of market.items) {
    const usesEstimatedValidation = !validationByTicker.has(item.ticker);
    const validationItem = validationByTicker.get(item.ticker) ?? buildFallbackValidationItem(item);
    if (usesEstimatedValidation) {
      validationFallbackTickers.push(item.ticker);
      console.warn(`Validation data missing for ${item.ticker}; using conservative fallback.`);
    }

    const tickerNews = newsByTicker.get(item.ticker) ?? [];
    const topNews = tickerNews[0];
    const coverage = summarizeEventCoverage(tickerNews);
    const score = item.trendScore + item.flowScore + item.volatilityScore + item.eventScore + item.qualityScore;
    const invalidationDistance = Number((((item.invalidationPrice - item.currentPrice) / item.currentPrice) * 100).toFixed(1));
    const signalTone = resolveSignalTone(score, invalidationDistance, validationItem.hitRate);
    const label = resolveSignalLabel(score);
    const quality = qualityLabel(item);
    const technicalIndicators = calculateTechnicalIndicators(item);

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
      riskRewardRatio: score >= 75 ? "1 : 2.2" : score >= 55 ? "1 : 1.5" : "1 : 0.9",
      validationSummary: validationItem.validationSummary,
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
        { label: "품질", score: item.qualityScore, description: "데이터 정합성" }
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
        { label: "시세", value: "실시간 스냅샷", note: "Yahoo chart API 기준" },
        { label: "이벤트", value: `${tickerNews.length}건`, note: topNews ? topNews.headline : "해당 없음" },
        { label: "커버리지", value: coverage.confidence, note: coverage.note },
        {
          label: "검증",
          value: usesEstimatedValidation ? "참고 계산" : "실측 기반",
          note: usesEstimatedValidation
            ? "비슷한 흐름 표본이 아직 충분하지 않아 보수적으로 계산한 참고값입니다."
            : `비슷한 흐름 ${validationItem.sampleSize}건 기준으로 정리한 값입니다.`
        },
        { label: "품질", value: quality, note: `score ${item.qualityScore}` },
        {
          label: "보조지표",
          value: technicalIndicators.rsi14 !== null ? `RSI ${technicalIndicators.rsi14}` : "계산 중",
          note: buildTechnicalNotes(technicalIndicators).join(" ") || "가격 이력 기반 계산"
        }
      ]
    });
  }

  const recommendationByTicker = new Map(recommendations.map((item) => [item.ticker, item]));

  const trackingHistory = trackingEvents.items.map((item) => {
    const nextResult = resolveTrackingResult(item);
    const marketItem = marketByTicker.get(item.ticker);
    const recommendation = recommendationByTicker.get(item.ticker);

    return {
      id: item.historyId,
      ticker: item.ticker,
      company: marketItem?.company ?? item.company ?? item.ticker,
      signalDate: item.signalDate,
      signalTone: recommendation?.signalTone ?? KO.neutral,
      entryScore: item.entryScore,
      result: nextResult,
      mfe: item.mfe,
      mae: item.mae,
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
      const basePrice = marketByTicker.get(item.ticker)?.currentPrice ?? 100000;

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
  await Promise.all([
    writeFile(path.join(options.outDir, "recommendations.json"), `${JSON.stringify({ generatedAt, items: recommendations }, null, 2)}\n`, "utf8"),
    writeFile(path.join(options.outDir, "analysis.json"), `${JSON.stringify({ generatedAt, items: analysisItems }, null, 2)}\n`, "utf8"),
    writeFile(path.join(options.outDir, "tracking.json"), `${JSON.stringify({ generatedAt, history: trackingHistory, details: trackingDetails }, null, 2)}\n`, "utf8")
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
        validationFallbackTickers
      },
      null,
      2
    )}\n`,
    "utf8"
  );

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
