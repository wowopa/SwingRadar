"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { HistoryDialog, RollbackDialog, formatApprovalStage, formatDateTime } from "@/components/admin/dashboard-shared";
import type { PublishHistoryItem } from "@/components/admin/dashboard-types";

export function HistoryTab({
  history,
  rollbackReason,
  onRollbackReasonChange,
  onRollback,
  loading
}: {
  history: PublishHistoryItem[];
  rollbackReason: string;
  onRollbackReasonChange: (value: string) => void;
  onRollback: (historyId: string) => void;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>발행 이력</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.length ? (
          history.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{formatDateTime(item.publishedAt)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    작성자 {item.publishedBy} | 단계 {formatApprovalStage(item.approvalStage)} | 종목 {item.tickers}개 | 변경 {item.diffCount}건
                  </p>
                </div>
                <div className="flex gap-2">
                  <HistoryDialog item={item} />
                  <RollbackDialog
                    item={item}
                    reason={rollbackReason}
                    onReasonChange={onRollbackReasonChange}
                    onConfirm={() => onRollback(item.id)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">아직 발행 이력이 없습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}