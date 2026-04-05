"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  LineSeries,
  createChart,
  type BusinessDay,
  type IChartApi,
  type LineStyle
} from "lightweight-charts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisChartPointDto, RecommendationTradePlanDto } from "@/lib/api-contracts/swing-radar";
import type { PortfolioJournalGroup } from "@/lib/portfolio/journal-insights";
import {
  buildPositionChartEventDisplays,
  type PositionChartEventDisplay,
  type PositionChartEventTone
} from "@/lib/portfolio/position-chart-events";
import { getPortfolioEntryEvent } from "@/lib/portfolio/position-detail";
import { cn, formatPrice } from "@/lib/utils";

const MAX_POINTS = 60;
const CHART_HEIGHT = 360;
const EVENT_BADGE_HORIZONTAL_PADDING = 72;
const EVENT_BADGE_STACK_OFFSET = 36;
const EVENT_BADGE_VERTICAL_OFFSET = 56;
const EVENT_BADGE_VERTICAL_PADDING = 34;

interface EventBadgePosition extends PositionChartEventDisplay {
  x: number;
  anchorY: number;
  badgeY: number;
}

function toBusinessDay(value: string): BusinessDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

function getCompletedTradingDayAnchor(anchor?: string | null) {
  const parsed = anchor ? new Date(anchor) : new Date();
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const weekday = date.getUTCDay();
  const offset = weekday === 1 ? 3 : weekday === 0 ? 2 : weekday === 6 ? 1 : 1;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function buildSyntheticDate(index: number, anchorDate?: string | null, generatedAt?: string | null) {
  const resolvedAnchor = anchorDate ?? getCompletedTradingDayAnchor(generatedAt);
  const anchor = new Date(`${resolvedAnchor}T00:00:00Z`);
  const date = new Date(anchor);
  date.setUTCDate(anchor.getUTCDate() - index);
  return date.toISOString().slice(0, 10);
}

function resolveChartDate(
  point: AnalysisChartPointDto,
  indexFromEnd: number,
  anchorDate?: string | null,
  generatedAt?: string | null
) {
  if (typeof point.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(point.date)) {
    return toBusinessDay(point.date) ?? toBusinessDay(buildSyntheticDate(indexFromEnd, anchorDate, generatedAt))!;
  }

  return toBusinessDay(buildSyntheticDate(indexFromEnd, anchorDate, generatedAt))!;
}

function toChartValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function buildReferenceLines(
  tradePlan?: RecommendationTradePlanDto | null,
  averagePrice?: number | null
) {
  return [
    {
      label: "평균 단가",
      value: typeof averagePrice === "number" && averagePrice > 0 ? averagePrice : undefined,
      color: "#8B6B2E",
      lineStyle: 0 as LineStyle
    },
    {
      label: "손절 기준",
      value: typeof tradePlan?.stopPrice === "number" ? tradePlan.stopPrice : undefined,
      color: "#C74A47",
      lineStyle: 2 as LineStyle
    },
    {
      label: "1차 목표",
      value: typeof tradePlan?.targetPrice === "number" ? tradePlan.targetPrice : undefined,
      color: "#C58A1B",
      lineStyle: 1 as LineStyle
    },
    {
      label: "진입 하단",
      value: typeof tradePlan?.entryPriceLow === "number" ? tradePlan.entryPriceLow : undefined,
      color: "#1F8A63",
      lineStyle: 3 as LineStyle
    },
    {
      label: "진입 상단",
      value: typeof tradePlan?.entryPriceHigh === "number" ? tradePlan.entryPriceHigh : undefined,
      color: "#1F8A63",
      lineStyle: 3 as LineStyle
    }
  ].filter((item): item is { label: string; value: number; color: string; lineStyle: LineStyle } => {
    return typeof item.value === "number" && Number.isFinite(item.value);
  });
}

function formatEventQuantity(quantity: number) {
  return `${new Intl.NumberFormat("ko-KR").format(quantity)}주`;
}

function clampBadgeY(y: number) {
  return Math.max(EVENT_BADGE_VERTICAL_PADDING, Math.min(CHART_HEIGHT - EVENT_BADGE_VERTICAL_PADDING, y));
}

function getEventToneStyles(tone: PositionChartEventTone) {
  switch (tone) {
    case "buy":
      return {
        line: "bg-emerald-500/42",
        marker: "border-emerald-400/40 bg-emerald-500 text-white shadow-[0_18px_34px_-18px_rgba(16,185,129,0.85)]",
        chip: "border-emerald-400/28 bg-[rgba(16,185,129,0.96)] text-white",
        code: "bg-white/16 text-white/90"
      };
    case "add":
      return {
        line: "bg-sky-500/42",
        marker: "border-sky-400/42 bg-sky-500 text-white shadow-[0_18px_34px_-18px_rgba(14,165,233,0.85)]",
        chip: "border-sky-400/30 bg-[rgba(14,165,233,0.96)] text-white",
        code: "bg-white/16 text-white/90"
      };
    case "take":
      return {
        line: "bg-amber-500/42",
        marker: "border-amber-300/42 bg-amber-500 text-white shadow-[0_18px_34px_-18px_rgba(245,158,11,0.85)]",
        chip: "border-amber-300/30 bg-[rgba(245,158,11,0.97)] text-white",
        code: "bg-white/16 text-white/92"
      };
    case "exit":
      return {
        line: "bg-rose-500/42",
        marker: "border-rose-300/42 bg-rose-500 text-white shadow-[0_18px_34px_-18px_rgba(244,63,94,0.85)]",
        chip: "border-rose-300/30 bg-[rgba(244,63,94,0.97)] text-white",
        code: "bg-white/16 text-white/92"
      };
    case "stop":
      return {
        line: "bg-red-500/46",
        marker: "border-red-300/44 bg-red-500 text-white shadow-[0_18px_34px_-18px_rgba(239,68,68,0.85)]",
        chip: "border-red-300/30 bg-[rgba(239,68,68,0.98)] text-white",
        code: "bg-white/16 text-white/92"
      };
    case "manual":
      return {
        line: "bg-slate-500/42",
        marker: "border-slate-300/36 bg-slate-600 text-white shadow-[0_18px_34px_-18px_rgba(71,85,105,0.85)]",
        chip: "border-slate-300/24 bg-[rgba(71,85,105,0.96)] text-white",
        code: "bg-white/14 text-white/88"
      };
  }
}

function clampBadgeX(x: number, width: number) {
  const horizontalPadding = Math.min(EVENT_BADGE_HORIZONTAL_PADDING, Math.max(24, width / 4));
  return Math.max(horizontalPadding, Math.min(width - horizontalPadding, x));
}

export function PortfolioPositionChartCard({
  company,
  chartPoints,
  journalGroup,
  tradePlan,
  averagePrice,
  generatedAt
}: {
  company: string;
  chartPoints: AnalysisChartPointDto[];
  journalGroup?: PortfolioJournalGroup | null;
  tradePlan?: RecommendationTradePlanDto | null;
  averagePrice?: number | null;
  generatedAt?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [eventBadges, setEventBadges] = useState<EventBadgePosition[]>([]);

  const visiblePoints = useMemo(() => chartPoints.slice(-MAX_POINTS), [chartPoints]);
  const latestPoint = visiblePoints.at(-1);
  const firstEntryEvent = getPortfolioEntryEvent(journalGroup);
  const availableDates = useMemo(
    () =>
      new Set(
        visiblePoints
          .map((point, index) => {
            const businessDay = resolveChartDate(point, visiblePoints.length - index - 1, latestPoint?.date ?? null, generatedAt);
            return `${businessDay.year}-${String(businessDay.month).padStart(2, "0")}-${String(businessDay.day).padStart(2, "0")}`;
          })
          .filter(Boolean)
      ),
    [generatedAt, latestPoint?.date, visiblePoints]
  );
  const eventDisplayDefinitions = useMemo(
    () => buildPositionChartEventDisplays(journalGroup, availableDates),
    [availableDates, journalGroup]
  );

  useEffect(() => {
    if (!containerRef.current || !visiblePoints.length) {
      setEventBadges([]);
      return;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: CHART_HEIGHT,
      layout: {
        background: { type: ColorType.Solid, color: "#fffdf8" },
        textColor: "#48505C",
        attributionLogo: false
      },
      grid: {
        vertLines: { color: "rgba(139, 107, 46, 0.08)" },
        horzLines: { color: "rgba(139, 107, 46, 0.08)" }
      },
      rightPriceScale: {
        borderColor: "rgba(139, 107, 46, 0.16)"
      },
      timeScale: {
        borderColor: "rgba(139, 107, 46, 0.16)",
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: {
        vertLine: { color: "rgba(139, 107, 46, 0.18)" },
        horzLine: { color: "rgba(139, 107, 46, 0.18)" }
      }
    });

    const hasCandles = visiblePoints.some((point) => {
      return (
        point.open !== null &&
        point.high !== null &&
        point.low !== null &&
        Number.isFinite(point.open) &&
        Number.isFinite(point.high) &&
        Number.isFinite(point.low)
      );
    });

    const priceSeries = hasCandles
      ? chart.addSeries(CandlestickSeries, {
          upColor: "#1F8A63",
          downColor: "#C74A47",
          borderVisible: true,
          borderUpColor: "#1F8A63",
          borderDownColor: "#C74A47",
          wickUpColor: "#1F8A63",
          wickDownColor: "#C74A47"
        })
      : chart.addSeries(LineSeries, {
          color: "#243246",
          lineWidth: 3
        });

    const sma20Series = chart.addSeries(LineSeries, {
      color: "#C58A1B",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });

    const ema20Series = chart.addSeries(LineSeries, {
      color: "#2C5B99",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });

    const seriesData = visiblePoints.map((point, index) => {
      const time = resolveChartDate(point, visiblePoints.length - index - 1, latestPoint?.date ?? null, generatedAt);
      const previousClose = index > 0 ? visiblePoints[index - 1]?.close ?? point.close : point.close;
      const open = point.open ?? previousClose;
      const high = point.high ?? Math.max(open, point.close);
      const low = point.low ?? Math.min(open, point.close);

      return {
        time,
        open,
        high,
        low,
        close: point.close,
        sma20: toChartValue(point.sma20),
        ema20: toChartValue(point.ema20)
      };
    });

    if (hasCandles) {
      priceSeries.setData(
        seriesData.map((point) => ({
          time: point.time,
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close
        }))
      );
    } else {
      priceSeries.setData(seriesData.map((point) => ({ time: point.time, value: point.close })));
    }

    sma20Series.setData(
      seriesData.filter((point) => point.sma20 !== undefined).map((point) => ({ time: point.time, value: point.sma20! }))
    );
    ema20Series.setData(
      seriesData.filter((point) => point.ema20 !== undefined).map((point) => ({ time: point.time, value: point.ema20! }))
    );

    const referenceLines = buildReferenceLines(tradePlan, averagePrice);
    for (const line of referenceLines) {
      const series = chart.addSeries(LineSeries, {
        color: line.color,
        lineWidth: 2,
        lineStyle: line.lineStyle,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false
      });

      series.setData(seriesData.map((point) => ({ time: point.time, value: line.value })));
    }

    const syncEventBadges = () => {
      if (!containerRef.current) {
        return;
      }

      const width = containerRef.current.clientWidth;
      const stackCounts = new Map<string, number>();
      const nextBadges = eventDisplayDefinitions
        .map((badge) => {
          const x = chart.timeScale().timeToCoordinate(toBusinessDay(badge.date)!);
          const y = priceSeries.priceToCoordinate(badge.price);

          if (x === null || y === null) {
            return null;
          }

          const stackKey = `${badge.date}:${badge.placement}`;
          const stackIndex = stackCounts.get(stackKey) ?? 0;
          stackCounts.set(stackKey, stackIndex + 1);
          const anchorY = clampBadgeY(y);
          const desiredBadgeY =
            badge.placement === "above"
              ? anchorY - EVENT_BADGE_VERTICAL_OFFSET - stackIndex * EVENT_BADGE_STACK_OFFSET
              : anchorY + EVENT_BADGE_VERTICAL_OFFSET + stackIndex * EVENT_BADGE_STACK_OFFSET;

          return {
            ...badge,
            x: clampBadgeX(x, width),
            anchorY,
            badgeY: clampBadgeY(desiredBadgeY)
          };
        })
        .filter((item): item is EventBadgePosition => item !== null);

      setEventBadges(nextBadges);
    };

    chart.timeScale().fitContent();
    requestAnimationFrame(syncEventBadges);
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) {
        return;
      }

      chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      chartRef.current.timeScale().fitContent();
      requestAnimationFrame(syncEventBadges);
    });

    const handleVisibleRangeChange = () => {
      requestAnimationFrame(syncEventBadges);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    resizeObserver.observe(containerRef.current);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      setEventBadges([]);
    };
  }, [averagePrice, eventDisplayDefinitions, generatedAt, latestPoint?.date, tradePlan, visiblePoints]);

  if (!visiblePoints.length) {
    return (
      <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">가격 흐름과 체결 위치</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-[24px] border border-border/80 bg-[hsl(42_40%_97%)] px-5 py-10 text-sm leading-6 text-muted-foreground">
            {company} 가격 이력이 아직 충분하지 않아 포지션 차트를 준비하는 중입니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  const metricItems = [
    { label: "최근 종가", value: latestPoint ? formatPrice(latestPoint.close) : "계산 중" },
    { label: "평균 단가", value: typeof averagePrice === "number" && averagePrice > 0 ? formatPrice(averagePrice) : "미기록" },
    { label: "첫 진입", value: firstEntryEvent ? formatPrice(firstEntryEvent.price) : "미기록" },
    {
      label: "현재 계획",
      value:
        typeof tradePlan?.stopPrice === "number" && typeof tradePlan?.targetPrice === "number"
          ? `${formatPrice(tradePlan.stopPrice)} / ${formatPrice(tradePlan.targetPrice)}`
          : "손절·목표 대기"
    }
  ];

  return (
    <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-36px_rgba(24,32,42,0.24)]">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-foreground">가격 흐름과 체결 위치</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              가격 흐름 위에 실제 체결 이벤트를 올려 놓고, 평균 단가와 손절·목표 기준을 함께 봅니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <LegendDot color="#243246" label="종가" />
            <LegendDot color="#C58A1B" label="20일선" />
            <LegendDot color="#2C5B99" label="20EMA" />
            <LegendDot color="#1F8A63" label="진입" />
            <LegendDot color="#C58A1B" label="익절" />
            <LegendDot color="#C74A47" label="종료" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,241,232,0.92))] p-3">
          <div className="relative h-[360px] w-full">
            <div ref={containerRef} className="h-full w-full" />
            <div className="pointer-events-none absolute inset-0 z-20">
              {eventBadges.map((badge) => (
                <ChartEventOverlayItem key={badge.id} badge={badge} />
              ))}
            </div>
          </div>
        </div>
        {eventDisplayDefinitions.length ? (
          <div className="rounded-[22px] border border-border/80 bg-background/76 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Events In View</p>
              <p className="text-[11px] text-muted-foreground">IN / ADD / TP / OUT / SL / MAN</p>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {eventDisplayDefinitions.map((event) => (
                <ChartEventSummaryChip key={event.id} event={event} />
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricItems.map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,241,232,0.9))] px-4 py-4"
            >
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartEventOverlayItem({ badge }: { badge: EventBadgePosition }) {
  const styles = getEventToneStyles(badge.tone);
  const connectorTop = Math.min(badge.anchorY, badge.badgeY);
  const connectorHeight = Math.max(Math.abs(badge.anchorY - badge.badgeY) - 10, 12);

  return (
    <>
      <div
        className={cn("absolute z-10 w-px -translate-x-1/2 rounded-full", styles.line)}
        style={{
          left: badge.x,
          top: connectorTop + 5,
          height: connectorHeight
        }}
      />
      <div
        className={cn(
          "absolute z-20 flex min-w-[2.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border px-2 py-1 text-[10px] font-bold tracking-[0.12em]",
          styles.marker
        )}
        style={{
          left: badge.x,
          top: badge.anchorY
        }}
      >
        {badge.shortLabel}
      </div>
      <div
        className={cn(
          "absolute z-30 min-w-[112px] max-w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border px-3 py-2 shadow-[0_18px_34px_-20px_rgba(15,23,42,0.72)] backdrop-blur-md",
          styles.chip
        )}
        style={{
          left: badge.x,
          top: badge.badgeY
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.12em]", styles.code)}>
            {badge.shortLabel}
          </span>
          <span className="truncate text-[11px] font-semibold">{badge.label}</span>
        </div>
        <p className="mt-1 text-[10px] leading-4 text-white/84">
          {formatPrice(badge.price)} · {formatEventQuantity(badge.quantity)}
        </p>
      </div>
    </>
  );
}

function ChartEventSummaryChip({ event }: { event: PositionChartEventDisplay }) {
  const styles = getEventToneStyles(event.tone);

  return (
    <div
      className={cn(
        "min-w-[168px] rounded-[18px] border px-3 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.6)] backdrop-blur-sm",
        styles.chip
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.12em]", styles.code)}>
            {event.shortLabel}
          </span>
          <p className="text-xs font-semibold text-white">{event.label}</p>
        </div>
        <span className="text-[10px] font-medium text-white/72">#{event.sequence}</span>
      </div>
      <p className="mt-2 text-xs font-semibold text-white">{formatPrice(event.price)}</p>
      <p className="mt-1 text-[11px] text-white/76">
        {event.dateLabel} · {formatEventQuantity(event.quantity)}
      </p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
