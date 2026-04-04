import { describe, expect, it } from "vitest";

import { buildTodayCommunityStatsFromDocuments } from "@/lib/server/today-community-stats";

describe("today community stats", () => {
  it("builds anonymous aggregate stats from journal, holdings, and opening checks", () => {
    const stats = buildTodayCommunityStatsFromDocuments(
      {
        journals: {
          journals: {
            userA: {
              events: [
                { ticker: "005930", company: "삼성전자", type: "buy", tradedAt: "2026-04-04T09:05:00+09:00" },
                { ticker: "005930", company: "삼성전자", type: "add", tradedAt: "2026-04-04T09:15:00+09:00" }
              ]
            },
            userB: {
              events: [
                { ticker: "005930", company: "삼성전자", type: "buy", tradedAt: "2026-04-04T10:00:00+09:00" },
                { ticker: "000660", company: "SK하이닉스", type: "buy", tradedAt: "2026-04-03T10:00:00+09:00" }
              ]
            }
          }
        },
        profiles: {
          profiles: {
            userA: { positions: [{ ticker: "005930", company: "삼성전자" }] },
            userB: { positions: [{ ticker: "005930", company: "삼성전자" }] },
            userC: { positions: [{ ticker: "000660", company: "SK하이닉스" }] }
          }
        },
        openingBoards: {
          boards: {
            userA: { scans: { "2026-04-04T08:30:00.000Z": { items: { "005930": { ticker: "005930" } } } } },
            userB: { scans: { "2026-04-04T08:30:00.000Z": { items: { "005930": { ticker: "005930" } } } } },
            userC: { scans: { "2026-04-04T08:30:00.000Z": { items: { "000660": { ticker: "000660" } } } } }
          }
        }
      },
      {
        now: new Date("2026-04-04T12:00:00+09:00"),
        scanKey: "2026-04-04T08:30:00.000Z"
      }
    );

    expect(stats?.stats).toHaveLength(3);
    expect(stats?.stats[0]).toMatchObject({
      label: "오늘의 인기 매수 시도",
      ticker: "005930",
      count: 2
    });
    expect(stats?.stats[1]).toMatchObject({
      label: "가장 많이 보유 중",
      ticker: "005930",
      count: 2
    });
    expect(stats?.stats[2]).toMatchObject({
      label: "장초 확인 최다 종목",
      ticker: "005930",
      count: 2
    });
  });

  it("returns undefined when there is no aggregate signal", () => {
    const stats = buildTodayCommunityStatsFromDocuments(
      {
        journals: { journals: {} },
        profiles: { profiles: {} },
        openingBoards: { boards: {} }
      },
      {
        now: new Date("2026-04-04T12:00:00+09:00"),
        scanKey: "2026-04-04T08:30:00.000Z"
      }
    );

    expect(stats).toBeUndefined();
  });
});
