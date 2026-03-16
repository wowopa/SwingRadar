import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadSnapshotBundleFromDisk: vi.fn(),
  ingestSnapshotBundle: vi.fn(),
  recordAuditLog: vi.fn()
}));

vi.mock("@/lib/server/postgres-ingest", () => ({
  loadSnapshotBundleFromDisk: mocks.loadSnapshotBundleFromDisk,
  ingestSnapshotBundle: mocks.ingestSnapshotBundle
}));

vi.mock("@/lib/server/audit-log", () => ({
  recordAuditLog: mocks.recordAuditLog
}));

import type { SnapshotBundle } from "@/lib/server/editorial-draft";
import {
  loadEditorialDraft,
  publishEditorialDraft,
  rollbackPublishedSnapshot,
  saveEditorialDraft
} from "@/lib/server/editorial-draft";

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function createSnapshotBundle(generatedAt: string): SnapshotBundle {
  return {
    recommendations: {
      generatedAt,
      items: [
        {
          ticker: "005930",
          company: "Samsung",
          sector: "Semiconductor",
          signalTone: "중립",
          score: 78,
          signalLabel: "관찰",
          rationale: "기존 근거",
          invalidation: "60일선 이탈 시 재검토",
          invalidationDistance: -2.4,
          riskRewardRatio: "1:2",
          validationSummary: "보통",
          checkpoints: ["거래량 회복"],
          validation: { hitRate: 55, avgReturn: 2.1, sampleSize: 14, maxDrawdown: -4.2 },
          observationWindow: "5d",
          updatedAt: "2026-03-08 09:00"
        }
      ],
      dailyScan: null
    },
    analysis: {
      generatedAt,
      items: [
        {
          ticker: "005930",
          company: "Samsung",
          signalTone: "중립",
          score: 78,
          headline: "기본 헤드라인",
          invalidation: "60일선 이탈 시 재검토",
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
            volumeRatio20: null,
            atr14: null,
            natr14: null,
            adx14: null,
            plusDi14: null,
            minusDi14: null,
            stochasticK: null,
            stochasticD: null,
            mfi14: null,
            roc20: null,
            cci20: null,
            cmf20: null
          },
          chartSeries: [],
          decisionNotes: ["기존 메모"],
          scoreBreakdown: [],
          scenarios: [],
          riskChecklist: [],
          newsImpact: [],
          dataQuality: [{ label: "뉴스", value: "1건", note: "기본" }]
        }
      ]
    },
    tracking: {
      generatedAt,
      history: [
        {
          id: "hist-1",
          ticker: "005930",
          company: "Samsung",
          signalDate: "2026-03-07",
          signalTone: "중립",
          entryScore: 78,
          result: "진행중",
          mfe: 0,
          mae: 0,
          holdingDays: 1
        }
      ],
      details: {
        "hist-1": {
          historyId: "hist-1",
          summary: "기본 요약",
          invalidationReview: "기본 리뷰",
          afterActionReview: "기본 AAR",
          reviewChecklist: [],
          metrics: [],
          chartSnapshot: [],
          historicalNews: [],
          scoreLog: []
        }
      }
    }
  };
}

