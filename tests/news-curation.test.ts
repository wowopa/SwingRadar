import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordAuditLog: vi.fn()
}));

vi.mock("@/lib/server/audit-log", () => ({
  recordAuditLog: mocks.recordAuditLog
}));

import {
  applyNewsCurationToAnalysis,
  applyNewsCurationToRecommendations,
  loadNewsCuration,
  saveNewsCuration
} from "@/lib/server/news-curation";

describe("news curation", () => {
  const originalEditorialDir = process.env.SWING_RADAR_EDITORIAL_DIR;
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.recordAuditLog.mockResolvedValue(undefined);
    tempDir = await mkdtemp(path.join(os.tmpdir(), "swing-radar-news-curation-"));
    process.env.SWING_RADAR_EDITORIAL_DIR = tempDir;
  });

  afterEach(async () => {
    if (originalEditorialDir === undefined) {
      delete process.env.SWING_RADAR_EDITORIAL_DIR;
    } else {
      process.env.SWING_RADAR_EDITORIAL_DIR = originalEditorialDir;
    }

    await rm(tempDir, { recursive: true, force: true });
  });

  it("saves normalized curated news and loads it in display order", async () => {
    await saveNewsCuration(
      {
        updatedAt: "2026-03-08T00:00:00.000Z",
        updatedBy: "tester",
        items: [
          {
            id: "2",
            ticker: "005930",
            headline: " 일반 뉴스 ",
            summary: " 요약 ",
            source: " source ",
            url: "https://example.com/normal",
            date: "2026-03-07",
            impact: "중립",
            pinned: false,
            operatorNote: " 메모 "
          },
          {
            id: "1",
            ticker: "005930",
            headline: " 중요 뉴스 ",
            summary: " 핵심 ",
            source: " desk ",
            url: "https://example.com/pinned",
            date: "2026-03-06",
            impact: "긍정",
            pinned: true,
            operatorNote: " 확인 "
          }
        ]
      },
      "admin-editor",
      "req-news"
    );

    const document = await loadNewsCuration();

    expect(document.updatedBy).toBe("admin-editor");
    expect(document.items.map((item) => item.headline)).toEqual(["중요 뉴스", "일반 뉴스"]);
    expect(document.items[0]).toMatchObject({
      source: "desk",
      summary: "핵심",
      operatorNote: "확인",
      impact: "긍정"
    });
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "admin_news_curation_saved",
        requestId: "req-news"
      })
    );
  });

  it("merges curated news into analysis and recommendations", async () => {
    await saveNewsCuration(
      {
        updatedAt: "2026-03-08T00:00:00.000Z",
        updatedBy: "tester",
        items: [
          {
            id: "curated-1",
            ticker: "005930",
            headline: "운영 공시 체크",
            summary: "공시 확인이 필요합니다.",
            source: "admin-desk",
            url: "https://example.com/curated",
            date: "2026-03-08",
            impact: "주의",
            pinned: true,
            operatorNote: "장 마감 후 재확인"
          }
        ]
      },
      "admin-editor",
      "req-news"
    );

    const recommendationResult = await applyNewsCurationToRecommendations({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        {
          ticker: "005930",
          company: "삼성전자",
          sector: "반도체",
          signalTone: "중립",
          score: 75,
          signalLabel: "관찰",
          rationale: "기존 근거",
          invalidation: "이탈 시 재검토",
          invalidationDistance: -3,
          riskRewardRatio: "1:2",
          validationSummary: "보통",
          checkpoints: ["거래량"],
          validation: { hitRate: 50, avgReturn: 1.2, sampleSize: 12, maxDrawdown: -4 },
          observationWindow: "5d",
          updatedAt: "2026-03-08 09:00"
        }
      ],
      dailyScan: null
    });

    const analysisResult = await applyNewsCurationToAnalysis({
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        {
          ticker: "005930",
          company: "삼성전자",
          signalTone: "중립",
          score: 75,
          headline: "분석 헤드라인",
          invalidation: "이탈 시 재검토",
          analysisSummary: [],
          keyLevels: [],
          technicalIndicators: {
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
          },
          chartSeries: [],
          decisionNotes: [],
          scoreBreakdown: [],
          scenarios: [],
          riskChecklist: [],
          newsImpact: [
            {
              headline: "기존 뉴스",
              impact: "중립",
              summary: "기존 요약",
              source: "wire",
              url: "https://example.com/base",
              date: "2026-03-07",
              eventType: "news"
            }
          ],
          dataQuality: [
            { label: "뉴스", value: "1건", note: "기본" },
            { label: "공시", value: "양호", note: "기본" }
          ]
        }
      ]
    });

    expect(recommendationResult.items[0]?.rationale).toContain("운영자 큐레이션 기사 '운영 공시 체크'");
    expect(analysisResult.items[0]?.newsImpact[0]).toMatchObject({
      headline: "운영 공시 체크",
      impact: "주의",
      eventType: "curated-news"
    });
    expect(analysisResult.items[0]?.newsImpact[0]?.summary).toContain("[운영자 큐레이션]");
    expect(analysisResult.items[0]?.dataQuality[0]).toEqual({
      label: "뉴스",
      value: "2건",
      note: "1건의 운영자 큐레이션 포함"
    });
  });
});
