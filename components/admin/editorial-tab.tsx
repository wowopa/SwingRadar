"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { EditorialCatalogItem, EditorialDraftItem } from "@/components/admin/dashboard-types";
import { Field, splitLines } from "@/components/admin/dashboard-shared";

export function EditorialTab({
  catalog,
  activeTicker,
  setActiveTicker,
  activeDraftItem,
  updateDraftItem,
  onSave,
  disabled
}: {
  catalog: EditorialCatalogItem[];
  activeTicker: string;
  setActiveTicker: (ticker: string) => void;
  activeDraftItem: EditorialDraftItem | null;
  updateDraftItem: (ticker: string, updater: (item: EditorialDraftItem) => EditorialDraftItem) => void;
  onSave: () => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>초안 편집</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            종목별 신호 라벨, 근거, 무효화, 분석 메모를 직접 교정합니다.
          </p>
        </div>
        <Button onClick={onSave} disabled={disabled}>
          초안 저장
        </Button>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          {catalog.map((item) => (
            <button
              key={item.ticker}
              type="button"
              onClick={() => setActiveTicker(item.ticker)}
              className={`w-full rounded-2xl border p-4 text-left ${
                activeTicker === item.ticker ? "border-primary/50 bg-primary/10" : "border-border/70 bg-secondary/35"
              }`}
            >
              <p className="text-sm font-semibold text-white">{item.company}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.ticker} | {item.signalTone} | 점수 {item.score}
              </p>
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {activeDraftItem ? (
            <>
              <Field label="신호 라벨">
                <Input
                  value={activeDraftItem.recommendation.signalLabel}
                  onChange={(event) =>
                    updateDraftItem(activeDraftItem.ticker, (item) => ({
                      ...item,
                      recommendation: { ...item.recommendation, signalLabel: event.target.value }
                    }))
                  }
                />
              </Field>
              <Field label="관찰 근거">
                <Textarea
                  value={activeDraftItem.recommendation.rationale}
                  onChange={(event) =>
                    updateDraftItem(activeDraftItem.ticker, (item) => ({
                      ...item,
                      recommendation: { ...item.recommendation, rationale: event.target.value }
                    }))
                  }
                />
              </Field>
              <Field label="추천 무효화">
                <Textarea
                  value={activeDraftItem.recommendation.invalidation}
                  onChange={(event) =>
                    updateDraftItem(activeDraftItem.ticker, (item) => ({
                      ...item,
                      recommendation: { ...item.recommendation, invalidation: event.target.value }
                    }))
                  }
                />
              </Field>
              <Field label="체크포인트 (줄바꿈 구분)">
                <Textarea
                  value={activeDraftItem.recommendation.checkpoints.join("\n")}
                  onChange={(event) =>
                    updateDraftItem(activeDraftItem.ticker, (item) => ({
                      ...item,
                      recommendation: {
                        ...item.recommendation,
                        checkpoints: splitLines(event.target.value)
                      }
                    }))
                  }
                />
              </Field>
              <Field label="분석 헤드라인">
                <Input
                  value={activeDraftItem.analysis.headline}
                  onChange={(event) =>
                    updateDraftItem(activeDraftItem.ticker, (item) => ({
                      ...item,
                      analysis: { ...item.analysis, headline: event.target.value }
                    }))
                  }
                />
              </Field>
              <Field label="분석 무효화">
                <Textarea
                  value={activeDraftItem.analysis.invalidation}
                  onChange={(event) =>
                    updateDraftItem(activeDraftItem.ticker, (item) => ({
                      ...item,
                      analysis: { ...item.analysis, invalidation: event.target.value }
                    }))
                  }
                />
              </Field>
              <Field label="의사결정 메모 (줄바꿈 구분)">
                <Textarea
                  value={activeDraftItem.analysis.decisionNotes.join("\n")}
                  onChange={(event) =>
                    updateDraftItem(activeDraftItem.ticker, (item) => ({
                      ...item,
                      analysis: { ...item.analysis, decisionNotes: splitLines(event.target.value) }
                    }))
                  }
                />
              </Field>
              <Field label="운영 메모">
                <Textarea
                  value={activeDraftItem.operatorNote}
                  onChange={(event) =>
                    updateDraftItem(activeDraftItem.ticker, (item) => ({ ...item, operatorNote: event.target.value }))
                  }
                />
              </Field>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">왼쪽에서 종목을 선택하면 초안을 편집할 수 있습니다.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}