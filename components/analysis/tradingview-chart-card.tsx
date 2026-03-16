"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type LineStyle
} from "lightweight-charts";
import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisChartPoint, KeyLevel, TechnicalIndicators } from "@/types/analysis";
import { cn } from "@/lib/utils";

type RangeKey = "1M" | "3M" | "6M";

const RANGE_POINTS: Record<RangeKey, number> = {
  "1M": 20,
  "3M": 60,
  "6M": 120
};

function formatPrice(value: number) {
  return `${Math.round(value).toLocaleString()}원`;
}

function formatAmount(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "계산 중";
  }

  const eok = value / 100_000_000;
  return `${eok.toFixed(eok >= 100 ? 0 : 1)}억`;
}

function buildSyntheticDate(index: number, anchorDate?: string | null) {
  const anchor = anchorDate ? new Date(`${anchorDate}T00:00:00Z`) : new Date(Date.UTC(2026, 0, 1));
  const date = new Date(anchor);
  date.setUTCDate(anchor.getUTCDate() - index);
  return date.toISOString().slice(0, 10);
}

function resolveChartDate(point: AnalysisChartPoint, indexFromEnd: number, anchorDate?: string | null) {
  if (typeof point.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(point.date)) {
    return point.date;
  }

  return buildSyntheticDate(indexFromEnd, anchorDate);
}

function toChartValue(value: number | null) {
  return value === null ? undefined : value;
}

