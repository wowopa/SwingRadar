/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { describe, expect, it } from "vitest";

import { dedupeArticles, filterAndRankArticles } from "../scripts/lib/news-providers.mjs";

describe("news provider dedupe", () => {
  it("keeps the better source when near-duplicate articles exist", () => {
    const items = dedupeArticles([
      {
        ticker: "005930",
        headline: "삼성전자 반도체 투자 확대 - topstarnews",
        summary: "삼성전자가 반도체 투자 확대에 나섰다. 시장 기대가 커지고 있다.",
        source: "topstarnews",
        url: "https://www.topstarnews.net/article/1",
        date: "2026-03-10"
      },
      {
        ticker: "005930",
        headline: "삼성전자 반도체 투자 확대 - 한국경제",
        summary: "삼성전자가 반도체 투자 확대에 나섰다. 시장 기대가 커지고 있다.",
        source: "hankyung.com",
        url: "https://www.hankyung.com/article/1",
        date: "2026-03-10"
      }
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]?.source).toBe("hankyung.com");
  });

  it("collapses headline suffix variants into one article", () => {
    const items = dedupeArticles([
      {
        ticker: "000660",
        headline: "SK하이닉스 AI 메모리 수요 확대 - 매일경제",
        summary: "HBM 수요 확대 기대가 커지고 있다.",
        source: "mk.co.kr",
        url: "https://www.mk.co.kr/news/1",
        date: "2026-03-10"
      },
      {
        ticker: "000660",
        headline: "SK하이닉스 AI 메모리 수요 확대 | 연합뉴스",
        summary: "HBM 수요 확대 기대가 커지고 있다.",
        source: "yna.co.kr",
        url: "https://www.yna.co.kr/view/1",
        date: "2026-03-10"
      }
    ]);

    expect(items).toHaveLength(1);
  });

  it("keeps source diversity when one outlet dominates", () => {
    const items = filterAndRankArticles(
      [
        {
          ticker: "005930",
          company: "삼성전자",
          headline: "삼성전자 반도체 투자 확대",
          summary: "삼성전자 반도체 투자 확대 소식입니다.",
          source: "hankyung.com",
          url: "https://www.hankyung.com/article/1",
          date: "2026-03-10",
          impact: "중립"
        },
        {
          ticker: "005930",
          company: "삼성전자",
          headline: "삼성전자 반도체 투자 확대 추가 보도",
          summary: "삼성전자 반도체 투자 확대 소식입니다.",
          source: "hankyung.com",
          url: "https://www.hankyung.com/article/2",
          date: "2026-03-09",
          impact: "중립"
        },
        {
          ticker: "005930",
          company: "삼성전자",
          headline: "삼성전자 반도체 투자 확대 분석",
          summary: "삼성전자 반도체 투자 확대 소식입니다.",
          source: "mk.co.kr",
          url: "https://www.mk.co.kr/news/1",
          date: "2026-03-10",
          impact: "중립"
        }
      ],
      {
        ticker: "005930",
        company: "삼성전자",
        requiredKeywords: ["삼성전자"],
        contextKeywords: ["반도체"]
      },
      3,
      {
        sourceDiversityLimit: 1
      }
    );

    expect(items).toHaveLength(2);
    const sources: string[] = [];
    for (const rawItem of items as Array<{ source?: unknown }>) {
      sources.push(typeof rawItem.source === "string" ? rawItem.source : "");
    }
    const sourceSet = new Set<string>();
    for (const source of sources) {
      sourceSet.add(source);
    }
    expect(sourceSet.size).toBe(2);
  });

  it("filters lower-quality outlets more aggressively for top-ranked tickers", () => {
    const items = filterAndRankArticles(
      [
        {
          ticker: "005930",
          company: "삼성전자",
          headline: "삼성전자 반도체 투자 확대",
          summary: "삼성전자 반도체 투자 확대 소식입니다.",
          source: "topstarnews",
          url: "https://www.topstarnews.net/article/1",
          date: "2026-03-10",
          impact: "중립"
        },
        {
          ticker: "005930",
          company: "삼성전자",
          headline: "삼성전자 반도체 투자 확대",
          summary: "삼성전자 반도체 투자 확대 소식입니다.",
          source: "hankyung.com",
          url: "https://www.hankyung.com/article/1",
          date: "2026-03-10",
          impact: "중립"
        }
      ],
      {
        ticker: "005930",
        company: "삼성전자",
        requiredKeywords: ["삼성전자"],
        contextKeywords: ["반도체"]
      },
      3,
      {
        priorityRank: 5
      }
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.source).toBe("hankyung.com");
  });
});
