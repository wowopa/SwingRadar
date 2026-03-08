import { z } from "zod";

const signalToneSchema = z.enum(["긍정", "중립", "주의"]);
const trackingResultSchema = z.enum(["진행중", "성공", "실패", "무효화"]);
const sortSchema = z.enum(["score_desc", "updatedAt_desc", "hitRate_desc"]);

export const recommendationsQuerySchema = z.object({
  signalTone: signalToneSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: sortSchema.optional()
});

export const analysisQuerySchema = z.object({
  includeNews: z.enum(["true", "false"]).optional(),
  includeQuality: z.enum(["true", "false"]).optional(),
  asOf: z.string().optional()
});

export const trackingQuerySchema = z.object({
  ticker: z.string().optional(),
  result: trackingResultSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional()
});

export type RecommendationsQuery = z.infer<typeof recommendationsQuerySchema>;
export type AnalysisQuery = z.infer<typeof analysisQuerySchema>;
export type TrackingQuery = z.infer<typeof trackingQuerySchema>;