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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatPercent(value) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function resolveObservationWindow(sampleSize, hitRate) {
  if (sampleSize >= 35) return "5~15거래일";
  if (sampleSize >= 24 || hitRate >= 55) return "3~10거래일";
  return "1~7거래일";
}

function buildValidationSummary(item) {
  const tone =
    item.hitRate >= 58 && item.avgReturn > 0
      ? "유사 구조에서 추세 지속 확률이 상대적으로 높게 확인됩니다."
      : item.hitRate >= 48 && item.avgReturn >= 0
        ? "확인형 진입에서 성과가 우세했지만 무효화 관리가 중요합니다."
        : "사후 성과 분산이 커서 보수적 추적 해석이 필요합니다.";

  return `검증 표본 ${item.sampleSize}건 기준 hitRate ${item.hitRate}%, 평균 수익 ${formatPercent(item.avgReturn)}, 최대 역행 ${formatPercent(item.maxDrawdown)}입니다. ${tone}`;
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
  if (score >= 75) return "개입 신호 구조 강함";
  if (score >= 55) return "확인 후 추적 가능";
  return "관찰 신호 유지";
}

function buildCheckpoints(item) {
  return [
    `${item.invalidationPrice.toLocaleString()}원 하단 방어 확인`,
    `${item.confirmationPrice.toLocaleString()}원 돌파 유무 확인`,
    `${item.expansionPrice.toLocaleString()}원 확장 구간 대응`
  ];
}

function buildRationale(item, topNews, coverage) {
  const newsText = topNews
    ? `상위 이벤트 '${topNews.headline}'가 반영됩니다.`
    : "외부 기사 커버리지는 제한적입니다.";
  const coverageText = `이벤트 커버리지는 ${coverage.confidence}으로 평가됩니다.`;
  return `${item.company} 관찰 신호는 추세 ${item.trendScore}점, 수급 ${item.flowScore}점, 변동성 ${item.volatilityScore}점을 기반으로 구성됩니다. ${newsText} ${coverageText}`;
}

function buildInvalidation(item) {
  return `${item.invalidationPrice.toLocaleString()}원 하회 시 관찰 가설을 재평가합니다.`;
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
    { label: "무효화", price: `${item.invalidationPrice.toLocaleString()}원`, meaning: "관찰 가설 재점검 구간" },
    { label: "확인", price: `${item.confirmationPrice.toLocaleString()}원`, meaning: "추가 돌파 확인 구간" },
    { label: "확장", price: `${item.expansionPrice.toLocaleString()}원`, meaning: "상단 확장 구간" }
  ];
}

function buildDecisionNotes(item, validationItem, topNews, coverage) {
  return [
    `검증 hitRate ${validationItem.hitRate}% / avgReturn ${formatPercent(validationItem.avgReturn)} 기준으로 해석합니다.`,
    `무효화 거리는 ${item.invalidationPrice.toLocaleString()}원 기준으로 관리합니다.`,
    topNews ? `상위 이벤트: ${topNews.headline}` : "이벤트 커버리지가 적어 가격과 무효화 기준 비중을 높여 해석합니다.",
    `커버리지 평가: ${coverage.confidence} | 공시 ${coverage.disclosure}건 / 큐레이션 ${coverage.curated}건 / 외부기사 ${coverage.externalNews}건`
  ];
}

