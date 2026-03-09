"use client";

import type { Dispatch, SetStateAction } from "react";
import { PlusCircle, Search } from "lucide-react";

import { Field, WatchlistPreviewDialog, splitLines } from "@/components/admin/dashboard-shared";
import type {
  SymbolSearchItem,
  WatchlistChange,
  WatchlistEntry,
  WatchlistSyncStatus
} from "@/components/admin/dashboard-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTimeShort } from "@/lib/utils";

function getSyncTone(state: WatchlistSyncStatus["state"]) {
  if (state === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (state === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (state === "syncing") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-border/70 bg-secondary/50 text-muted-foreground";
}

function getSyncLabel(state: WatchlistSyncStatus["state"]) {
  if (state === "ready") {
    return "\uBC18\uC601 \uC644\uB8CC";
  }
  if (state === "failed") {
    return "\uBC18\uC601 \uC2E4\uD328";
  }
  if (state === "syncing") {
    return "\uBC18\uC601 \uC911";
  }
  return "\uB300\uAE30";
}

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
  watchlistSyncStatuses,
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
  watchlistSyncStatuses: Record<string, WatchlistSyncStatus>;
  watchlistChanges: WatchlistChange[];
  onSaveMetadata: () => void;
}) {
  const activeSyncStatus = activeWatchlist ? watchlistSyncStatuses[activeWatchlist.ticker] ?? null : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{"\uC885\uBAA9 \uCD94\uAC00"}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {"\uC900\uBE44 \uC911\uC778 \uC885\uBAA9\uC744 watchlist\uC5D0 \uB123\uC73C\uBA74 \uBD84\uC11D \uD750\uB984\uC5D0 \uB2E4\uC2DC \uBC18\uC601\uB429\uB2C8\uB2E4."}
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={symbolQuery}
              onChange={(event) => setSymbolQuery(event.target.value)}
              placeholder="\uD2F0\uCEE4, \uC885\uBAA9\uBA85, \uC139\uD130 \uAC80\uC0C9"
            />
            <Button onClick={onSearch} variant="secondary">
              <Search className="h-4 w-4" />
              {"\uAC80\uC0C9"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {symbolResults.length ? (
            symbolResults.map((item) => (
              <div key={item.ticker} className="flex items-center justify-between rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.company}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.ticker} | {item.market} | {item.sector}
                  </p>
                </div>
                <Button onClick={() => addWatchlistSymbol(item.ticker)} disabled={loading || item.status === "ready"}>
                  <PlusCircle className="h-4 w-4" />
                  {item.status === "ready" ? "\uD3B8\uC785 \uC644\uB8CC" : "watchlist \uCD94\uAC00"}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{"\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{"\uC885\uBAA9 \uC124\uC815 \uBCF4\uC815"}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {"\uAC80\uC0C9\uC5B4, \uD0A4\uC6CC\uB4DC, \uB3C4\uBA54\uC778 \uADDC\uCE59\uC744 \uB2E4\uB4EC\uACE0 \uC800\uC7A5 \uC804 \uCC28\uC774\uB97C \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}
            </p>
          </div>
          <WatchlistPreviewDialog changes={watchlistChanges} disabled={!activeWatchlist || loading} onConfirm={onSaveMetadata} />
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="space-y-3">
            {watchlist.map((item) => {
              const syncStatus = watchlistSyncStatuses[item.ticker];

              return (
                <button
                  key={item.ticker}
                  type="button"
                  onClick={() => setActiveWatchlistTicker(item.ticker)}
                  className={`w-full rounded-[24px] border p-4 text-left transition-colors ${
                    activeWatchlistTicker === item.ticker ? "border-primary/35 bg-primary/10" : "border-border/70 bg-secondary/45"
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{item.company}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{item.ticker}</p>
                    {syncStatus ? (
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getSyncTone(syncStatus.state)}`}>
                        {getSyncLabel(syncStatus.state)}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="space-y-4">
            {activeWatchlist ? (
              <>
                {activeSyncStatus ? (
                  <div className="rounded-[24px] border border-border/70 bg-secondary/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{"\uBC18\uC601 \uC0C1\uD0DC"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{activeSyncStatus.message}</p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSyncTone(
                          activeSyncStatus.state
                        )}`}
                      >
                        {getSyncLabel(activeSyncStatus.state)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {activeSyncStatus.lastStartedAt ? (
                        <span>{"\uC2DC\uC791"} {formatDateTimeShort(activeSyncStatus.lastStartedAt)}</span>
                      ) : null}
                      {activeSyncStatus.lastCompletedAt ? (
                        <span>{"\uC644\uB8CC"} {formatDateTimeShort(activeSyncStatus.lastCompletedAt)}</span>
                      ) : null}
                      {activeSyncStatus.lastDurationMs !== null ? (
                        <span>{Math.max(1, Math.round(activeSyncStatus.lastDurationMs / 1000))}{"\uCD08 \uC18C\uC694"}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <Field label="\uC139\uD130">
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
                <Field label="\uAE30\uBCF8 \uB274\uC2A4 \uAC80\uC0C9\uC5B4">
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
                <Field label="DART \uD68C\uC0AC\uCF54\uB4DC">
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
                <Field label="\uD544\uC218 \uD0A4\uC6CC\uB4DC (\uC904\uBC14\uAFC8 \uAD6C\uBD84)">
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
                <Field label="\uBB38\uB9E5 \uD0A4\uC6CC\uB4DC (\uC904\uBC14\uAFC8 \uAD6C\uBD84)">
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
                <Field label="\uCC28\uB2E8 \uD0A4\uC6CC\uB4DC (\uC904\uBC14\uAFC8 \uAD6C\uBD84)">
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
                <Field label="\uC120\uD638 \uB3C4\uBA54\uC778 (\uC904\uBC14\uAFC8 \uAD6C\uBD84)">
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
                <Field label="\uCC28\uB2E8 \uB3C4\uBA54\uC778 (\uC904\uBC14\uAFC8 \uAD6C\uBD84)">
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
                <Field label="\uCD5C\uC18C \uAE30\uC0AC \uC810\uC218">
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
              <p className="text-sm text-muted-foreground">
                {"\uC67C\uCABD\uC5D0\uC11C watchlist \uC885\uBAA9\uC744 \uACE0\uB974\uBA74 \uC124\uC815\uC744 \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
