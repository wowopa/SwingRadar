"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DiffDialog } from "@/components/admin/dashboard-shared";
import type { EditorialDiffItem } from "@/components/admin/dashboard-types";

export function DiffTab({ diff }: { diff: EditorialDiffItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>초안 변경점</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {diff.length ? (
          diff.map((item) => (
            <div key={item.ticker} className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {item.company} {item.ticker}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    점수 {item.score} | 변경 {item.changes.join(", ")}
                  </p>
                </div>
                <DiffDialog item={item} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">현재 라이브 스냅샷 대비 변경점이 없습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}