import { z } from "zod";

import type {
  AnalysisResponseDto,
  RecommendationsResponseDto,
  TrackingResponseDto
} from "@/lib/api-contracts/swing-radar";

const signalTone = z.enum(["긍정", "중립", "주의"]);
const resultStatus = z.enum(["진행중", "성공", "실패", "무효화"]);
const riskStatus = z.enum(["양호", "확인 필요", "주의"]);
const scenarioLabel = z.enum(["기본", "강세", "약세"]);
const validationBasis = z.enum(["실측 기반", "유사 업종 참고", "유사 흐름 참고", "보수 계산"]);

const recommendationItemSchema = z.object({
  ticker: z.string(),
  company: z.string(),
  sector: z.string(),
  signalTone,
  score: z.number(),
  signalLabel: z.string(),
  rationale: z.string(),
  invalidation: z.string(),
  invalidationDistance: z.number(),
  riskRewardRatio: z.string(),
  validationSummary: z.string(),
  validationBasis: validationBasis.optional(),
  checkpoints: z.array(z.string()),
  validation: z.object({
    hitRate: z.number(),
    avgReturn: z.number(),
    sampleSize: z.number(),
    maxDrawdown: z.number()
  }),
  observationWindow: z.string(),
  updatedAt: z.string()
});

const analysisItemSchema = z.object({
  ticker: z.string(),
  company: z.string(),
  signalTone,
  score: z.number(),
  headline: z.string(),
  invalidation: z.string(),
  analysisSummary: z.array(z.object({ label: z.string(), value: z.string(), note: z.string() })),
  keyLevels: z.array(z.object({ label: z.string(), price: z.string(), meaning: z.string() })),
  technicalIndicators: z.object({
    sma20: z.number().nullable(),
    sma60: z.number().nullable(),
    ema20: z.number().nullable(),
    rsi14: z.number().nullable(),
    macd: z.number().nullable(),
    macdSignal: z.number().nullable(),
    macdHistogram: z.number().nullable(),
    bollingerUpper: z.number().nullable(),
    bollingerMiddle: z.number().nullable(),
    bollingerLower: z.number().nullable(),
    volumeRatio20: z.number().nullable(),
    atr14: z.number().nullable(),
    natr14: z.number().nullable(),
    adx14: z.number().nullable(),
    plusDi14: z.number().nullable(),
    minusDi14: z.number().nullable(),
    stochasticK: z.number().nullable(),
    stochasticD: z.number().nullable(),
    mfi14: z.number().nullable()
  }),
  chartSeries: z.array(
    z.object({
      label: z.string(),
      date: z.string().nullable().optional(),
      open: z.number().nullable(),
      high: z.number().nullable(),
      low: z.number().nullable(),
      close: z.number(),
      volume: z.number().nullable(),
      sma20: z.number().nullable(),
      sma60: z.number().nullable(),
      ema20: z.number().nullable(),
      bollingerUpper: z.number().nullable(),
      bollingerLower: z.number().nullable(),
      rsi14: z.number().nullable(),
      macd: z.number().nullable(),
      macdSignal: z.number().nullable()
    })
  ),
  decisionNotes: z.array(z.string()),
  scoreBreakdown: z.array(z.object({ label: z.string(), score: z.number(), description: z.string() })),
  scenarios: z.array(z.object({ label: scenarioLabel, probability: z.number(), expectation: z.string(), trigger: z.string() })),
  riskChecklist: z.array(z.object({ label: z.string(), status: riskStatus, note: z.string() })),
  newsImpact: z.array(z.object({ headline: z.string(), impact: signalTone, summary: z.string() })),
  dataQuality: z.array(z.object({ label: z.string(), value: z.string(), note: z.string() }))
});

const trackingResponseSchema = z.object({
  generatedAt: z.string(),
  history: z.array(
    z.object({
      id: z.string(),
      ticker: z.string(),
      company: z.string(),
      signalDate: z.string(),
      signalTone,
      entryScore: z.number(),
      result: resultStatus,
      mfe: z.number(),
      mae: z.number(),
      currentReturn: z.number().optional(),
      holdingDays: z.number(),
      selectionStage: z.string().optional(),
      selectionReason: z.string().optional()
    })
  ),
  details: z.record(
    z.string(),
    z.object({
      historyId: z.string(),
      selectionStage: z.string().optional(),
      selectionReason: z.string().optional(),
      selectionHighlights: z.array(z.string()).optional(),
      summary: z.string(),
      invalidationReview: z.string(),
      afterActionReview: z.string(),
      reviewChecklist: z.array(z.string()),
      metrics: z.array(z.object({ label: z.string(), value: z.string(), note: z.string() })),
      chartSnapshot: z.array(z.object({ label: z.string(), price: z.number() })),
      historicalNews: z.array(z.object({ id: z.string(), date: z.string(), headline: z.string(), impact: signalTone, note: z.string() })),
      scoreLog: z.array(z.object({ timestamp: z.string(), factor: z.string(), delta: z.number(), reason: z.string() }))
    })
  )
});

export const ingestPayloadSchema = z.object({
  applySchema: z.boolean().optional().default(false),
  recommendations: z.custom<RecommendationsResponseDto>((value) =>
    z.object({ generatedAt: z.string(), items: z.array(recommendationItemSchema) }).safeParse(value).success
  ),
  analysis: z.custom<AnalysisResponseDto>((value) =>
    z.object({ generatedAt: z.string(), items: z.array(analysisItemSchema) }).safeParse(value).success
  ),
  tracking: z.custom<TrackingResponseDto>((value) => trackingResponseSchema.safeParse(value).success)
});

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;