describe("editorial draft workflow", () => {
  const originalEditorialDir = process.env.SWING_RADAR_EDITORIAL_DIR;
  const originalDataDir = process.env.SWING_RADAR_DATA_DIR;
  let tempRoot: string;
  let editorialDir: string;
  let liveDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    tempRoot = await mkdtemp(path.join(os.tmpdir(), "swing-radar-editorial-"));
    editorialDir = path.join(tempRoot, "editorial");
    liveDir = path.join(tempRoot, "live");
    process.env.SWING_RADAR_EDITORIAL_DIR = editorialDir;
    process.env.SWING_RADAR_DATA_DIR = liveDir;

    mocks.recordAuditLog.mockResolvedValue(undefined);
    mocks.ingestSnapshotBundle.mockResolvedValue({
      recommendations: 1,
      analysis: 1,
      trackingHistoryRows: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      actor: "admin-editor",
      requestId: "req-editor"
    });
    mocks.loadSnapshotBundleFromDisk.mockResolvedValue(createSnapshotBundle("2026-03-08T00:00:00.000Z"));
  });

  afterEach(async () => {
    if (originalEditorialDir === undefined) {
      delete process.env.SWING_RADAR_EDITORIAL_DIR;
    } else {
      process.env.SWING_RADAR_EDITORIAL_DIR = originalEditorialDir;
    }

    if (originalDataDir === undefined) {
      delete process.env.SWING_RADAR_DATA_DIR;
    } else {
      process.env.SWING_RADAR_DATA_DIR = originalDataDir;
    }

    await rm(tempRoot, { recursive: true, force: true });
  });

  it("builds a default draft from the current snapshot bundle", async () => {
    const payload = await loadEditorialDraft();

    expect(payload.catalog).toEqual([
      {
        ticker: "005930",
        company: "Samsung",
        signalTone: "중립",
        score: 78
      }
    ]);
    expect(payload.draft.items[0]).toMatchObject({
      ticker: "005930",
      recommendation: {
        signalLabel: "관찰",
        rationale: "기존 근거"
      },
      analysis: {
        headline: "기본 헤드라인"
      }
    });
    expect(payload.diff).toEqual([]);
    expect(payload.publishHistory).toEqual([]);
  });

  it("publishes draft changes into live snapshot files and publish history", async () => {
    await saveEditorialDraft(
      {
        updatedAt: "2026-03-08T00:00:00.000Z",
        updatedBy: "tester",
        items: [
          {
            ticker: "005930",
            recommendation: {
              signalLabel: "매수 후보",
              rationale: "운영 검토 근거 반영",
              invalidation: "59,000원 이탈 시 재검토",
              checkpoints: ["거래량 확인", "공시 확인"]
            },
            analysis: {
              headline: "운영 검토 헤드라인",
              invalidation: "59,000원 이탈 시 재검토",
              decisionNotes: ["메모 A", "메모 B"]
            },
            operatorNote: "장 마감 후 확인"
          }
        ]
      },
      "admin-editor",
      "req-save"
    );

    const result = await publishEditorialDraft({
      actor: "admin-editor",
      requestId: "req-publish",
      ingestToPostgres: true,
      approvalStage: "risk_review"
    });

    const recommendationDocument = await readJsonFile<SnapshotBundle["recommendations"]>(path.join(liveDir, "recommendations.json"));
    const analysisDocument = await readJsonFile<SnapshotBundle["analysis"]>(path.join(liveDir, "analysis.json"));
    const historyDocument = await readJsonFile<Array<{
      id: string;
      approvalStage: string;
      diffCount: number;
      changes: Array<{ ticker: string; changes: string[] }>;
      bundle: SnapshotBundle;
    }>>(path.join(editorialDir, "publish-history.json"));
    const reloadedDraft = await loadEditorialDraft();

    expect(result.diffCount).toBe(1);
    expect(result.tickers).toBe(1);
    expect(result.notes[0]).toContain("005930");
    expect(recommendationDocument.items[0]).toMatchObject({
      signalLabel: "매수 후보",
      rationale: "운영 검토 근거 반영",
      invalidation: "59,000원 이탈 시 재검토",
      checkpoints: ["거래량 확인", "공시 확인"]
    });
    expect(analysisDocument.items[0]).toMatchObject({
      headline: "운영 검토 헤드라인",
      invalidation: "59,000원 이탈 시 재검토",
      decisionNotes: ["메모 A", "메모 B"]
    });
    expect(historyDocument).toHaveLength(1);
    expect(historyDocument[0]).toMatchObject({
      id: result.id,
      approvalStage: "risk_review",
      diffCount: 1
    });
    expect(historyDocument[0]?.changes[0]?.changes).toContain("신호 라벨");
    expect(mocks.ingestSnapshotBundle).toHaveBeenCalledTimes(1);
    const [publishedBundle, publishedOptions] = mocks.ingestSnapshotBundle.mock.calls[0] as [
      SnapshotBundle,
      { requestId: string; actor: string }
    ];
    expect(publishedBundle.recommendations.items[0]).toMatchObject({ signalLabel: "매수 후보" });
    expect(publishedOptions).toEqual({
      requestId: "req-publish",
      actor: "admin-editor"
    });
    expect(reloadedDraft.draft.items[0]).toMatchObject({
      ticker: "005930",
      recommendation: {
        signalLabel: "매수 후보",
        rationale: "운영 검토 근거 반영"
      },
      analysis: {
        headline: "운영 검토 헤드라인"
      },
      operatorNote: ""
    });
    expect(reloadedDraft.diff).toHaveLength(1);
    expect(reloadedDraft.publishHistory[0]).toMatchObject({
      id: result.id,
      approvalStage: "risk_review",
      diffCount: 1
    });
  });

  it("rolls back to a previously published snapshot", async () => {
    await saveEditorialDraft(
      {
        updatedAt: "2026-03-08T00:00:00.000Z",
        updatedBy: "tester",
        items: [
          {
            ticker: "005930",
            recommendation: {
              signalLabel: "발행본",
              rationale: "1차 발행",
              invalidation: "1차 무효화",
              checkpoints: ["1차 체크"]
            },
            analysis: {
              headline: "1차 헤드라인",
              invalidation: "1차 무효화",
              decisionNotes: ["1차 메모"]
            },
            operatorNote: "1차"
          }
        ]
      },
      "admin-editor",
      "req-save-1"
    );

    const firstPublish = await publishEditorialDraft({
      actor: "admin-editor",
      requestId: "req-publish-1"
    });

    mocks.loadSnapshotBundleFromDisk.mockResolvedValue(createSnapshotBundle("2026-03-09T00:00:00.000Z"));

    await saveEditorialDraft(
      {
        updatedAt: "2026-03-09T00:00:00.000Z",
        updatedBy: "tester",
        items: [
          {
            ticker: "005930",
            recommendation: {
              signalLabel: "2차 발행본",
              rationale: "2차 발행",
              invalidation: "2차 무효화",
              checkpoints: ["2차 체크"]
            },
            analysis: {
              headline: "2차 헤드라인",
              invalidation: "2차 무효화",
              decisionNotes: ["2차 메모"]
            },
            operatorNote: "2차"
          }
        ]
      },
      "admin-editor",
      "req-save-2"
    );

    await publishEditorialDraft({
      actor: "admin-editor",
      requestId: "req-publish-2"
    });

    const rollbackResult = await rollbackPublishedSnapshot({
      historyId: firstPublish.id,
      actor: "admin-editor",
      requestId: "req-rollback",
      ingestToPostgres: true,
      rollbackReason: "manual review"
    });

    const recommendationDocument = await readJsonFile<SnapshotBundle["recommendations"]>(path.join(liveDir, "recommendations.json"));

    expect(rollbackResult).toMatchObject({
      historyId: firstPublish.id,
      diffCount: 1,
      tickers: 1
    });
    expect(recommendationDocument.items[0]).toMatchObject({
      signalLabel: "발행본",
      rationale: "1차 발행",
      invalidation: "1차 무효화",
      checkpoints: ["1차 체크"]
    });
    const rollbackCall = mocks.ingestSnapshotBundle.mock.calls.at(-1) as [SnapshotBundle, { requestId: string; actor: string }] | undefined;
    expect(rollbackCall).toBeDefined();
    expect(rollbackCall?.[0].recommendations.items[0]).toMatchObject({ signalLabel: "발행본" });
    expect(rollbackCall?.[1]).toEqual({
      requestId: "req-rollback",
      actor: "admin-editor"
    });
    expect(mocks.recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "admin_publish",
        status: "warning",
        requestId: "req-rollback"
      })
    );
  });
});
