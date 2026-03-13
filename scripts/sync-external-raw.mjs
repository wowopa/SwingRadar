import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

import { loadLocalEnv } from "./load-env.mjs";
import { clamp, getProjectPaths, parseArgs, readJson, writeJson } from "./lib/external-source-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const { Client } = pg;

loadLocalEnv(projectRoot);

const KO = {
  positive: "\uAE0D\uC815",
  neutral: "\uC911\uB9BD",
  caution: "\uC8FC\uC758",
  good: "\uC591\uD638",
  review: "\uD655\uC778 \uD544\uC694"
};

const EVENT_WEIGHTS = {
  earnings: 2.2,
  "treasury-stock": 2.4,
  contract: 2.1,
  "clinical-approval": 2.2,
  governance: 0.8,
  "general-disclosure": 0.6,
  news: 0.9,
  "curated-news": 1.4,
  inquiry: -1.6,
  "capital-raise": -2.2,
  risk: -2.5
};

const SOURCE_WEIGHTS = {
  dart: 1.25,
  curated: 1.15,
  naver: 1,
  gnews: 0.95,
  external: 0.9
};

function printHelp() {
  console.log(`
SWING-RADAR external raw sync

Usage:
  node scripts/sync-external-raw.mjs [--market-file <path>] [--news-file <path>]

This script converts external market/news payloads into data/raw/market-snapshot.json
and data/raw/news-snapshot.json so the existing snapshot generator can continue to run.
`);
}

async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

function getAdminDir() {
  return process.env.SWING_RADAR_EDITORIAL_DIR
    ? path.resolve(process.env.SWING_RADAR_EDITORIAL_DIR)
    : path.resolve(projectRoot, "data/admin");
}

function getImpactWeight(item) {
  if (item.impact === KO.positive) {
    return 1;
  }

  if (item.impact === KO.caution) {
    return -1;
  }

  return 0.35;
}

function getSourceWeight(item) {
  return SOURCE_WEIGHTS[item.source] ?? 1;
}

function getEventWeight(item) {
  return EVENT_WEIGHTS[item.eventType] ?? 0.8;
}

function scoreEvent(newsItems) {
  if (!newsItems.length) {
    return { score: 8, eventRiskStatus: KO.good };
  }

  const weightedSignal = newsItems.reduce((sum, item) => {
    return sum + getImpactWeight(item) * getEventWeight(item) * getSourceWeight(item);
  }, 0);

  const cautionWeight = newsItems
    .filter((item) => item.impact === KO.caution)
    .reduce((sum, item) => sum + Math.abs(getEventWeight(item) * getSourceWeight(item)), 0);

  const positiveWeight = newsItems
    .filter((item) => item.impact === KO.positive)
    .reduce((sum, item) => sum + getEventWeight(item) * getSourceWeight(item), 0);

  const score = clamp(Math.round((8 + weightedSignal) * 10) / 10, 4, 15);
  const eventRiskStatus = cautionWeight >= positiveWeight && cautionWeight >= 2
    ? KO.caution
    : cautionWeight > 0
      ? KO.review
      : KO.good;

  return { score, eventRiskStatus };
}

function buildCuratedNewsItems(document) {
  return (document?.items ?? []).map((item) => ({
    ticker: item.ticker,
    headline: item.headline,
    impact: item.impact,
    summary: item.operatorNote
      ? `[\uC6B4\uC601\uC790 \uD050\uB808\uC774\uC158] ${item.summary} | ${item.operatorNote}`
      : `[\uC6B4\uC601\uC790 \uD050\uB808\uC774\uC158] ${item.summary}`,
    date: item.date,
    source: item.source || "curated",
    url: item.url,
    eventType: item.eventType ?? "curated-news"
  }));
}

function dedupeNewsItems(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.ticker}|${item.headline}|${item.date}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildDisclosureNewsItems(payload) {
  return (payload?.items ?? []).map((item) => ({
    ticker: item.ticker,
    headline: `[\uACF5\uC2DC] ${item.headline}`,
    impact: item.impact,
    summary: item.summary,
    date: item.date,
    source: item.source ?? "dart",
    url: item.url,
    eventType: item.eventType ?? "general-disclosure"
  }));
}

