"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

type SearchItem = {
  ticker: string;
  company: string;
  sector: string;
  market: "KOSPI" | "KOSDAQ";
  status: "ready" | "pending";
};

type SearchResponse = {
  items: SearchItem[];
  query: string;
};

function StatusBadge({ status }: { status: SearchItem["status"] }) {
  if (status === "ready") {
    return (
      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
        분석 가능
      </span>
    );
  }

  return (
    <span className="rounded-full border border-border/80 px-2 py-1 text-[11px] font-medium text-muted-foreground">
      준비중
    </span>
  );
}

export function GlobalSymbolSearch() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [focused, setFocused] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const search = deferredQuery.trim();
      const url = search ? `/api/symbols?q=${encodeURIComponent(search)}&limit=12` : "/api/symbols?limit=12";
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as SearchResponse;
      if (!ignore) {
        setItems(payload.items);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [deferredQuery]);

  const showDropdown = focused && (query.trim().length > 0 || items.length > 0);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder="티커 또는 종목명 검색"
          className="pl-9"
        />
      </div>
      {showDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-2xl border border-border/80 bg-card/95 p-2 shadow-glow backdrop-blur">
          {items.length ? (
            items.map((item) =>
              item.status === "ready" ? (
                <Link
                  key={item.ticker}
                  href={`/analysis/${item.ticker}`}
                  className="block rounded-xl px-3 py-2 transition hover:bg-accent"
                  onClick={() => setQuery("")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">{item.company}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.ticker} · {item.market} · {item.sector}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-primary">분석 보기</span>
                    </div>
                  </div>
                </Link>
              ) : (
                <Link
                  key={item.ticker}
                  href={`/admin?tab=watchlist&q=${encodeURIComponent(item.ticker)}&returnTo=${encodeURIComponent(`/analysis/${item.ticker}`)}`}
                  className="block rounded-xl px-3 py-2 transition hover:bg-accent"
                  onClick={() => setQuery("")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">{item.company}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.ticker} · {item.market} · {item.sector}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-primary">운영실에 추가</span>
                    </div>
                  </div>
                </Link>
              )
            )
          ) : (
            <div className="px-3 py-4 text-sm text-muted-foreground">일치하는 종목이 없습니다.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