function parseLevelPrice(price: string) {
  const normalized = price.replace(/[^0-9.-]/g, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function createBaseChart(container: HTMLDivElement, height: number, leftScale = false) {
  return createChart(container, {
    width: container.clientWidth,
    height,
    layout: {
      background: { type: ColorType.Solid, color: "#ffffff" },
      textColor: "#475569",
      attributionLogo: false
    },
    grid: {
      vertLines: { color: "rgba(148, 163, 184, 0.14)" },
      horzLines: { color: "rgba(148, 163, 184, 0.14)" }
    },
    rightPriceScale: {
      borderColor: "rgba(148, 163, 184, 0.22)"
    },
    leftPriceScale: {
      visible: leftScale,
      borderColor: "rgba(148, 163, 184, 0.12)"
    },
    timeScale: {
      borderColor: "rgba(148, 163, 184, 0.22)",
      timeVisible: true,
      secondsVisible: false
    },
    crosshair: {
      vertLine: { color: "rgba(33, 128, 105, 0.25)" },
      horzLine: { color: "rgba(33, 128, 105, 0.25)" }
    }
  });
}

export function TradingViewChartCard({
  symbol,
  company,
  points,
  indicators,
  levels
}: {
  symbol: string | null;
  company: string;
  points: AnalysisChartPoint[];
  indicators: TechnicalIndicators;
  levels: KeyLevel[];
}) {
  const priceContainerRef = useRef<HTMLDivElement | null>(null);
  const turnoverContainerRef = useRef<HTMLDivElement | null>(null);
  const macdContainerRef = useRef<HTMLDivElement | null>(null);
  const chartsRef = useRef<IChartApi[]>([]);
  const [range, setRange] = useState<RangeKey>("3M");
  const tradingViewUrl = symbol ? `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}` : null;
  const availableRanges = useMemo(() => {
    const items: RangeKey[] = [];
    if (points.length >= 20) items.push("1M");
    if (points.length >= 40) items.push("3M");
    if (points.length >= 80) items.push("6M");
    return items.length ? items : (["1M"] as RangeKey[]);
  }, [points.length]);

  const chartPoints = useMemo(() => {
    const count = RANGE_POINTS[range];
    return points.slice(-count);
  }, [points, range]);
  const latestChartDate = chartPoints.at(-1)?.date ?? null;
  const levelItems = useMemo(
    () =>
      levels.map((level) => {
        const numericPrice = parseLevelPrice(level.price);
        const isEntry = level.label.includes("진입");
        const isTarget = level.label.includes("목표");
        const isRisk = level.label.includes("위험");

        return {
          ...level,
          numericPrice,
          chartColor: isEntry ? "#0ea5e9" : isTarget ? "#f59e0b" : "#ef4444",
          tone: isEntry
            ? "border-sky-200 bg-sky-50/80 text-sky-900"
            : isTarget
              ? "border-amber-200 bg-amber-50/80 text-amber-900"
              : "border-rose-200 bg-rose-50/80 text-rose-900",
          lineStyle: (isRisk ? 2 : isTarget ? 1 : 0) as LineStyle
        };
      }),
    [levels]
  );

  useEffect(() => {
    if (!availableRanges.includes(range)) {
      setRange(availableRanges[availableRanges.length - 1] ?? "1M");
    }
  }, [availableRanges, range]);

  useEffect(() => {
    if (!priceContainerRef.current || !turnoverContainerRef.current || !macdContainerRef.current || !chartPoints.length) {
      return;
    }

    chartsRef.current.forEach((chart) => chart.remove());
    chartsRef.current = [];

    const priceChart = createBaseChart(priceContainerRef.current, 320, true);
    const turnoverChart = createBaseChart(turnoverContainerRef.current, 120);
    const macdChart = createBaseChart(macdContainerRef.current, 140);

    const hasCandles = chartPoints.some(
      (point) =>
        point.open !== null &&
        point.high !== null &&
        point.low !== null &&
        Number.isFinite(point.open) &&
        Number.isFinite(point.high) &&
        Number.isFinite(point.low)
    );
    const priceSeries = hasCandles
      ? priceChart.addSeries(CandlestickSeries, {
          upColor: "#218069",
          downColor: "#e76f51",
          borderVisible: false,
          wickUpColor: "#218069",
          wickDownColor: "#e76f51",
          priceLineVisible: true,
          lastValueVisible: true
        })
      : priceChart.addSeries(LineSeries, {
          color: "#218069",
          lineWidth: 3,
          priceLineVisible: true,
          lastValueVisible: true
        });
    const sma20Series = priceChart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const sma60Series = priceChart.addSeries(LineSeries, {
      color: "#6366f1",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const ema20Series = priceChart.addSeries(LineSeries, {
      color: "#0ea5e9",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const upperBandSeries = priceChart.addSeries(LineSeries, {
      color: "rgba(251, 113, 133, 0.82)",
      lineWidth: 1,
      lineStyle: 2 as LineStyle,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const lowerBandSeries = priceChart.addSeries(LineSeries, {
      color: "rgba(251, 113, 133, 0.82)",
      lineWidth: 1,
      lineStyle: 2 as LineStyle,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const volumeSeries = priceChart.addSeries(HistogramSeries, {
      priceScaleId: "left",
      color: "rgba(33, 128, 105, 0.35)",
      priceFormat: { type: "volume" }
    });

    const turnoverSeries = turnoverChart.addSeries(HistogramSeries, {
      color: "rgba(180, 125, 41, 0.58)",
      priceFormat: { type: "volume" }
    });
    const macdSeries = macdChart.addSeries(LineSeries, {
      color: "#1d4ed8",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const macdSignalSeries = macdChart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const macdHistogramSeries = macdChart.addSeries(HistogramSeries, {
      color: "rgba(33, 128, 105, 0.35)"
    });
    const levelSeries = levelItems
      .filter((item) => item.numericPrice !== null)
      .map((item) => ({
        item,
        series: priceChart.addSeries(LineSeries, {
          color: item.chartColor,
          lineWidth: 2,
          lineStyle: item.lineStyle,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false
        })
      }));

    const seriesData = chartPoints.map((point, index) => ({
      time: resolveChartDate(point, chartPoints.length - index - 1, latestChartDate),
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume ?? 0,
      sma20: toChartValue(point.sma20),
      sma60: toChartValue(point.sma60),
      ema20: toChartValue(point.ema20),
      bollingerUpper: toChartValue(point.bollingerUpper),
      bollingerLower: toChartValue(point.bollingerLower),
      turnover: point.volume ? Number((point.close * point.volume).toFixed(0)) : 0,
      macd: toChartValue(point.macd),
      macdSignal: toChartValue(point.macdSignal)
    }));

    if (hasCandles) {
      priceSeries.setData(
        seriesData.map((point, index) => {
          const previousClose = index > 0 ? seriesData[index - 1]?.close ?? point.close : point.close;
          const open = point.open ?? previousClose;
          const high = point.high ?? Math.max(open, point.close);
          const low = point.low ?? Math.min(open, point.close);

          return {
            time: point.time,
            open,
            high,
            low,
            close: point.close
          };
        })
      );
    } else {
      priceSeries.setData(seriesData.map((point) => ({ time: point.time, value: point.close })));
    }
    sma20Series.setData(seriesData.filter((point) => point.sma20 !== undefined).map((point) => ({ time: point.time, value: point.sma20! })));
    sma60Series.setData(seriesData.filter((point) => point.sma60 !== undefined).map((point) => ({ time: point.time, value: point.sma60! })));
    ema20Series.setData(seriesData.filter((point) => point.ema20 !== undefined).map((point) => ({ time: point.time, value: point.ema20! })));
    upperBandSeries.setData(seriesData.filter((point) => point.bollingerUpper !== undefined).map((point) => ({ time: point.time, value: point.bollingerUpper! })));
    lowerBandSeries.setData(seriesData.filter((point) => point.bollingerLower !== undefined).map((point) => ({ time: point.time, value: point.bollingerLower! })));
    volumeSeries.setData(
      seriesData.map((point, index) => ({
        time: point.time,
        value: point.volume,
        color:
          index > 0 && point.close < (seriesData[index - 1]?.close ?? point.close)
            ? "rgba(251, 113, 133, 0.45)"
            : "rgba(33, 128, 105, 0.35)"
      }))
    );

    turnoverSeries.setData(
      seriesData.map((point, index) => ({
        time: point.time,
        value: point.turnover,
        color:
          index > 0 && point.close < (seriesData[index - 1]?.close ?? point.close)
            ? "rgba(251, 113, 133, 0.45)"
            : "rgba(180, 125, 41, 0.58)"
      }))
    );
    macdSeries.setData(seriesData.filter((point) => point.macd !== undefined).map((point) => ({ time: point.time, value: point.macd! })));
    macdSignalSeries.setData(seriesData.filter((point) => point.macdSignal !== undefined).map((point) => ({ time: point.time, value: point.macdSignal! })));
    macdHistogramSeries.setData(
      seriesData
        .filter((point) => point.macd !== undefined && point.macdSignal !== undefined)
        .map((point) => ({
          time: point.time,
          value: Number(((point.macd ?? 0) - (point.macdSignal ?? 0)).toFixed(1)),
          color: (point.macd ?? 0) >= (point.macdSignal ?? 0) ? "rgba(33, 128, 105, 0.35)" : "rgba(251, 113, 133, 0.45)"
        }))
    );
    levelSeries.forEach(({ item, series }) => {
      series.setData(seriesData.map((point) => ({ time: point.time, value: item.numericPrice! })));
    });

    priceChart.timeScale().fitContent();
    turnoverChart.timeScale().fitContent();
    macdChart.timeScale().fitContent();
    chartsRef.current = [priceChart, turnoverChart, macdChart];

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.floor(entry.contentRect.width);
      chartsRef.current.forEach((chart) => {
        chart.applyOptions({ width });
        chart.timeScale().fitContent();
      });
    });

    resizeObserver.observe(priceContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chartsRef.current.forEach((chart) => chart.remove());
      chartsRef.current = [];
    };
  }, [chartPoints, levelItems]);

  const lastPoint = chartPoints.at(-1);
  const lastTurnover = lastPoint?.volume ? Number((lastPoint.close * lastPoint.volume).toFixed(0)) : null;
  const indicatorItems = [
    {
      label: "이동평균",
      value:
        indicators.sma20 !== null && indicators.sma60 !== null
          ? `20일 ${formatPrice(indicators.sma20)} / 60일 ${formatPrice(indicators.sma60)}`
          : "계산 중",
      tone:
        indicators.sma20 !== null && indicators.sma60 !== null && indicators.sma20 > indicators.sma60
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85"
    },
    {
      label: "추세 강도",
      value:
        indicators.adx14 !== null && indicators.plusDi14 !== null && indicators.minusDi14 !== null
          ? `ADX ${indicators.adx14.toFixed(1)} / +DI ${indicators.plusDi14.toFixed(1)} / -DI ${indicators.minusDi14.toFixed(1)}`
          : "계산 중",
      tone:
        indicators.adx14 !== null &&
        indicators.plusDi14 !== null &&
        indicators.minusDi14 !== null &&
        indicators.adx14 >= 25 &&
        indicators.plusDi14 > indicators.minusDi14
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85"
    },
    {
      label: "거래량 배수",
      value: indicators.volumeRatio20 !== null ? `${indicators.volumeRatio20.toFixed(2)}배` : "계산 중",
      tone:
        indicators.volumeRatio20 !== null && indicators.volumeRatio20 >= 1.2
          ? "border-primary/20 bg-primary/8 text-primary"
          : "border-border/70 bg-background/50 text-foreground/85"
    },
    {
      label: "RSI(14)",
      value: indicators.rsi14 !== null ? indicators.rsi14.toFixed(1) : "계산 중",
      tone:
        indicators.rsi14 !== null && indicators.rsi14 >= 45 && indicators.rsi14 <= 65
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85"
    },
    {
      label: "Stochastic",
      value:
        indicators.stochasticK !== null && indicators.stochasticD !== null
          ? `${indicators.stochasticK.toFixed(1)} / ${indicators.stochasticD.toFixed(1)}`
          : "계산 중",
      tone:
        indicators.stochasticK !== null &&
        indicators.stochasticD !== null &&
        indicators.stochasticK >= indicators.stochasticD &&
        indicators.stochasticK >= 55 &&
        indicators.stochasticK <= 82
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85"
    },
    {
      label: "MACD",
      value:
        indicators.macd !== null && indicators.macdSignal !== null
          ? `${indicators.macd.toFixed(1)} / ${indicators.macdSignal.toFixed(1)}`
          : "계산 중",
      tone:
        indicators.macd !== null && indicators.macdSignal !== null && indicators.macd >= indicators.macdSignal
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85"
    },
    {
      label: "MFI(14)",
      value: indicators.mfi14 !== null ? indicators.mfi14.toFixed(1) : "계산 중",
      tone:
        indicators.mfi14 !== null && indicators.mfi14 >= 55 && indicators.mfi14 <= 78
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85"
    },
    {
      label: "ATR(14)",
      value: indicators.atr14 !== null ? formatPrice(indicators.atr14) : "계산 중",
      tone: "border-border/70 bg-background/50 text-foreground/85"
    },
    {
      label: "NATR(14)",
      value: indicators.natr14 !== null ? `${indicators.natr14.toFixed(2)}%` : "계산 중",
      tone:
        indicators.natr14 !== null && indicators.natr14 <= 5.5
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85"
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>가격 차트</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            가격, 이동평균선, 거래량, 최근 거래금액과 핵심 보조지표를 한 흐름으로 확인합니다.
          </p>
        </div>
        {tradingViewUrl ? (
          <Link
            href={tradingViewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary transition hover:text-primary/80"
          >
            TradingView에서 열기
            <ExternalLink className="h-4 w-4" />
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {chartPoints.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {availableRanges.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRange(item)}
                    className={
                      item === range
                        ? "rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                        : "rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground"
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <LegendDot color="#218069" label="종가" />
                <LegendDot color="#f59e0b" label="20일선" />
                <LegendDot color="#6366f1" label="60일선" />
                <LegendDot color="#0ea5e9" label="20EMA" />
                <LegendDot color="#fb7185" label="볼린저 밴드" />
                <LegendDot color="#b47d29" label="거래금액" />
                <LegendDot color="#1d4ed8" label="MACD" />
                <LegendDot color="#0ea5e9" label="진입 기준" />
                <LegendDot color="#f59e0b" label="목표 가격" />
                <LegendDot color="#ef4444" label="위험 가격" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {indicatorItems.map((item) => (
                <div key={item.label} className={cn("rounded-[20px] border px-4 py-3", item.tone)}>
                  <p className="text-xs font-medium opacity-80">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold leading-6">{item.value}</p>
                </div>
              ))}
            </div>
            {levelItems.length ? (
              <div className="grid gap-3 md:grid-cols-3">
                {levelItems.map((item) => (
                  <div key={item.label} className={cn("rounded-[20px] border px-4 py-4", item.tone)}>
                    <p className="text-xs font-medium opacity-80">{item.label}</p>
                    <p className="mt-2 text-base font-semibold">{item.price}</p>
                    <p className="mt-2 text-xs leading-5 opacity-80">{item.meaning}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="space-y-3 overflow-hidden rounded-[28px] border border-border/70 bg-white p-3">
              <div ref={priceContainerRef} className="h-[320px] w-full" />
              <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                <div className="rounded-[20px] border border-border/60 bg-background/55 p-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">최근 거래금액</p>
                  <div ref={turnoverContainerRef} className="h-[120px] w-full" />
                </div>
                <div className="rounded-[20px] border border-border/60 bg-background/55 p-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">MACD</p>
                  <div ref={macdContainerRef} className="h-[140px] w-full" />
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniMetric label="최근 종가" value={lastPoint ? formatPrice(lastPoint.close) : "계산 중"} />
              <MiniMetric label="20일선" value={lastPoint?.sma20 ? formatPrice(lastPoint.sma20) : "계산 중"} />
              <MiniMetric label="최근 거래금액" value={formatAmount(lastTurnover)} />
              <MiniMetric
                label="최근 거래량"
                value={lastPoint?.volume ? `${lastPoint.volume.toLocaleString()}주` : "계산 중"}
              />
            </div>
          </>
        ) : (
          <div className="rounded-[28px] border border-border/70 bg-secondary/35 p-6 text-sm leading-7 text-muted-foreground">
            {company} 가격 이력이 아직 충분하지 않아 차트를 준비하는 중입니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{value}</p>
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
