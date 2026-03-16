"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type BusinessDay,
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type LineStyle
} from "lightweight-charts";
import { CircleHelp, ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AnalysisChartPoint, KeyLevel, TechnicalIndicators } from "@/types/analysis";
import { cn } from "@/lib/utils";

type RangeKey = "1M" | "3M" | "6M";

const RANGE_POINTS: Record<RangeKey, number> = {
  "1M": 20,
  "3M": 60,
  "6M": 120
};

interface IndicatorCardItem {
  label: string;
  value: string;
  tone: string;
  description: string;
}

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

function getLatestCompletedTradingDay(anchor?: string | null) {
  const parsed = anchor ? new Date(anchor) : new Date();
  const baseDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const date = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
  const weekday = date.getUTCDay();
  const offset = weekday === 1 ? 3 : weekday === 0 ? 2 : weekday === 6 ? 1 : 1;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function buildSyntheticDate(index: number, anchorDate?: string | null, snapshotGeneratedAt?: string | null) {
  const resolvedAnchorDate = anchorDate ?? getLatestCompletedTradingDay(snapshotGeneratedAt);
  const anchor = new Date(`${resolvedAnchorDate}T00:00:00Z`);
  const date = new Date(anchor);
  date.setUTCDate(anchor.getUTCDate() - index);
  return date.toISOString().slice(0, 10);
}

function toBusinessDay(value: string): BusinessDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day)
  };
}

function resolveChartDate(
  point: AnalysisChartPoint,
  indexFromEnd: number,
  anchorDate?: string | null,
  snapshotGeneratedAt?: string | null
): BusinessDay {
  if (typeof point.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(point.date)) {
    return toBusinessDay(point.date) ?? toBusinessDay(buildSyntheticDate(indexFromEnd, anchorDate, snapshotGeneratedAt))!;
  }

  return toBusinessDay(buildSyntheticDate(indexFromEnd, anchorDate, snapshotGeneratedAt))!;
}

function toChartValue(value: number | null) {
  return value === null ? undefined : value;
}

