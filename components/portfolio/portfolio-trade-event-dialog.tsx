"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { PortfolioProfilePayload } from "@/components/admin/dashboard-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildTradeNoteTemplates,
  buildTradeTagSuggestions
} from "@/lib/portfolio/trade-note-templates";
import type { PortfolioStateConsistencyReport } from "@/lib/portfolio/portfolio-state-consistency";
import { cn } from "@/lib/utils";
import type {
  PortfolioJournal,
  PortfolioProfilePosition,
  PortfolioTradeEvent,
  PortfolioTradeEventType
} from "@/types/recommendation";

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

type TradeTypeMeta = {
  label: string;
  variant: "default" | "positive" | "neutral" | "caution" | "secondary";
  description: string;
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

export type PortfolioTradeEventDialogPreset = {
  title?: string;
  description?: string;
  saveButtonLabel?: string;
  ticker?: string;
  company?: string;
  sector?: string;
  type?: PortfolioTradeEventType;
  quantity?: number;
  price?: number;
  fees?: number;
  tradedAt?: string;
  note?: string;
  priceOptions?: Array<{ label: string; value: number }>;
  noteTemplates?: string[];
  syncProfilePosition?: boolean;
  maxQuantity?: number;
  lockTicker?: boolean;
  lockType?: boolean;
};

const tradeTypeMeta: Record<PortfolioTradeEventType, TradeTypeMeta> = {
  buy: {
    label: "첫 매수",
    variant: "positive",
    description: "포지션을 처음 여는 체결입니다."
  },
  add: {
    label: "추가 매수",
    variant: "default",
    description: "기존 보유에 수량을 더하는 체결입니다."
  },
  take_profit_partial: {
    label: "부분 익절",
    variant: "neutral",
    description: "일부 수량만 먼저 정리하는 체결입니다."
  },
  exit_full: {
    label: "전량 매도",
    variant: "secondary",
    description: "남은 수량 전체를 정리하는 체결입니다."
  },
  stop_loss: {
    label: "손절",
    variant: "caution",
    description: "손절 기준에 따른 종료 체결입니다."
  },
  manual_exit: {
    label: "수동 종료",
    variant: "secondary",
    description: "사용자 판단으로 종료하는 체결입니다."
  }
};

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

function formatQuantity(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}주`;
}

function formatQuantityInput(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/\.?0+$/, "");
}

function createFormState(preset?: PortfolioTradeEventDialogPreset | null): TradeEventFormState {
  return {
    ticker: preset?.ticker ?? "",
    type: preset?.type ?? "buy",
    quantity: typeof preset?.quantity === "number" ? formatQuantityInput(preset.quantity) : "",
    price: typeof preset?.price === "number" ? String(preset.price) : "",
    fees: typeof preset?.fees === "number" ? String(preset.fees) : "0",
    tradedAt: preset?.tradedAt ?? buildLocalDateTimeInputValue(),
    note: preset?.note ?? ""
  };
}

function buildSellQuantityOptions(type: PortfolioTradeEventType, maxQuantity?: number) {
  if (!maxQuantity || maxQuantity <= 0) {
    return [];
  }

  if (type === "take_profit_partial") {
    const quarter = maxQuantity >= 4 ? Math.max(1, Math.round(maxQuantity * 0.25)) : 0;
    const half = maxQuantity >= 2 ? Math.max(1, Math.round(maxQuantity * 0.5)) : maxQuantity;
    const values = [quarter, half]
      .filter((value) => value > 0 && value < maxQuantity)
      .filter((value, index, array) => array.indexOf(value) === index);

    return values.map((value) => ({
      label: `${Math.round((value / maxQuantity) * 100)}%`,
      value
    }));
  }

  return [{ label: "전량", value: maxQuantity }];
}

function appendNoteTemplate(currentNote: string, template: string) {
  const trimmedCurrent = currentNote.trim();
  if (!trimmedCurrent) {
    return template;
  }

  if (trimmedCurrent.includes(template)) {
    return currentNote;
  }

  return `${trimmedCurrent}, ${template}`;
}

function buildDefaultNoteTemplates(type: PortfolioTradeEventType) {
  switch (type) {
    case "add":
      return ["눌림 확인 후 추가 매수", "장초 확인 통과 후 추가", "평단 보강 목적 추가"];
    case "take_profit_partial":
      return ["1차 목표 도달 후 부분 익절", "이익 일부 확보", "반응 둔화로 일부 정리"];
    case "stop_loss":
      return ["손절 기준 이탈", "확인 가격 실패 후 손절", "보호 가격 이탈"];
    case "exit_full":
      return ["목표 구간 도달 후 전량 정리", "보유 계획 종료", "수동 전량 정리"];
    case "manual_exit":
      return ["장중 수동 정리", "계획 재검토 후 종료", "보유 우선순위 재배치"];
    default:
      return ["장초 확인 통과 후 첫 진입", "계획 진입 구간 진입", "시그널 확인 후 매수"];
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function PortfolioTradeEventDialog({
  open,
  onOpenChange,
  positions,
  recentEvents = [],
  currentJournal,
  currentProfile,
  preset,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positions: PortfolioProfilePosition[];
  recentEvents?: PortfolioTradeEvent[];
  currentJournal?: PortfolioJournal;
  currentProfile?: PortfolioProfilePayload;
  preset?: PortfolioTradeEventDialogPreset | null;
  onSaved?: (payload: {
    event: PortfolioTradeEvent;
    journal: PortfolioJournal;
    profile?: PortfolioProfilePayload;
    consistency?: PortfolioStateConsistencyReport;
    previousJournal?: PortfolioJournal;
    previousProfile?: PortfolioProfilePayload;
  }) => void;
}) {
  const symbolFieldRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<TradeEventFormState>(() => createFormState(preset));
  const [symbolQuery, setSymbolQuery] = useState(preset?.company ?? "");
  const [symbolResults, setSymbolResults] = useState<SymbolSearchItem[]>([]);
  const [symbolDescription, setSymbolDescription] = useState(
    "검색어를 입력하면 종목명이나 종목 코드로 바로 찾을 수 있습니다."
  );
  const [symbolSearchLoading, setSymbolSearchLoading] = useState(false);
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quickTickers = useMemo(() => {
    const keys = new Map<string, PortfolioProfilePosition>();
    for (const position of positions) {
      keys.set(position.ticker, position);
    }
    return [...keys.values()].slice(0, 6);
  }, [positions]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(createFormState(preset));
    setSymbolQuery(preset?.company ?? "");
    setMessage(null);
    setError(null);
    setIsSymbolDropdownOpen(false);
  }, [open, preset]);

  useEffect(() => {
    if (!open) {
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
  }, [open]);

  useEffect(() => {
    if (!open || preset?.lockTicker) {
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
  }, [open, preset?.lockTicker, symbolQuery]);

  const selectedPosition = useMemo(
    () => positions.find((position) => position.ticker === form.ticker) ?? null,
    [form.ticker, positions]
  );

  const selectedSymbol = useMemo(() => {
    if (!form.ticker) {
      return null;
    }

    return (
      symbolResults.find((item) => item.ticker === form.ticker) ??
      quickTickers.find((item) => item.ticker === form.ticker) ??
      (preset?.ticker === form.ticker
        ? {
            ticker: preset.ticker,
            company: preset.company ?? preset.ticker,
            sector: preset.sector ?? selectedPosition?.sector ?? "미분류",
            market: "KOSPI",
            status: "ready" as const
          }
        : null)
    );
  }, [form.ticker, preset?.company, preset?.sector, preset?.ticker, quickTickers, selectedPosition?.sector, symbolResults]);

  const maxQuantity = preset?.maxQuantity ?? selectedPosition?.quantity;
  const quantityOptions = useMemo(() => buildSellQuantityOptions(form.type, maxQuantity), [form.type, maxQuantity]);
  const priceOptions = useMemo(() => {
    const items = preset?.priceOptions ?? [];
    return items.filter(
      (item, index, array) =>
        Number.isFinite(item.value) &&
        item.value > 0 &&
        array.findIndex((entry) => Math.abs(entry.value - item.value) < 0.0001) === index
    );
  }, [preset?.priceOptions]);
  const noteTemplates = useMemo(() => {
    const merged = [
      ...(preset?.noteTemplates ?? []),
      ...buildTradeNoteTemplates(recentEvents, { ticker: form.ticker, type: form.type }),
      ...buildDefaultNoteTemplates(form.type)
    ];
    return merged.filter((item, index) => merged.indexOf(item) === index);
  }, [form.ticker, form.type, preset?.noteTemplates, recentEvents]);
  const tagSuggestions = useMemo(
    () => buildTradeTagSuggestions(recentEvents, { ticker: form.ticker, type: form.type }),
    [form.ticker, form.type, recentEvents]
  );
  const shouldSyncProfilePosition = preset?.syncProfilePosition ?? true;
  const enteredQuantity = parsePositiveNumber(form.quantity);
  const quantityOverflow = Boolean(
    shouldSyncProfilePosition &&
      typeof maxQuantity === "number" &&
      maxQuantity > 0 &&
      enteredQuantity > maxQuantity
  );

  function applySelectedSymbol(item: Pick<SymbolSearchItem, "ticker" | "company">) {
    setForm((current) => ({
      ...current,
      ticker: item.ticker
    }));
    setSymbolQuery(item.company);
    setIsSymbolDropdownOpen(false);
  }

  async function submitEvent() {
    if (quantityOverflow) {
      setError(`보유 수량 ${formatQuantity(maxQuantity ?? 0)} 안에서만 기록할 수 있습니다.`);
      return;
    }

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
          quantity: enteredQuantity,
          price: parsePositiveNumber(form.price),
          fees: parseNonNegativeNumber(form.fees),
          tradedAt: toIsoFromLocalInput(form.tradedAt),
          note: form.note.trim(),
          syncProfilePosition: shouldSyncProfilePosition
        })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        event?: PortfolioTradeEvent;
        journal?: PortfolioJournal;
        profile?: PortfolioProfilePayload;
        consistency?: PortfolioStateConsistencyReport;
      };

      if (!response.ok || !payload.journal || !payload.event) {
        throw new Error(payload.message ?? `체결 기록 저장에 실패했습니다. (${response.status})`);
      }

      setMessage("체결 기록을 저장했습니다.");
      onSaved?.({
        event: payload.event,
          journal: payload.journal,
          profile: payload.profile,
          consistency: payload.consistency,
          previousJournal: currentJournal,
          previousProfile: currentProfile
        });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "체결 기록 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const dialogTitle = preset?.title ?? "체결 기록 추가";
  const dialogDescription =
    preset?.description ??
    "첫 매수, 추가 매수, 부분 익절, 전량 매도, 손절 중 하나를 골라 체결을 기록합니다.";
  const saveButtonLabel = preset?.saveButtonLabel ?? "기록 저장";
  const tickerLocked = Boolean(preset?.lockTicker);
  const typeLocked = Boolean(preset?.lockType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,241,232,0.92))] shadow-[0_38px_110px_-44px_rgba(24,32,42,0.34)]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
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

          {typeLocked ? (
            <div className="rounded-[20px] border border-border/80 bg-[hsl(42_40%_97%)] px-4 py-4">
              <Badge variant={tradeTypeMeta[form.type].variant}>{tradeTypeMeta[form.type].label}</Badge>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{tradeTypeMeta[form.type].description}</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(Object.entries(tradeTypeMeta) as Array<[PortfolioTradeEventType, TradeTypeMeta]>).map(([type, meta]) => (
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
          )}

          {!tickerLocked && quickTickers.length ? (
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
            <Field label="종목">
              {tickerLocked ? (
                <div className="rounded-[18px] border border-primary/24 bg-[linear-gradient(180deg,rgba(139,107,46,0.08),rgba(255,255,255,0.94))] px-3 py-3 text-sm text-foreground/82">
                  {selectedSymbol?.company ?? preset?.company ?? form.ticker} · {form.ticker}
                </div>
              ) : (
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
                                form.ticker === item.ticker ? "bg-primary/10 text-foreground" : "hover:bg-[hsl(42_40%_96%)]"
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
              )}
            </Field>

            <Field label="체결 시각">
              <Input
                type="datetime-local"
                value={form.tradedAt}
                onChange={(event) => setForm((current) => ({ ...current, tradedAt: event.target.value }))}
              />
            </Field>

            <Field label="체결 가격">
              <div className="space-y-3">
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                />
                {priceOptions.length ? (
                  <div className="flex flex-wrap gap-2">
                    {priceOptions.map((option) => (
                      <button
                        key={`${option.label}-${option.value}`}
                        type="button"
                        className="rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/20 hover:bg-white hover:text-foreground"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            price: String(option.value)
                          }))
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </Field>

            <Field label="수량">
              <div className="space-y-3">
                <Input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                />
                {quantityOptions.length ? (
                  <div className="flex flex-wrap gap-2">
                    {quantityOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        className="rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/20 hover:bg-white hover:text-foreground"
                        onClick={() =>
                          setForm((current) => ({ ...current, quantity: formatQuantityInput(option.value) }))
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                    {typeof maxQuantity === "number" ? (
                      <span className="inline-flex items-center rounded-full border border-border/70 bg-white/84 px-3 py-1.5 text-xs text-muted-foreground">
                        보유 {formatQuantity(maxQuantity)}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {quantityOverflow ? (
                  <p className="text-xs leading-5 text-caution">
                    보유 수량 {formatQuantity(maxQuantity ?? 0)} 안에서만 기록할 수 있습니다.
                  </p>
                ) : null}
              </div>
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
            <div className="space-y-3">
              <Textarea
                value={form.note}
                placeholder="예: 장초 확인 통과 후 첫 진입, 1차 목표가 도달해 30% 부분 익절"
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              />
              {tagSuggestions.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    최근 전략 태그
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="rounded-full border border-primary/18 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary/32 hover:bg-primary/12"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            note: appendNoteTemplate(current.note, tag)
                          }))
                        }
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {noteTemplates.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    최근 메모 문장
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {noteTemplates.map((template) => (
                      <button
                        key={template}
                        type="button"
                        className="rounded-full border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/20 hover:bg-white hover:text-foreground"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            note: appendNoteTemplate(current.note, template)
                          }))
                        }
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Field>

          {shouldSyncProfilePosition ? (
            <div className="rounded-[20px] border border-primary/24 bg-[linear-gradient(180deg,rgba(139,107,46,0.08),rgba(255,255,255,0.94))] px-4 py-3 text-sm leading-6 text-foreground/82">
              저장하면 거래 기록과 함께 현재 보유 수량, 가용 현금도 같이 반영합니다.
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
            <Button
              type="button"
              disabled={
                loading ||
                !form.ticker.trim() ||
                parsePositiveNumber(form.price) <= 0 ||
                parsePositiveNumber(form.quantity) <= 0 ||
                quantityOverflow
              }
              onClick={() => void submitEvent()}
            >
              {saveButtonLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
