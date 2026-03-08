"use client";

import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { CuratedNewsImpact, CuratedNewsItem } from "@/components/admin/dashboard-types";
import { Field, IMPACT_OPTIONS } from "@/components/admin/dashboard-shared";

export function NewsTab({
  activeNews,
  activeTicker,
  updateNewsItem,
  removeNewsItem,
  addNewsItem,
  onSave,
  disabled
}: {
  activeNews: CuratedNewsItem[];
  activeTicker: string;
  updateNewsItem: (id: string, updater: (item: CuratedNewsItem) => CuratedNewsItem) => void;
  removeNewsItem: (id: string) => void;
  addNewsItem: () => void;
  onSave: () => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>뉴스 큐레이션</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            기사 공백 구간은 운영 큐레이션으로 보강하고, 영향도와 운영 메모를 함께 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={addNewsItem} variant="secondary" disabled={!activeTicker}>
            <PlusCircle className="h-4 w-4" />
            뉴스 추가
          </Button>
          <Button onClick={onSave} disabled={disabled}>
            뉴스 저장
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeNews.length ? (
          activeNews.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="헤드라인">
                  <Input
                    value={item.headline}
                    onChange={(event) =>
                      updateNewsItem(item.id, (current) => ({ ...current, headline: event.target.value }))
                    }
                  />
                </Field>
                <Field label="출처">
                  <Input
                    value={item.source}
                    onChange={(event) =>
                      updateNewsItem(item.id, (current) => ({ ...current, source: event.target.value }))
                    }
                  />
                </Field>
                <Field label="URL">
                  <Input
                    value={item.url}
                    onChange={(event) => updateNewsItem(item.id, (current) => ({ ...current, url: event.target.value }))}
                  />
                </Field>
                <Field label="일자">
                  <Input
                    type="date"
                    value={item.date.slice(0, 10)}
                    onChange={(event) =>
                      updateNewsItem(item.id, (current) => ({ ...current, date: event.target.value }))
                    }
                  />
                </Field>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[160px_160px_1fr]">
                <Field label="영향도">
                  <select
                    className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground"
                    value={item.impact}
                    onChange={(event) =>
                      updateNewsItem(item.id, (current) => ({
                        ...current,
                        impact: event.target.value as CuratedNewsImpact
                      }))
                    }
                  >
                    {IMPACT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="고정 여부">
                  <label className="flex h-10 items-center gap-2 rounded-xl border border-border/70 px-3 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={item.pinned}
                      onChange={(event) =>
                        updateNewsItem(item.id, (current) => ({ ...current, pinned: event.target.checked }))
                      }
                    />
                    상단 고정
                  </label>
                </Field>
                <Field label="운영 메모">
                  <Input
                    value={item.operatorNote}
                    onChange={(event) =>
                      updateNewsItem(item.id, (current) => ({ ...current, operatorNote: event.target.value }))
                    }
                  />
                </Field>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                <Field label="요약">
                  <Textarea
                    value={item.summary}
                    onChange={(event) =>
                      updateNewsItem(item.id, (current) => ({ ...current, summary: event.target.value }))
                    }
                  />
                </Field>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => removeNewsItem(item.id)}>
                    삭제
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">선택한 종목의 큐레이션 뉴스가 없습니다. `뉴스 추가`로 직접 보강할 수 있습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}