function buildScenarios(item) {
  return [
    {
      label: KO.basic,
      probability: clamp(45 + Math.round(item.trendScore / 2), 35, 65),
      expectation: "현 구조 유지 가정",
      trigger: `${item.confirmationPrice.toLocaleString()}원 안착 여부`
    },
    {
      label: KO.bull,
      probability: clamp(15 + Math.round(item.flowScore / 2), 15, 30),
      expectation: "확장 구간 시도",
      trigger: `${item.expansionPrice.toLocaleString()}원 돌파`
    },
    {
      label: KO.bear,
      probability: clamp(100 - (45 + Math.round(item.trendScore / 2)) - (15 + Math.round(item.flowScore / 2)), 15, 40),
      expectation: "무효화 구간 접근",
      trigger: `${item.invalidationPrice.toLocaleString()}원 하회`
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
  return `${company} 관찰 신호는 진입 점수 ${item.entryScore}점에서 시작했고, 현재 MFE ${formatPercent(item.mfe)}, MAE ${formatPercent(item.mae)}를 기록했습니다. 검증 hitRate ${hitRate}% 기준으로는 ${item.result === "성공" ? "기본 시나리오 이상" : item.result === "진행중" ? "관찰 시나리오 진행" : "보수적 재평가"} 구간으로 해석합니다.`;
}

function buildInvalidationReview(item, recommendation) {
  const invalidation = recommendation?.invalidation ?? "무효화 기준";
  if (item.result === "무효화") {
    return `${invalidation} 기준이 훼손되어 관찰 가설을 종료했습니다. 이후 동일 구조 재진입 여부는 별도 확인이 필요합니다.`;
  }
  if (item.mae <= -3.5) {
    return "무효화 가격 인근까지 되돌림이 있었으나 아직 기준은 유지 중입니다. 재진입보다는 방어력 확인이 우선입니다.";
  }
  return "무효화 기준은 아직 유지되고 있습니다. 다만 단기 과열 여부와 거래대금 둔화는 계속 점검해야 합니다.";
}

function buildAfterActionReview(item, validationItem) {
  const avgReturn = validationItem?.avgReturn ?? 0;
  if (item.result === "성공") {
    return `사후 성과는 평균 검증치 ${formatPercent(avgReturn)}를 상회했습니다. 추세 지속형 패턴이 유효했던 케이스로 분류할 수 있습니다.`;
  }
  if (item.result === "진행중") {
    return "아직 결론을 내리기보다 경로를 관찰해야 하는 상태입니다. MFE/MAE 비율은 양호하지만 확장 구간 확인이 더 필요합니다.";
  }
  if (item.result === "무효화") {
    return "관찰 신호 자체보다 무효화 거리와 이벤트 민감도가 더 크게 작용했습니다. 이후에는 초기 손익비 검증을 더 엄격하게 볼 필요가 있습니다.";
  }
  return "사후 성과가 검증 평균을 밑돌았습니다. 진입 전 확인 단계와 거래대금 동반 여부를 더 엄격히 요구하는 편이 안전합니다.";
}

function buildReviewChecklist(item) {
  return [
    `초기 ${Math.abs(item.mae).toFixed(1)}% 역행 구간에서 무효화 방어가 유지됐는지 확인`,
    `${item.holdingDays}거래일 동안 거래대금과 추세가 신호 방향과 동행했는지 확인`,
    `MFE ${formatPercent(item.mfe)} 대비 MAE ${formatPercent(item.mae)}가 허용 범위인지 복기`
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
    { label: "사후 판정", value: outcome, note: `결과 ${item.result}` },
    { label: "경로 효율", value: efficiency, note: `MFE ${formatPercent(item.mfe)} / MAE ${formatPercent(item.mae)}` },
    { label: "이벤트 커버리지", value: eventFlow, note: `공시 ${coverage.disclosure}건 / 큐레이션 ${coverage.curated}건 / 기사 ${coverage.externalNews}건` }
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

  const [market, news, validation, trackingEvents] = await Promise.all([
    readJson(options.rawDir, "market-snapshot.json"),
    readJson(options.rawDir, "news-snapshot.json"),
    readJson(options.rawDir, "validation-snapshot.json"),
    readJson(options.rawDir, "tracking-events.json")
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

  for (const item of market.items) {
    const validationItem = validationByTicker.get(item.ticker);
    if (!validationItem) {
      throw new Error(`Missing validation data for ${item.ticker}`);
    }

    const tickerNews = newsByTicker.get(item.ticker) ?? [];
    const topNews = tickerNews[0];
    const coverage = summarizeEventCoverage(tickerNews);
    const score = item.trendScore + item.flowScore + item.volatilityScore + item.eventScore + item.qualityScore;
    const invalidationDistance = Number((((item.invalidationPrice - item.currentPrice) / item.currentPrice) * 100).toFixed(1));
    const signalTone = resolveSignalTone(score, invalidationDistance, validationItem.hitRate);
    const label = resolveSignalLabel(score);
    const quality = qualityLabel(item);

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
        { label: "품질", value: quality, note: `score ${item.qualityScore}` }
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

  console.log("Snapshot generation completed.");
  console.log(`- recommendations: ${recommendations.length}`);
  console.log(`- analysis: ${analysisItems.length}`);
  console.log(`- tracking history: ${trackingHistory.length}`);
}

main().catch((error) => {
  console.error("Snapshot generation failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
