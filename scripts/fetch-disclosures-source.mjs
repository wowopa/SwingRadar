import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./load-env.mjs";
import { fetchJson, getProjectPaths, loadWatchlist, parseArgs, readJson, writeJson } from "./lib/external-source-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadLocalEnv(projectRoot);

const KO = {
  positive: "\uAE0D\uC815",
  neutral: "\uC911\uB9BD",
  caution: "\uC8FC\uC758"
};

function printHelp() {
  console.log(`
SWING-RADAR external disclosure fetch

Usage:
  node scripts/fetch-disclosures-source.mjs [--out-file <path>] [--cache-file <path>]

Environment:
  SWING_RADAR_DISCLOSURE_PROVIDER=dart | file
  SWING_RADAR_DART_API_KEY=<api-key>
  SWING_RADAR_DISCLOSURE_LOOKBACK_DAYS=21
  SWING_RADAR_DISCLOSURE_MAX_ITEMS=5
`);
}

async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return { items: [] };
  }
}

function todayString() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function classifyDisclosure(reportName) {
  const text = reportName.trim();

  if (/(조회공시|조회공시요구|풍문|보도해명|불성실공시)/i.test(text)) {
    return {
      impact: KO.caution,
      eventType: "inquiry",
      summaryLabel: "\uACF5\uC2DC \uD655\uC778 \uD544\uC694"
    };
  }

  if (/(유상증자|무상증자|전환사채|신주인수권부사채|교환사채|주식관련사채|CB|BW|EB|감자|주식분할|합병|분할|회사분할)/i.test(text)) {
    return {
      impact: KO.caution,
      eventType: "capital-raise",
      summaryLabel: "\uC790\uBCF8 \uAD6C\uC870 \uBCC0\uD654"
    };
  }

  if (/(소송|가처분|영업정지|회생절차|파산|부도|횡령|배임|검찰|조사|리콜|자진정정|정정신고서|매출액.*정정|영업이익.*정정)/i.test(text)) {
    return {
      impact: KO.caution,
      eventType: "risk",
      summaryLabel: "\uB9AC\uC2A4\uD06C \uACF5\uC2DC"
    };
  }

  if (/(자기주식|자사주|취득결정|취득 신탁계약|소각결정|주주환원|배당결정|현금ㆍ현물배당|주식배당)/i.test(text)) {
    return {
      impact: KO.positive,
      eventType: "treasury-stock",
      summaryLabel: "\uC8FC\uC8FC\uD658\uC6D0 \uACF5\uC2DC"
    };
  }

  if (/(단일판매|공급계약|계약체결|수주|납품|MOU|업무협약|파트너십|기술이전|라이선스)/i.test(text)) {
    return {
      impact: KO.positive,
      eventType: "contract",
      summaryLabel: "\uACC4\uC57D \uBC0F \uC218\uC8FC \uACF5\uC2DC"
    };
  }

  if (/(잠정실적|실적|매출액|영업이익|당기순이익|분기보고서|반기보고서|사업보고서|감사보고서)/i.test(text)) {
    return {
      impact: KO.positive,
      eventType: "earnings",
      summaryLabel: "\uC2E4\uC801 \uAD00\uB828 \uACF5\uC2DC"
    };
  }

  if (/(임상|품목허가|허가신청|승인|FDA|EMA|IND|NDA|임상시험|치료제|신약|바이오)/i.test(text)) {
    return {
      impact: KO.positive,
      eventType: "clinical-approval",
      summaryLabel: "\uC784\uC0C1 \uBC0F \uD5C8\uAC00 \uACF5\uC2DC"
    };
  }

  if (/(대표이사|최대주주|임원|사외이사|지배구조|정관변경|주주총회|이사회|감사선임)/i.test(text)) {
    return {
      impact: KO.neutral,
      eventType: "governance",
      summaryLabel: "\uC9C0\uBC30\uAD6C\uC870 \uACF5\uC2DC"
    };
  }

  return {
    impact: KO.neutral,
    eventType: "general-disclosure",
    summaryLabel: "\uC77C\uBC18 \uACF5\uC2DC"
  };
}

function buildDisclosureUrl(receiptNo) {
  return `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receiptNo}`;
}

