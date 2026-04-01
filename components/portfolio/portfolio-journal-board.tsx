"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildPortfolioCloseReview,
  getPortfolioJournalSummary,
  groupPortfolioJournalByTicker,
  isClosingPortfolioTradeEventType
} from "@/lib/portfolio/journal-insights";
import { cn, formatPrice } from "@/lib/utils";
import type { PortfolioJournal, PortfolioProfilePosition, PortfolioTradeEventType } from "@/types/recommendation";

type SymbolSearchItem = {
  ticker: string;
  company: string;
  sector: string;
  market: "KOSPI" | "KOSDAQ" | "NYSE" | "NASDAQ" | "AMEX";
  status: "ready" | "pending";
};

type SymbolSearchResponse = {
  items: SymbolSearchItem[];
  mode: "search" | "featured";
  description: string;
};

const tradeTypeMeta: Record<
  PortfolioTradeEventType,
  {
    label: string;
    variant: "default" | "positive" | "neutral" | "caution" | "secondary";
    description: string;
  }
> = {
  buy: {
    label: "첫 매수",
    variant: "positive",
    description: "포지션을 처음 여는 체결입니다."
  },
  add: {
    label: "추가 매수",
    variant: "default",
    description: "기존 포지션에 수량을 더한 체결입니다."
  },
  take_profit_partial: {
    label: "부분 익절",
    variant: "neutral",
    description: "일부 수량만 먼저 정리한 체결입니다."
  },
  exit_full: {
    label: "전량 매도",
    variant: "secondary",
    description: "남은 수량을 모두 정리한 체결입니다."
  },
  stop_loss: {
    label: "손절",
    variant: "caution",
    description: "손절 기준에 따라 종료한 체결입니다."
  },
  manual_exit: {
    label: "수동 종료",
    variant: "secondary",
    description: "운용 판단으로 정리한 체결입니다."
  }
};

type TradeEventFormState = {
  ticker: string;
  type: PortfolioTradeEventType;
  quantity: string;
  price: string;
  fees: string;
  tradedAt: string;
  note: string;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul"
  }).format(date);
}