function parseLevelPrice(price: string) {
  const match = price.match(/-?\d[\d,]*(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function hasNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getLevelKind(label: string) {
  if (label.includes("진입") || label.includes("확인")) {
    return "entry" as const;
  }

  if (label.includes("목표") || label.includes("다음")) {
    return "target" as const;
  }

  return "risk" as const;
}

function getDisplayLabel(label: string) {
  const kind = getLevelKind(label);
  if (kind === "entry") {
    return "진입 기준";
  }

  if (kind === "target") {
    return "목표 가격";
  }

  return "위험 가격";
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
  levels,
  snapshotGeneratedAt
}: {
  symbol: string | null;
  company: string;
  points: AnalysisChartPoint[];
  indicators: TechnicalIndicators;
  levels: KeyLevel[];
  snapshotGeneratedAt?: string | null;
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
    () => {
      const entryLevel = levels.find((level) => getLevelKind(level.label) === "entry");
      const entryPrice = entryLevel ? parseLevelPrice(entryLevel.price) : null;

      return levels.map((level) => {
        const numericPrice = parseLevelPrice(level.price);
        const kind = getLevelKind(level.label);
        const isEntry = kind === "entry";
        const isTarget = kind === "target";
        const isRisk = kind === "risk";
        const displayPrice =
          !isEntry && entryPrice && numericPrice && !level.price.includes("%")
            ? `${level.price} (${formatSignedPercent(((numericPrice - entryPrice) / entryPrice) * 100)})`
            : level.price;

        return {
          ...level,
          displayLabel: getDisplayLabel(level.label),
          displayPrice,
          numericPrice,
          chartColor: isEntry ? "#0ea5e9" : isTarget ? "#f59e0b" : "#ef4444",
          tone: isEntry
            ? "border-sky-200 bg-sky-50/80 text-sky-900"
            : isTarget
              ? "border-amber-200 bg-amber-50/80 text-amber-900"
              : "border-rose-200 bg-rose-50/80 text-rose-900",
          lineStyle: (isRisk ? 2 : isTarget ? 1 : 0) as LineStyle
        };
      });
    },
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

    const priceChart = createBaseChart(priceContainerRef.current, 320);
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
          borderVisible: true,
          borderUpColor: "#218069",
          borderDownColor: "#e76f51",
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
      lineWidth: 3,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const sma60Series = priceChart.addSeries(LineSeries, {
      color: "#6366f1",
      lineWidth: 3,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const ema20Series = priceChart.addSeries(LineSeries, {
      color: "#0ea5e9",
      lineWidth: 3,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const upperBandSeries = priceChart.addSeries(LineSeries, {
      color: "rgba(251, 113, 133, 0.82)",
      lineWidth: 2,
      lineStyle: 2 as LineStyle,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const lowerBandSeries = priceChart.addSeries(LineSeries, {
      color: "rgba(251, 113, 133, 0.82)",
      lineWidth: 2,
      lineStyle: 2 as LineStyle,
      priceLineVisible: false,
      lastValueVisible: false
    });
    const turnoverOverlaySeries = priceChart.addSeries(HistogramSeries, {
      color: "rgba(180, 125, 41, 0.28)",
      priceFormat: { type: "volume" },
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: "turnover-overlay"
    });
    turnoverOverlaySeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.78,
        bottom: 0
      }
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
      time: resolveChartDate(point, chartPoints.length - index - 1, latestChartDate, snapshotGeneratedAt),
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
      turnover: point.volume ?? 0,
      turnoverAmount: point.volume ? Number((point.close * point.volume).toFixed(0)) : 0,
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
    turnoverOverlaySeries.setData(
      seriesData.map((point, index) => ({
        time: point.time,
        value: point.turnoverAmount,
        color:
          index > 0 && point.close < (seriesData[index - 1]?.close ?? point.close)
            ? "rgba(251, 113, 133, 0.28)"
            : "rgba(180, 125, 41, 0.28)"
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
  }, [chartPoints, levelItems, snapshotGeneratedAt]);

  const lastPoint = chartPoints.at(-1);
  const lastTurnover = lastPoint?.volume ? Number((lastPoint.close * lastPoint.volume).toFixed(0)) : null;
  const indicatorItems: IndicatorCardItem[] = [
    {
      label: "이동평균",
      value:
        hasNumber(indicators.sma20) && hasNumber(indicators.sma60)
          ? `20일 ${formatPrice(indicators.sma20)} / 60일 ${formatPrice(indicators.sma60)}`
          : "계산 중",
      tone:
        hasNumber(indicators.sma20) && hasNumber(indicators.sma60) && indicators.sma20 > indicators.sma60
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85",
      description:
        "20일선과 60일선의 위치 관계로 중기 추세 방향을 봅니다. 20일선이 60일선 위에 있으면 상승 흐름이 유지되는지 확인하는 데 도움이 됩니다."
    },
    {
      label: "추세 강도",
      value:
        hasNumber(indicators.adx14) && hasNumber(indicators.plusDi14) && hasNumber(indicators.minusDi14)
          ? `ADX ${indicators.adx14.toFixed(1)} / +DI ${indicators.plusDi14.toFixed(1)} / -DI ${indicators.minusDi14.toFixed(1)}`
          : "계산 중",
      tone:
        hasNumber(indicators.adx14) &&
        hasNumber(indicators.plusDi14) &&
        hasNumber(indicators.minusDi14) &&
        indicators.adx14 >= 25 &&
        indicators.plusDi14 > indicators.minusDi14
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85",
      description:
        "ADX는 추세의 힘을, +DI와 -DI는 상승과 하락 중 어느 쪽이 우세한지를 보여줍니다. ADX가 높고 +DI가 우위면 상승 추세 신뢰도가 높아집니다."
    },
    {
      label: "거래량 배수",
      value: hasNumber(indicators.volumeRatio20) ? `${indicators.volumeRatio20.toFixed(2)}배` : "계산 중",
      tone:
        hasNumber(indicators.volumeRatio20) && indicators.volumeRatio20 >= 1.2
          ? "border-primary/20 bg-primary/8 text-primary"
          : "border-border/70 bg-background/50 text-foreground/85",
      description:
        "최근 거래량이 20일 평균 거래량보다 몇 배 늘었는지 보여줍니다. 돌파 시도나 추세 강화 구간에서 거래량이 동반되는지 확인할 수 있습니다."
    },
    {
      label: "RSI(14)",
      value: hasNumber(indicators.rsi14) ? indicators.rsi14.toFixed(1) : "계산 중",
      tone:
        hasNumber(indicators.rsi14) && indicators.rsi14 >= 45 && indicators.rsi14 <= 65
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85",
      description:
        "상승 압력과 하락 압력의 균형을 보는 모멘텀 지표입니다. 보통 70 이상은 과열, 30 이하는 과매도로 해석합니다."
    },
    {
      label: "Stochastic",
      value:
        hasNumber(indicators.stochasticK) && hasNumber(indicators.stochasticD)
          ? `${indicators.stochasticK.toFixed(1)} / ${indicators.stochasticD.toFixed(1)}`
          : "계산 중",
      tone:
        hasNumber(indicators.stochasticK) &&
        hasNumber(indicators.stochasticD) &&
        indicators.stochasticK >= indicators.stochasticD &&
        indicators.stochasticK >= 55 &&
        indicators.stochasticK <= 82
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85",
      description:
        "최근 고가와 저가 범위 안에서 현재 종가가 어디쯤 있는지 보여줍니다. %K가 %D를 상향 돌파하면 단기 모멘텀 개선 신호로 볼 수 있습니다."
    },
    {
      label: "MACD",
      value:
        hasNumber(indicators.macd) && hasNumber(indicators.macdSignal)
          ? `${indicators.macd.toFixed(1)} / ${indicators.macdSignal.toFixed(1)}`
          : "계산 중",
      tone:
        hasNumber(indicators.macd) && hasNumber(indicators.macdSignal) && indicators.macd >= indicators.macdSignal
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85",
      description:
        "단기 EMA와 중기 EMA의 차이를 이용해 추세 전환과 모멘텀 변화를 보는 지표입니다. MACD가 시그널 위에 있으면 상승 모멘텀이 우세한 편입니다."
    },
    {
      label: "MFI(14)",
      value: hasNumber(indicators.mfi14) ? indicators.mfi14.toFixed(1) : "계산 중",
      tone:
        hasNumber(indicators.mfi14) && indicators.mfi14 >= 55 && indicators.mfi14 <= 78
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85",
      description:
        "가격과 거래량을 함께 반영한 자금 유입 지표입니다. 가격이 오르면서 자금까지 유입되는지 확인할 때 유용합니다."
    },
    {
      label: "ATR(14)",
      value: hasNumber(indicators.atr14) ? formatPrice(indicators.atr14) : "계산 중",
      tone: "border-border/70 bg-background/50 text-foreground/85",
      description:
        "최근 14일 동안 하루 평균 진폭이 얼마인지 보여줍니다. 손절 폭과 분할 진입 간격을 잡을 때 기준이 됩니다."
    },
    {
      label: "NATR(14)",
      value: hasNumber(indicators.natr14) ? `${indicators.natr14.toFixed(2)}%` : "계산 중",
      tone:
        hasNumber(indicators.natr14) && indicators.natr14 <= 5.5
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85",
      description:
        "ATR을 현재가 대비 퍼센트로 환산한 값입니다. 종목 가격대가 달라도 변동성 크기를 같은 기준으로 비교할 수 있습니다."
    },
    {
      label: "ROC(20)",
      value: hasNumber(indicators.roc20) ? formatSignedPercent(indicators.roc20) : "계산 중",
      tone:
        hasNumber(indicators.roc20) && indicators.roc20 >= 4 && indicators.roc20 <= 18
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85",
      description:
        "20거래일 전 대비 현재 가격 상승률입니다. 추세가 붙은 종목인지, 아니면 이미 과도하게 급등했는지 가늠하는 데 도움이 됩니다."
    },
    {
      label: "CCI(20)",
      value: hasNumber(indicators.cci20) ? indicators.cci20.toFixed(1) : "계산 중",
      tone:
        hasNumber(indicators.cci20) && indicators.cci20 >= 20 && indicators.cci20 <= 140
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85",
      description:
        "평균 가격에서 현재 가격이 얼마나 이격됐는지를 보는 지표입니다. 추세 초입의 탄력은 살리면서 과열 구간은 피하는 데 유용합니다."
    },
    {
      label: "CMF(20)",
      value: hasNumber(indicators.cmf20) ? indicators.cmf20.toFixed(2) : "계산 중",
      tone:
        hasNumber(indicators.cmf20) && indicators.cmf20 >= 0.05
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
          : "border-border/70 bg-background/50 text-foreground/85",
      description:
        "종가 위치와 거래량을 함께 반영해 자금 유입과 유출을 측정합니다. 0 위에서 유지되면 수급이 상대적으로 우호적이라고 볼 수 있습니다."
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
                <LegendDot color="rgba(180, 125, 41, 0.6)" label="거래대금" />
                <LegendDot color="#1d4ed8" label="MACD" />
                <LegendDot color="#0ea5e9" label="진입 기준" />
                <LegendDot color="#f59e0b" label="목표 가격" />
                <LegendDot color="#ef4444" label="위험 가격" />
              </div>
            </div>
            <div className="space-y-3 overflow-hidden rounded-[28px] border border-border/70 bg-white p-3">
              <div ref={priceContainerRef} className="h-[320px] w-full" />
              <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                <div className="rounded-[20px] border border-border/60 bg-background/55 p-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">거래량</p>
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
            <TooltipProvider delayDuration={120}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {indicatorItems.map((item) => (
                  <div key={item.label} className={cn("rounded-[20px] border px-4 py-3", item.tone)}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-medium opacity-80">{item.label}</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={`${item.label} 설명`}
                            className="rounded-full text-muted-foreground/70 transition hover:text-foreground"
                          >
                            <CircleHelp className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[220px] leading-5">{item.description}</TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6">{item.value}</p>
                  </div>
                ))}
              </div>
            </TooltipProvider>
            {levelItems.length ? (
              <div className="grid gap-3 md:grid-cols-3">
                {levelItems.map((item) => (
                  <div key={`${item.displayLabel}-${item.price}`} className={cn("rounded-[20px] border px-4 py-4", item.tone)}>
                    <p className="text-xs font-medium opacity-80">{item.displayLabel}</p>
                    <p className="mt-2 text-base font-semibold">{item.displayPrice}</p>
                    <p className="mt-2 text-xs leading-5 opacity-80">{item.meaning}</p>
                  </div>
                ))}
              </div>
            ) : null}
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
