import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execFile: vi.fn(),
  buildSymbolSuggestion: vi.fn(),
  buildMarketSymbol: vi.fn()
}));

vi.mock("node:child_process", () => ({
  execFile: mocks.execFile
}));

vi.mock("@/lib/symbols/master", () => ({
  buildSymbolSuggestion: mocks.buildSymbolSuggestion,
  buildMarketSymbol: mocks.buildMarketSymbol
}));

import { addSymbolToWatchlist, listWatchlistEntries, updateWatchlistEntry } from "@/lib/server/watchlist-manager";

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

describe("watchlist manager", () => {
  const originalWatchlistFile = process.env.SWING_RADAR_WATCHLIST_FILE;
  let tempRoot: string;
  let watchlistPath: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    tempRoot = await mkdtemp(path.join(os.tmpdir(), "swing-radar-watchlist-"));
    watchlistPath = path.join(tempRoot, "watchlist.json");
    process.env.SWING_RADAR_WATCHLIST_FILE = watchlistPath;

    await writeFile(
      watchlistPath,
      JSON.stringify(
        {
          tickers: [
            {
              ticker: "005930",
              company: "Samsung",
              sector: "Semiconductor",
              marketSymbol: "005930.KS",
              newsQuery: "Samsung",
              newsQueries: ["Samsung"],
              newsQueriesKr: ['"Samsung" \uC8FC\uC2DD'],
              requiredKeywords: ["Samsung"],
              contextKeywords: ["Semiconductor"],
              blockedKeywords: [],
              blockedDomains: [],
              preferredDomains: ["hankyung.com"],
              minArticleScore: 12,
              market: "KOSPI",
              dartCorpCode: "00126380"
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    mocks.execFile.mockImplementation(
      (
        _file,
        _args,
        _options,
        callback?: (error: Error | null, result: { stdout: string; stderr: string }) => void
      ) => {
        callback?.(null, { stdout: "", stderr: "" });
        return {} as never;
      }
    );
    mocks.buildMarketSymbol.mockImplementation((ticker: string, market: string) => {
      const suffixByMarket: Record<string, string> = {
        KOSPI: "KS",
        KOSDAQ: "KQ",
        NYSE: "NY",
        NASDAQ: "NQ",
        AMEX: "AM"
      };

      return `${ticker}.${suffixByMarket[market] ?? market}`;
    });

    mocks.buildSymbolSuggestion.mockReturnValue({
      ticker: "035420",
      company: "NAVER",
      sector: "Internet",
      market: "KOSPI",
      newsQuery: "NAVER",
      newsQueries: ["NAVER", "NAVER Korea"],
      newsQueriesKr: ['"NAVER" \uC8FC\uC2DD', '"NAVER" \uC778\uD130\uB137', '"NAVER" \uC2E4\uC801'],
      requiredKeywords: ["NAVER", "035420"],
      contextKeywords: ["Internet", "AI"],
      blockedKeywords: ["recruiting"],
      preferredDomains: ["hankyung.com"],
      blockedDomains: ["spam.com"],
      minArticleScore: 15,
      dartCorpCode: "00266961"
    });
  });

  afterEach(async () => {
    if (originalWatchlistFile === undefined) {
      delete process.env.SWING_RADAR_WATCHLIST_FILE;
    } else {
      process.env.SWING_RADAR_WATCHLIST_FILE = originalWatchlistFile;
    }

    await rm(tempRoot, { recursive: true, force: true });
  });

  it("lists watchlist entries from the configured file", async () => {
    const entries = await listWatchlistEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      ticker: "005930",
      company: "Samsung"
    });
  });

  it("returns a duplicate result without rerunning scripts when the symbol already exists", async () => {
    const result = await addSymbolToWatchlist({
      ticker: "005930",
      company: "Samsung",
      aliases: ["SEC"],
      sector: "Semiconductor",
      market: "KOSPI",
      status: "ready",
      newsQuery: "Samsung",
      newsQueries: ["Samsung"],
      newsQueriesKr: ['"Samsung" \uC8FC\uC2DD'],
      requiredKeywords: ["Samsung"],
      contextKeywords: ["Semiconductor"],
      blockedKeywords: [],
      preferredDomains: ["hankyung.com"],
      blockedDomains: [],
      minArticleScore: 12,
      dartCorpCode: "00126380"
    });

    expect(result).toMatchObject({
      added: false,
      estimate: "\uC774\uBBF8 \uAC10\uC2DC \uB9AC\uC2A4\uD2B8\uC5D0 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.",
      timings: null
    });
    expect(mocks.execFile).not.toHaveBeenCalled();
  });

  it("adds a new symbol, persists the file, and reruns pipeline scripts", async () => {
    const result = await addSymbolToWatchlist({
      ticker: "035420",
      company: "NAVER",
      aliases: ["Naver"],
      sector: "Internet",
      market: "KOSPI",
      status: "ready",
      newsQuery: "NAVER",
      newsQueries: ["NAVER"],
      newsQueriesKr: ['"NAVER" \uC8FC\uC2DD'],
      requiredKeywords: ["NAVER"],
      contextKeywords: ["Internet"],
      blockedKeywords: [],
      preferredDomains: ["hankyung.com"],
      blockedDomains: [],
      minArticleScore: 15,
      dartCorpCode: "00266961"
    });

    const document = await readJsonFile<{ tickers: Array<{ ticker: string; newsQuery: string }> }>(watchlistPath);

    expect(result.added).toBe(true);
    expect(result.entry).toMatchObject({
      ticker: "035420",
      newsQuery: "NAVER",
      marketSymbol: "035420.KS"
    });
    expect(result.estimate).toBe(
      "\uC77C\uBC18\uC801\uC73C\uB85C 15\uCD08~60\uCD08 \uC548\uC5D0 \uBD84\uC11D \uD398\uC774\uC9C0 \uBC18\uC601\uC774 \uC2DC\uC791\uB429\uB2C8\uB2E4."
    );
    expect(document.tickers.map((item) => item.ticker)).toEqual(["005930", "035420"]);
    expect(mocks.execFile).toHaveBeenCalledTimes(2);
  });

  it("builds the correct market symbol for non-KRX markets", async () => {
    mocks.buildSymbolSuggestion.mockReturnValueOnce({
      ticker: "AAPL",
      company: "Apple Inc",
      sector: "Consumer Electronics",
      market: "NASDAQ",
      newsQuery: "Apple",
      newsQueries: ["Apple", "Apple Inc"],
      newsQueriesKr: ['"Apple" stock'],
      requiredKeywords: ["Apple", "AAPL"],
      contextKeywords: ["iPhone", "earnings"],
      blockedKeywords: [],
      preferredDomains: ["wsj.com"],
      blockedDomains: [],
      minArticleScore: 15,
      dartCorpCode: ""
    });

    const result = await addSymbolToWatchlist({
      ticker: "AAPL",
      company: "Apple Inc",
      aliases: ["Apple"],
      sector: "Consumer Electronics",
      market: "NASDAQ",
      status: "pending",
      newsQuery: "Apple",
      newsQueries: ["Apple"],
      newsQueriesKr: ['"Apple" stock'],
      requiredKeywords: ["Apple", "AAPL"],
      contextKeywords: ["iPhone"],
      blockedKeywords: [],
      preferredDomains: ["wsj.com"],
      blockedDomains: [],
      minArticleScore: 15,
      dartCorpCode: ""
    });

    expect(result.entry).toMatchObject({
      ticker: "AAPL",
      marketSymbol: "AAPL.NQ",
      market: "NASDAQ"
    });
  });

  it("updates metadata and skips rerun when requested", async () => {
    const result = await updateWatchlistEntry(
      "005930",
      {
        newsQuery: "Samsung Electronics",
        blockedKeywords: ["rumor"],
        minArticleScore: 18
      },
      { rerunPipeline: false }
    );

    const document = await readJsonFile<{
      tickers: Array<{ ticker: string; newsQuery: string; blockedKeywords: string[]; minArticleScore: number }>;
    }>(watchlistPath);

    expect(result).toMatchObject({
      updated: true,
      timings: null
    });
    expect(result.changes.map((change) => change.field)).toEqual(["newsQuery", "blockedKeywords", "minArticleScore"]);
    expect(document.tickers[0]).toMatchObject({
      ticker: "005930",
      newsQuery: "Samsung Electronics",
      blockedKeywords: ["rumor"],
      minArticleScore: 18
    });
    expect(mocks.execFile).not.toHaveBeenCalled();
  });
});