function formatQuantity(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}주`;
}

function buildLocalDateTimeInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoFromLocalInput(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseNonNegativeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function createEmptyFormState(): TradeEventFormState {
  return {
    ticker: "",
    type: "buy",
    quantity: "",
    price: "",
    fees: "0",
    tradedAt: buildLocalDateTimeInputValue(),
    note: ""
  };
}

function formatSignedPrice(value: number) {
  if (value === 0) {
    return formatPrice(0);
  }

  return `${value > 0 ? "+" : "-"}${formatPrice(Math.abs(value))}`;
}

export function PortfolioJournalBoard({
  initialJournal,
  positions
}: {
  initialJournal: PortfolioJournal;
  positions: PortfolioProfilePosition[];
}) {
  const symbolFieldRef = useRef<HTMLDivElement | null>(null);
  const [journal, setJournal] = useState(initialJournal);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<TradeEventFormState>(createEmptyFormState());
  const [symbolQuery, setSymbolQuery] = useState("");
  const [symbolResults, setSymbolResults] = useState<SymbolSearchItem[]>([]);
  const [symbolDescription, setSymbolDescription] = useState("검색어를 입력하면 종목을 바로 고를 수 있습니다.");
  const [symbolSearchLoading, setSymbolSearchLoading] = useState(false);
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setJournal(initialJournal);
  }, [initialJournal]);

  useEffect(() => {
    if (!isDialogOpen) {
      setIsSymbolDropdownOpen(false);
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!symbolFieldRef.current?.contains(event.target as Node)) {
        setIsSymbolDropdownOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSymbolDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDialogOpen]);

  const groupedEvents = useMemo(() => groupPortfolioJournalByTicker(journal.events), [journal.events]);
  const summary = useMemo(() => getPortfolioJournalSummary(journal.events), [journal.events]);
  const quickTickers = useMemo(() => {
    const keys = new Map<string, PortfolioProfilePosition>();
    for (const position of positions) {
      keys.set(position.ticker, position);
    }
    return [...keys.values()].slice(0, 6);
  }, [positions]);

  const selectedSymbol = useMemo(() => {
    if (!form.ticker) {
      return null;
    }

    return (
      symbolResults.find((item) => item.ticker === form.ticker) ??
      quickTickers.find((item) => item.ticker === form.ticker) ??
      null
    );
  }, [form.ticker, quickTickers, symbolResults]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    let ignore = false;
    setSymbolSearchLoading(true);

    async function loadSymbols() {
      const query = symbolQuery.trim();
      const response = await fetch(`/api/symbols?q=${encodeURIComponent(query)}&limit=8`, {
        cache: "no-store"
      });

      if (!response.ok) {
        if (!ignore) {
          setSymbolResults([]);
          setSymbolDescription("종목 검색 결과를 불러오지 못했습니다.");
          setSymbolSearchLoading(false);
        }
        return;
      }

      const payload = (await response.json()) as SymbolSearchResponse;
      if (!ignore) {
        setSymbolResults(payload.items);
        setSymbolDescription(payload.description);
        setSymbolSearchLoading(false);
      }
    }

    void loadSymbols();

    return () => {
      ignore = true;
    };
  }, [isDialogOpen, symbolQuery]);

  function applySelectedSymbol(item: Pick<SymbolSearchItem, "ticker" | "company">) {
    setForm((current) => ({
      ...current,
      ticker: item.ticker
    }));
    setSymbolQuery(item.company);
    setIsSymbolDropdownOpen(false);
  }

  async function submitEvent() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/account/portfolio-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: form.ticker,
          type: form.type,
          quantity: parsePositiveNumber(form.quantity),
          price: parsePositiveNumber(form.price),
          fees: parseNonNegativeNumber(form.fees),
          tradedAt: toIsoFromLocalInput(form.tradedAt),
          note: form.note.trim()
        })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        journal?: PortfolioJournal;
      };

      if (!response.ok || !payload.journal) {
        throw new Error(payload.message ?? `체결 기록 저장에 실패했습니다. (${response.status})`);
      }

      setJournal(payload.journal);
      setMessage("체결 기록을 저장했습니다.");
      setIsDialogOpen(false);
      setForm(createEmptyFormState());
      setSymbolQuery("");
      setIsSymbolDropdownOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "체결 기록 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-foreground">거래 저널</CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                첫 매수부터 부분 익절, 손절, 전량 매도까지 실제 체결을 남기면 종목별 생애주기가 순서대로 쌓입니다.
              </p>
            </div>
            <Button type="button" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              체결 기록 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <div className="rounded-[20px] border border-primary/24 bg-[linear-gradient(180deg,rgba(139,107,46,0.08),rgba(255,255,255,0.94))] px-4 py-3 text-sm text-foreground/82">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-[20px] border border-caution/22 bg-[hsl(var(--caution)/0.08)] px-4 py-3 text-sm text-caution">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <JournalMetric title="전체 체결" value={`${summary.totalEvents}건`} note="기록된 체결 이벤트 수" />
            <JournalMetric title="보유 중 포지션" value={`${summary.activeCount}개`} note="마지막 이벤트가 종료가 아닌 종목" />
            <JournalMetric title="종료된 포지션" value={`${summary.closedCount}개`} note="전량 매도나 손절로 마감된 종목" />
            <JournalMetric title="부분 익절" value={`${summary.partialExitCount}건`} note="일부 수량만 먼저 정리한 기록" />
            <JournalMetric title="손절" value={`${summary.stopLossCount}건`} note="손절로 종료된 기록" />
          </div>
        </CardContent>
      </Card>

      {groupedEvents.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {groupedEvents.map((group) => {
            const isClosed = isClosingPortfolioTradeEventType(group.latestEvent.type);
            const review = buildPortfolioCloseReview(group);

            return (
              <Card key={group.ticker} className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
                <CardHeader className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg text-foreground">
                        {group.company} <span className="text-sm font-medium text-muted-foreground">{group.ticker}</span>
                      </CardTitle>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {group.sector} · 이벤트 {group.events.length}건
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isClosed ? "secondary" : "positive"}>{isClosed ? "종료" : "보유 중"}</Badge>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/portfolio/${group.ticker}`}>상세 보기</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <JournalMiniMetric
                      label="남은 수량"
                      value={group.metrics.remainingQuantity > 0 ? formatQuantity(group.metrics.remainingQuantity) : "0주"}
                    />
                    <JournalMiniMetric
                      label="평균 단가"
                      value={group.metrics.remainingQuantity > 0 ? formatPrice(group.metrics.averageCost) : "종료"}
                    />
                    <JournalMiniMetric label="실현 손익" value={formatSignedPrice(group.metrics.realizedPnl)} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {isClosed ? (
                    <div className="rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,241,232,0.88))] px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">종료 회고</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{review.headline}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.summary}</p>
                    </div>
                  ) : null}

                  {group.events.map((event, index) => {
                    const meta = tradeTypeMeta[event.type];

                    return (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex w-14 shrink-0 flex-col items-center pt-1">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {index === 0 ? "latest" : `#${index + 1}`}
                          </span>
                          {index !== group.events.length - 1 ? <span className="mt-2 h-full w-px bg-border/80" /> : null}
                        </div>

                        <div className="flex-1 rounded-[20px] border border-border/80 bg-[hsl(42_38%_97%)] px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={meta.variant}>{meta.label}</Badge>
                              <span className="text-xs text-muted-foreground">{formatDateTime(event.tradedAt)}</span>
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              {formatPrice(event.price)} · {formatQuantity(event.quantity)}
                            </span>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-foreground/82">{meta.description}</p>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>수수료 {formatPrice(event.fees ?? 0)}</span>
                            <span>기록자 {event.createdBy}</span>
                          </div>

                          {event.note ? (
                            <p className="mt-3 rounded-2xl border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,241,232,0.88))] px-3 py-3 text-xs leading-5 text-muted-foreground">
                              {event.note}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border/80 bg-white/90 shadow-[0_18px_44px_-34px_rgba(24,32,42,0.2)]">
          <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ScrollText className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-foreground">아직 기록된 체결이 없습니다.</p>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                첫 매수나 부분 익절부터 기록하기 시작하면 여기서 종목별 생애주기와 종료 결과를 한 번에 볼 수 있습니다.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(true)}>
              첫 체결 기록 추가
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,241,232,0.92))] shadow-[0_38px_110px_-44px_rgba(24,32,42,0.34)]">
          <DialogHeader>
            <DialogTitle>체결 기록 추가</DialogTitle>
            <DialogDescription>
              첫 매수, 추가 매수, 부분 익절, 전량 매도, 손절 가운데 실제 체결에 맞는 항목을 선택해 기록합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(
                Object.entries(tradeTypeMeta) as Array<
                  [PortfolioTradeEventType, (typeof tradeTypeMeta)[PortfolioTradeEventType]]
                >
              ).map(([type, meta]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, type }))}
                  className={cn(
                    "rounded-[20px] border px-4 py-4 text-left transition",
                    form.type === type
                      ? "border-primary/30 bg-primary/10"
                      : "border-border/80 bg-[hsl(42_40%_97%)] hover:border-primary/20 hover:bg-white"
                  )}
                >
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{meta.description}</p>
                </button>
              ))}
            </div>

            {quickTickers.length ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">현재 보유 종목 빠른 선택</p>
                <div className="flex flex-wrap gap-2">
                  {quickTickers.map((position) => (
                    <button
                      key={position.ticker}
                      type="button"
                      className="rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/20 hover:bg-white hover:text-foreground"
                      onClick={() => applySelectedSymbol({ ticker: position.ticker, company: position.company })}
                    >
                      {position.company} · {position.ticker}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="종목 검색">
                <div ref={symbolFieldRef} className="relative space-y-3">
                  <Input
                    value={symbolQuery}
                    placeholder="종목명이나 종목 코드를 입력하세요"
                    onChange={(event) => {
                      setSymbolQuery(event.target.value);
                      setIsSymbolDropdownOpen(true);
                    }}
                    onFocus={() => setIsSymbolDropdownOpen(true)}
                  />

                  {selectedSymbol ? (
                    <div className="rounded-[18px] border border-primary/24 bg-[linear-gradient(180deg,rgba(139,107,46,0.08),rgba(255,255,255,0.94))] px-3 py-3 text-sm text-foreground/82">
                      선택된 종목: {selectedSymbol.company} · {form.ticker}
                    </div>
                  ) : form.ticker ? (
                    <div className="rounded-[18px] border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-3 text-sm text-muted-foreground">
                      선택된 종목 코드: {form.ticker}
                    </div>
                  ) : null}

                  {isSymbolDropdownOpen ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,241,232,0.94))] p-2 shadow-[0_24px_48px_rgba(28,28,35,0.14)]">
                      <div className="px-2 pb-2 pt-1 text-xs leading-5 text-muted-foreground">
                        {symbolSearchLoading ? "종목을 찾는 중입니다..." : symbolDescription}
                      </div>

                      <div className="max-h-72 space-y-1 overflow-y-auto">
                        {symbolResults.length ? (
                          symbolResults.map((item) => (
                            <button
                              key={item.ticker}
                              type="button"
                              onClick={() => applySelectedSymbol(item)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-[16px] px-3 py-3 text-left transition",
                                form.ticker === item.ticker
                                  ? "bg-primary/10 text-foreground"
                                  : "hover:bg-[hsl(42_40%_96%)]"
                              )}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{item.company}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {item.ticker} · {item.market} · {item.sector}
                                </p>
                              </div>
                              <Badge variant={item.status === "ready" ? "positive" : "secondary"}>
                                {item.status === "ready" ? "분석 가능" : "준비 중"}
                              </Badge>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-sm text-muted-foreground">검색 결과가 없습니다.</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </Field>

              <Field label="체결 시각">
                <Input
                  type="datetime-local"
                  value={form.tradedAt}
                  onChange={(event) => setForm((current) => ({ ...current, tradedAt: event.target.value }))}
                />
              </Field>

              <Field label="체결 가격">
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                />
              </Field>

              <Field label="수량">
                <Input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                />
              </Field>

              <Field label="수수료">
                <Input
                  type="number"
                  min={0}
                  value={form.fees}
                  onChange={(event) => setForm((current) => ({ ...current, fees: event.target.value }))}
                />
              </Field>
            </div>

            <Field label="메모">
              <Textarea
                value={form.note}
                placeholder="예: 장초 확인 통과 후 첫 진입, 1차 목표가 도달로 30% 부분 익절"
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              />
            </Field>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                닫기
              </Button>
              <Button
                type="button"
                disabled={
                  loading ||
                  !form.ticker.trim() ||
                  parsePositiveNumber(form.price) <= 0 ||
                  parsePositiveNumber(form.quantity) <= 0
                }
                onClick={() => void submitEvent()}
              >
                기록 저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function JournalMetric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-[22px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] p-4">
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function JournalMiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
