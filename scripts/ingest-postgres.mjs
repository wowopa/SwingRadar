import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

import { loadLocalEnv } from "./load-env.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR Postgres ingest

Usage:
  node scripts/ingest-postgres.mjs [--apply-schema] [--data-dir <path>]

Options:
  --apply-schema       Apply db/postgres-schema.sql before ingest
  --data-dir <path>    Override SWING_RADAR_DATA_DIR or default data/live
  --help               Show this message
`);
}

function parseArgs(argv) {
  const options = {
    applySchema: false,
    dataDir: process.env.SWING_RADAR_DATA_DIR
      ? path.resolve(process.env.SWING_RADAR_DATA_DIR)
      : path.resolve(projectRoot, "data/live")
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "--apply-schema") {
      options.applySchema = true;
      continue;
    }

    if (arg === "--data-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--data-dir requires a value");
      }
      options.dataDir = path.resolve(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function readJson(dataDir, filename) {
  const fullPath = path.join(dataDir, filename);
  const content = await readFile(fullPath, "utf8");
  return JSON.parse(content);
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

async function applySchema(client) {
  const sql = await readFile(path.join(projectRoot, "db/postgres-schema.sql"), "utf8");
  await client.query(sql);
}

async function ingestRecommendations(client, payload) {
  assertArray(payload.items, "recommendations.items");

  for (const item of payload.items) {
    await client.query(
      `
      insert into recommendation_snapshots (generated_at, ticker, payload)
      values ($1, $2, $3::jsonb)
      on conflict (generated_at, ticker)
      do update set payload = excluded.payload
      `,
      [payload.generatedAt, item.ticker, JSON.stringify(item)]
    );
  }

  return payload.items.length;
}

async function ingestAnalysis(client, payload) {
  assertArray(payload.items, "analysis.items");

  for (const item of payload.items) {
    await client.query(
      `
      insert into analysis_snapshots (generated_at, ticker, payload)
      values ($1, $2, $3::jsonb)
      on conflict (generated_at, ticker)
      do update set payload = excluded.payload
      `,
      [payload.generatedAt, item.ticker, JSON.stringify(item)]
    );
  }

  return payload.items.length;
}

async function ingestTracking(client, payload) {
  assertArray(payload.history, "tracking.history");
  assertObject(payload.details, "tracking.details");

  await client.query(
    `
    insert into tracking_snapshots (generated_at, history, details)
    values ($1, $2::jsonb, $3::jsonb)
    on conflict (generated_at)
    do update set history = excluded.history, details = excluded.details
    `,
    [payload.generatedAt, JSON.stringify(payload.history), JSON.stringify(payload.details)]
  );

  return payload.history.length;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const connectionString = process.env.SWING_RADAR_DATABASE_URL;
  if (!connectionString) {
    throw new Error("SWING_RADAR_DATABASE_URL is required");
  }

  const [recommendations, analysis, tracking] = await Promise.all([
    readJson(options.dataDir, "recommendations.json"),
    readJson(options.dataDir, "analysis.json"),
    readJson(options.dataDir, "tracking.json")
  ]);

  const client = new Client({
    connectionString,
    ssl: process.env.SWING_RADAR_DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();

  try {
    await client.query("begin");

    if (options.applySchema) {
      await applySchema(client);
    }

    const recommendationCount = await ingestRecommendations(client, recommendations);
    const analysisCount = await ingestAnalysis(client, analysis);
    const trackingCount = await ingestTracking(client, tracking);

    await client.query("commit");

    console.log(`Ingest completed.`);
    console.log(`- dataDir: ${options.dataDir}`);
    console.log(`- recommendations: ${recommendationCount}`);
    console.log(`- analysis: ${analysisCount}`);
    console.log(`- tracking history rows: ${trackingCount}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Ingest failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});