async function persistRuntimeDocuments(documents) {
  if (!process.env.SWING_RADAR_DATABASE_URL) {
    return;
  }

  const client = new Client({
    connectionString: process.env.SWING_RADAR_DATABASE_URL,
    ssl: process.env.SWING_RADAR_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    await client.query(`
      create table if not exists runtime_documents (
        name text primary key,
        payload jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);

    for (const [name, payload] of Object.entries(documents)) {
      await client.query(
        `
        insert into runtime_documents (name, payload, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (name)
        do update set payload = excluded.payload, updated_at = now()
        `,
        [name, JSON.stringify(payload)]
      );
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const paths = getProjectPaths(projectRoot);
  const args = parseArgs(process.argv.slice(2), {
    marketFile: path.join(paths.rawDir, "external-market.json"),
    newsFile: path.join(paths.rawDir, "external-news.json"),
    disclosureFile: path.join(paths.rawDir, "external-disclosures.json")
  });

  if (args.help) {
    printHelp();
    return;
  }

  const market = await readOptionalJson(path.resolve(args.marketFile));
  const news = await readOptionalJson(path.resolve(args.newsFile));
  const disclosures = await readOptionalJson(path.resolve(args.disclosureFile));
  const curatedNews = await readOptionalJson(path.join(getAdminDir(), "news-curation.json"));

  if (!market?.items?.length) {
    throw new Error("No market items available for raw sync.");
  }

  const mergedNewsItems = dedupeNewsItems([
    ...buildCuratedNewsItems(curatedNews),
    ...buildDisclosureNewsItems(disclosures),
    ...(news.items ?? [])
  ]);
  const newsByTicker = new Map();

  for (const item of mergedNewsItems) {
    if (!newsByTicker.has(item.ticker)) {
      newsByTicker.set(item.ticker, []);
    }

    newsByTicker.get(item.ticker).push(item);
  }

  const marketSnapshot = {
    asOf: market.asOf,
    items: (market.items ?? []).map((item) => {
      const tickerNews = newsByTicker.get(item.ticker) ?? [];
      const event = scoreEvent(tickerNews);

      return {
        ticker: item.ticker,
        company: item.company,
        sector: item.sector,
        currentPrice: item.currentPrice,
        invalidationPrice: item.invalidationPrice,
        confirmationPrice: item.confirmationPrice,
        expansionPrice: item.expansionPrice,
        entryPrice: item.entryPrice,
        signalDate: item.signalDate,
        trendScore: item.trendScore,
        flowScore: item.flowScore,
        volatilityScore: item.volatilityScore,
        eventScore: event.score,
        qualityScore: item.qualityScore,
        averageVolume20: item.averageVolume20,
        latestVolume: item.latestVolume,
        averageTurnover20: item.averageTurnover20,
        latestTurnover: item.latestTurnover,
        momentumPercent: item.momentumPercent,
        riskStatus: item.riskStatus,
        eventRiskStatus: event.eventRiskStatus,
        heatStatus: item.heatStatus,
        closes: item.closes ?? [],
        volumes: item.volumes ?? [],
        history: item.history ?? []
      };
    })
  };

  const newsSnapshot = {
    asOf: news?.asOf ?? market.asOf,
    items: mergedNewsItems.map((item) => ({
      ticker: item.ticker,
      headline: item.headline,
      impact: item.impact,
      summary: item.summary,
      date: item.date,
      source: item.source ?? "external",
      url: item.url ?? "",
      eventType: item.eventType ?? "news"
    }))
  };

  await writeJson(path.join(paths.rawDir, "market-snapshot.json"), marketSnapshot);
  await writeJson(path.join(paths.rawDir, "news-snapshot.json"), newsSnapshot);
  await persistRuntimeDocuments({
    "market-snapshot": marketSnapshot,
    "news-snapshot": newsSnapshot
  });

  console.log("External raw sync completed.");
  console.log(`- market items: ${marketSnapshot.items.length}`);
  console.log(`- news items: ${newsSnapshot.items.length}`);
}

main().catch((error) => {
  console.error("External raw sync failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
