import { z } from "zod";

export const editorialDraftSchema = z.object({
  updatedAt: z.string(),
  updatedBy: z.string(),
  items: z.array(
    z.object({
      ticker: z.string(),
      recommendation: z.object({
        signalLabel: z.string(),
        rationale: z.string(),
        invalidation: z.string(),
        checkpoints: z.array(z.string())
      }),
      analysis: z.object({
        headline: z.string(),
        invalidation: z.string(),
        decisionNotes: z.array(z.string())
      }),
      operatorNote: z.string()
    })
  )
});

export const editorialPublishSchema = z.object({
  ingestToPostgres: z.boolean().optional().default(false),
  approvalStage: z
    .enum(["editorial_review", "risk_review", "final_publish"])
    .optional()
    .default("final_publish")
});

export const editorialRollbackSchema = z.object({
  historyId: z.string(),
  ingestToPostgres: z.boolean().optional().default(false),
  rollbackReason: z.string().trim().min(3).max(300).optional().default("manual rollback")
});

export const newsCurationSchema = z.object({
  updatedAt: z.string(),
  updatedBy: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      ticker: z.string(),
      headline: z.string().trim().min(3).max(300),
      summary: z.string().trim().min(3).max(1000),
      source: z.string().trim().min(2).max(120),
      url: z.string().trim().url(),
      date: z.string(),
      impact: z.enum(["긍정", "중립", "주의"]),
      pinned: z.boolean(),
      operatorNote: z.string().trim().max(300)
    })
  )
});

export type EditorialDraftInput = z.infer<typeof editorialDraftSchema>;
export type EditorialPublishInput = z.infer<typeof editorialPublishSchema>;
export type EditorialRollbackInput = z.infer<typeof editorialRollbackSchema>;
export type NewsCurationInput = z.infer<typeof newsCurationSchema>;
