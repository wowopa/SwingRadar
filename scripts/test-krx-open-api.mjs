import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

function printHelp() {
  console.log(`
SWING-RADAR KRX Open API connectivity test

Usage:
  node scripts/test-krx-open-api.mjs [--market KOSPI|KOSDAQ|ALL] [--bas-dd YYYYMMDD]
`);
}

function parseArgs(argv) {
  const options = {
    market: "ALL",
    basDd: process.env.SWING_RADAR_KRX_API_BAS_DD
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--market") {
      options.market = (argv[index + 1] ?? "ALL").toUpperCase();
      index += 1;
      continue;
    }
    if (arg === "--bas-dd") {
      options.basDd = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

function resolveBasDd(value) {
  if (value) {
    return value;
  }

  const cursor = new Date();
  for (let index = 0; index < 10; index += 1) {
    cursor.setDate(cursor.getDate() - 1);
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) {
      return formatDate(cursor);
    }
  }

  return formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

async function testEndpoint(label, endpoint, basDd, apiKey) {
  const baseUrl = process.env.SWING_RADAR_KRX_API_BASE_URL ?? "https://data-dbg.krx.co.kr/svc/apis";
  const authHeader = process.env.SWING_RADAR_KRX_API_AUTH_HEADER ?? "AUTH_KEY";
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${endpoint}`);
  url.searchParams.set("basDd", basDd);

  const response = await fetch(url, {
    headers: {
      [authHeader]: apiKey,
      "User-Agent": "swing-radar-krx-test/1.0"
    }
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  const count = Array.isArray(parsed?.OutBlock_1) ? parsed.OutBlock_1.length : 0;

  console.log(`[krx-test] ${label}`);
  console.log(`- url: ${url}`);
  console.log(`- status: ${response.status}`);
  console.log(`- rows: ${count}`);
  console.log(`- sample: ${text.slice(0, 180)}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const apiKey = process.env.SWING_RADAR_KRX_API_KEY;
  if (!apiKey) {
    throw new Error("SWING_RADAR_KRX_API_KEY is not configured");
  }

  const basDd = resolveBasDd(options.basDd);
  const endpoints = [];

  if (options.market === "ALL" || options.market === "KOSPI") {
    endpoints.push(["KOSPI", "sto/stk_isu_base_info"]);
  }
  if (options.market === "ALL" || options.market === "KOSDAQ") {
    endpoints.push(["KOSDAQ", "sto/ksq_isu_base_info"]);
  }

  for (const [label, endpoint] of endpoints) {
    await testEndpoint(label, endpoint, basDd, apiKey);
  }
}

main().catch((error) => {
  console.error("[krx-test] failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
