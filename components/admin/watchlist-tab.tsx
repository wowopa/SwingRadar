"use client";

import type { Dispatch, SetStateAction } from "react";
import { PlusCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { SymbolSearchItem, WatchlistChange, WatchlistEntry } from "@/components/admin/dashboard-types";
import { Field, WatchlistPreviewDialog, splitLines } from "@/components/admin/dashboard-shared";

export function WatchlistTab({
  symbolQuery,
  setSymbolQuery,
  onSearch,
  symbolResults,
  addWatchlistSymbol,
  loading,
  watchlist,
  activeWatchlistTicker,
  setActiveWatchlistTicker,
  activeWatchlist,
  setWatchlist,
  watchlistChanges,
  onSaveMetadata
}: {
  symbolQuery: string;
  setSymbolQuery: (value: string) => void;
  onSearch: () => void;
  symbolResults: SymbolSearchItem[];
  addWatchlistSymbol: (ticker: string) => void;
  loading: boolean;
  watchlist: WatchlistEntry[];
  activeWatchlistTicker: string;
  setActiveWatchlistTicker: (ticker: string) => void;
  activeWatchlist: WatchlistEntry | null;
  setWatchlist: Dispatch<SetStateAction<WatchlistEntry[]>>;
  watchlistChanges: WatchlistChange[];
  onSaveMetadata: () => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>종목 추가</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              준비 중인 종목을 감시리스트에 올리면 분석 파이프라인이 다시 실행됩니다.
            </p>
          </div>
          <div className="flex gap-2">
            <Input value={symbolQuery} onChange={(event) => setSymbolQuery(event.target.value)} placeholder="티커, 종목명, 섹터 검색" />
            <Button onClick={onSearch} variant="secondary">
              <Search className="h-4 w-4" />
              검색
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {symbolResults.length ? (
            symbolResults.map((item) => (
              <div key={item.ticker} className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/35 p-4">
                <div>
                  <p className="text-sm font-semibold text-white">{item.company}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.ticker} | {item.market} | {item.sector}
                  </p>
                </div>
                <Button onClick={() => addWatchlistSymbol(item.ticker)} disabled={loading || item.status === "ready"}>
                  <PlusCircle className="h-4 w-4" />
                  {item.status === "ready" ? "분석 가능" : "감시 추가"}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>메타데이터 보정</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              뉴스 쿼리, 키워드, 도메인 규칙을 조정하고 저장 전 diff로 검토합니다.
            </p>
          </div>
          <WatchlistPreviewDialog changes={watchlistChanges} disabled={!activeWatchlist || loading} onConfirm={onSaveMetadata} />
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="space-y-3">
            {watchlist.map((item) => (
              <button
                key={item.ticker}
                type="button"
                onClick={() => setActiveWatchlistTicker(item.ticker)}
                className={`w-full rounded-2xl border p-4 text-left ${
                  activeWatchlistTicker === item.ticker ? "border-primary/50 bg-primary/10" : "border-border/70 bg-secondary/35"
                }`}
              >
                <p className="text-sm font-semibold text-white">{item.company}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.ticker}</p>
              </button>
            ))}
          </div>
          <div className="space-y-4">
            {activeWatchlist ? (
              <>
                <Field label="섹터">
                  <Input
                    value={activeWatchlist.sector}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker ? { ...item, sector: event.target.value } : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="기본 뉴스 쿼리">
                  <Input
                    value={activeWatchlist.newsQuery}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker ? { ...item, newsQuery: event.target.value } : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="DART 회사코드">
                  <Input
                    value={activeWatchlist.dartCorpCode ?? ""}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker ? { ...item, dartCorpCode: event.target.value } : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="필수 키워드 (줄바꿈 구분)">
                  <Textarea
                    value={activeWatchlist.requiredKeywords.join("\n")}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker
                            ? { ...item, requiredKeywords: splitLines(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="컨텍스트 키워드 (줄바꿈 구분)">
                  <Textarea
                    value={activeWatchlist.contextKeywords.join("\n")}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker
                            ? { ...item, contextKeywords: splitLines(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="차단 키워드 (줄바꿈 구분)">
                  <Textarea
                    value={activeWatchlist.blockedKeywords.join("\n")}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker
                            ? { ...item, blockedKeywords: splitLines(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="선호 도메인 (줄바꿈 구분)">
                  <Textarea
                    value={activeWatchlist.preferredDomains.join("\n")}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker
                            ? { ...item, preferredDomains: splitLines(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="차단 도메인 (줄바꿈 구분)">
                  <Textarea
                    value={activeWatchlist.blockedDomains.join("\n")}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker
                            ? { ...item, blockedDomains: splitLines(event.target.value) }
                            : item
                        )
                      )
                    }
                  />
                </Field>
                <Field label="최소 기사 점수">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={String(activeWatchlist.minArticleScore)}
                    onChange={(event) =>
                      setWatchlist((current) =>
                        current.map((item) =>
                          item.ticker === activeWatchlist.ticker
                            ? { ...item, minArticleScore: Number(event.target.value || 0) }
                            : item
                        )
                      )
                    }
                  />
                </Field>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">왼쪽에서 감시리스트 종목을 선택하면 메타데이터를 수정할 수 있습니다.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}