async function fetchDartDisclosures(entry, maxItems) {
  const apiKey = process.env.SWING_RADAR_DART_API_KEY;
  if (!apiKey) {
    throw new Error("SWING_RADAR_DART_API_KEY is required for DART provider");
  }

  if (!entry.dartCorpCode) {
    return [];
  }

  const lookbackDays = Number(process.env.SWING_RADAR_DISCLOSURE_LOOKBACK_DAYS ?? "21");
  const endpoint = new URL("https://opendart.fss.or.kr/api/list.json");
  endpoint.searchParams.set("crtfc_key", apiKey);
  endpoint.searchParams.set("corp_code", entry.dartCorpCode);
  endpoint.searchParams.set("bgn_de", dateDaysAgo(lookbackDays));
  endpoint.searchParams.set("end_de", todayString());
  endpoint.searchParams.set("last_reprt_at", "Y");
  endpoint.searchParams.set("page_count", String(Math.max(maxItems * 3, 15)));

  const payload = await fetchJson(endpoint.toString(), {
    headers: {
      "User-Agent": "SWING-RADAR/0.1"
    }
  });

  if (payload.status === "013") {
    return [];
  }

  if (payload.status !== "000") {
    throw new Error(`DART responded with status ${payload.status}: ${payload.message ?? "unknown error"}`);
  }

  return (payload.list ?? [])
    .map((item) => {
      const classification = classifyDisclosure(item.report_nm);
      const date = `${item.rcept_dt.slice(0, 4)}-${item.rcept_dt.slice(4, 6)}-${item.rcept_dt.slice(6, 8)}`;

      return {
        ticker: entry.ticker,
        company: entry.company,
        headline: item.report_nm,
        summary: `${item.corp_name} ${classification.summaryLabel} | ${item.flr_nm} 제출`,
        source: "dart",
        url: buildDisclosureUrl(item.rcept_no),
        date,
        impact: classification.impact,
        eventType: classification.eventType,
        watchlistSourceTags: entry.watchlistSourceTags ?? [],
        watchlistSourceDetails: entry.watchlistSourceDetails ?? []
      };
    })
    .slice(0, maxItems);
}

function loadCacheDisclosures(cache, ticker, maxItems) {
  return (cache.items ?? []).filter((item) => item.ticker === ticker).slice(0, maxItems);
}

async function loadFileDisclosures(paths, ticker, maxItems) {
  const payload = await readOptionalJson(path.join(paths.rawDir, "external-disclosures.json"));
  return (payload.items ?? []).filter((item) => item.ticker === ticker).slice(0, maxItems);
}

function resolveProviderOrder() {
  const requested = process.env.SWING_RADAR_DISCLOSURE_PROVIDER?.toLowerCase();
  if (requested === "file") {
    return ["file"];
  }

  return ["dart", "file"];
}

async function fetchFromProvider(provider, entry, maxItems, paths, cache) {
  const annotate = (items) =>
    items.map((item) => ({
      ...item,
      watchlistSourceTags: entry.watchlistSourceTags ?? item.watchlistSourceTags ?? [],
      watchlistSourceDetails: entry.watchlistSourceDetails ?? item.watchlistSourceDetails ?? []
    }));

  if (provider === "dart") {
    return annotate(await fetchDartDisclosures(entry, maxItems));
  }

  const cached = loadCacheDisclosures(cache, entry.ticker, maxItems);
  if (cached.length) {
    return annotate(cached);
  }

  return annotate(await loadFileDisclosures(paths, entry.ticker, maxItems));
}

async function main() {
  const paths = getProjectPaths(projectRoot);
  const args = parseArgs(process.argv.slice(2), {
    outFile: path.join(paths.rawDir, "external-disclosures.json"),
    cacheFile: path.join(paths.rawDir, "external-disclosures-cache.json")
  });

  if (args.help) {
    printHelp();
    return;
  }

  const watchlist = await loadWatchlist(paths.configDir);
  const maxItems = Number(process.env.SWING_RADAR_DISCLOSURE_MAX_ITEMS ?? "5");
  const cache = await readOptionalJson(path.resolve(args.cacheFile));
  const providerOrder = resolveProviderOrder();
  const items = [];
  let providerUsed = "file";
  let anyLiveFetch = false;

  for (const entry of watchlist) {
    let fetched = [];

    for (const provider of providerOrder) {
      try {
        fetched = await fetchFromProvider(provider, entry, maxItems, paths, cache);
        if (fetched.length) {
          providerUsed = provider;
          anyLiveFetch = anyLiveFetch || provider === "dart";
          break;
        }
      } catch (error) {
        console.warn(`Disclosure fetch failed for ${entry.ticker} via ${provider}: ${error instanceof Error ? error.message : error}`);
      }
    }

    items.push(...fetched.slice(0, maxItems));
  }

  const output = {
    asOf: new Date().toISOString(),
    provider: anyLiveFetch ? providerUsed : "file",
    items
  };

  if (anyLiveFetch) {
    await writeJson(path.resolve(args.cacheFile), output);
  }

  await writeJson(path.resolve(args.outFile), output);

  console.log("External disclosure fetch completed.");
  console.log(`- provider: ${output.provider}`);
  console.log(`- items: ${output.items.length}`);
  console.log(`- outFile: ${path.resolve(args.outFile)}`);
}

main().catch((error) => {
  console.error("External disclosure fetch failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
