import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execFile: vi.fn(),
  buildSymbolSuggestion: vi.fn()
}));

vi.mock("node:child_process", () => ({
  execFile: mocks.execFile
}));

vi.mock("@/lib/symbols/master", () => ({
  buildSymbolSuggestion: mocks.buildSymbolSuggestion
}));

import {
  addSymbolToWatchlist,
  listWatchlistEntries,
  updateWatchlistEntry
} from "@/lib/server/watchlist-manager";

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
              newsQueriesKr: ['"Samsung" 주식'],
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

    mocks.execFile.mockImplementation((_file, _args, _options, callback?: (error: Error | null, result: { stdout: string; stderr: string }) => void) => {
      callback?.(null, { stdout: "", stderr: "" });
      return {} as never;
    });
    mocks.buildSymbolSuggestion.mockReturnValue({
      ticker: "035420",
      company: "NAVER",
      sector: "Internet",
      market: "KOSPI",
      newsQuery: "NAVER",
      newsQueries: ["NAVER", "NAVER Korea"],
      newsQueriesKr: ['"NAVER" 주식', '"NAVER" 인터넷', '"NAVER" 실적'],
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
      newsQueriesKr: ['"Samsung" 주식'],
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
      estimate: "이미 감시 리스트에 포함되어 있습니다.",
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
      newsQueriesKr: ['"NAVER" 주식'],
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
    expect(result.estimate).toBe("일반적으로 15초~60초 안에 분석 페이지 반영이 시작됩니다.");
    expect(document.tickers.map((item) => item.ticker)).toEqual(["005930", "035420"]);
    expect(mocks.execFile).toHaveBeenCalledTimes(2);
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
