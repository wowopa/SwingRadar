import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TechnicalIndicators } from "@/types/analysis";

function formatPrice(value: number | null) {
  if (value === null) return "계산 중";
  return `${Math.round(value).toLocaleString()}원`;
}

function formatNumber(value: number | null, digits = 1) {
  if (value === null) return "계산 중";
  return value.toFixed(digits);
}

function describeRsi(value: number | null) {
  if (value === null) return "가격 이력이 더 쌓이면 계산됩니다.";
  if (value >= 70) return "RSI가 높아 단기 과열 가능성을 먼저 봐야 합니다.";
  if (value <= 35) return "RSI가 낮아 반등 여지도 함께 볼 수 있습니다.";
  return "RSI는 중립 구간으로, 추세 확인이 더 중요합니다.";
}

function describeMacd(indicators: TechnicalIndicators) {
  if (indicators.macd === null || indicators.macdSignal === null || indicators.macdHistogram === null) {
    return "MACD는 계산 중입니다.";
  }

  if (indicators.macd > indicators.macdSignal && indicators.macdHistogram > 0) {
    return "MACD가 시그널선 위에 있어 추세 흐름은 비교적 우호적입니다.";
  }

  if (indicators.macd < indicators.macdSignal && indicators.macdHistogram < 0) {
    return "MACD가 시그널선 아래에 있어 반등 강도 확인이 더 필요합니다.";
  }

  return "MACD가 시그널선 근처에서 방향을 고르는 구간입니다.";
}

function describeBands(indicators: TechnicalIndicators) {
  if (indicators.bollingerUpper === null || indicators.bollingerLower === null) {
    return "볼린저 밴드는 계산 중입니다.";
  }

  return `${formatPrice(indicators.bollingerLower)} ~ ${formatPrice(indicators.bollingerUpper)} 구간을 현재 변동성 범위로 봅니다.`;
}

function describeVolume(value: number | null) {
  if (value === null) return "거래량 비교값은 계산 중입니다.";
  if (value >= 1.3) return "거래량이 최근 20일 평균보다 강하게 들어오고 있습니다.";
  if (value <= 0.8) return "거래량이 평균보다 가벼워 추세 확인이 더 필요합니다.";
  return "거래량은 최근 평균 수준입니다.";
}

function summarizeTrend(indicators: TechnicalIndicators) {
  if (indicators.sma20 === null || indicators.sma60 === null) return "이동평균선 계산 중";
  if (indicators.sma20 > indicators.sma60) return "단기선이 중기선 위";
  if (indicators.sma20 < indicators.sma60) return "단기선이 중기선 아래";
  return "이동평균선 수렴";
}

export function TechnicalIndicatorsPanel({ indicators }: { indicators: TechnicalIndicators }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>핵심 보조지표</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <IndicatorPill label="이동평균" value={summarizeTrend(indicators)} />
          <IndicatorPill label="RSI" value={formatNumber(indicators.rsi14)} />
          <IndicatorPill label="MACD" value={formatNumber(indicators.macd)} />
          <IndicatorPill label="볼린저 밴드" value={indicators.bollingerUpper ? "표시 중" : "계산 중"} />
          <IndicatorPill label="거래량" value={formatNumber(indicators.volumeRatio20, 2)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <IndicatorMetric label="20일선" value={formatPrice(indicators.sma20)} note="단기 평균 가격" />
          <IndicatorMetric label="60일선" value={formatPrice(indicators.sma60)} note="중기 기준선" />
          <IndicatorMetric label="20EMA" value={formatPrice(indicators.ema20)} note="최근 흐름 반영" />
          <IndicatorMetric label="RSI(14)" value={formatNumber(indicators.rsi14)} note="과열·침체 확인" />
          <IndicatorMetric label="MACD" value={formatNumber(indicators.macd)} note={`시그널 ${formatNumber(indicators.macdSignal)}`} />
          <IndicatorMetric label="거래량 배수" value={formatNumber(indicators.volumeRatio20, 2)} note="20일 평균 대비" />
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <IndicatorComment title="RSI 해석" body={describeRsi(indicators.rsi14)} />
          <IndicatorComment title="MACD 해석" body={describeMacd(indicators)} />
          <IndicatorComment title="볼린저 밴드" body={describeBands(indicators)} />
        </div>
        <div className="rounded-[28px] border border-border/70 bg-secondary/35 p-5">
          <p className="text-sm font-semibold text-foreground">거래량 흐름</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{describeVolume(indicators.volumeRatio20)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function IndicatorMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
    </div>
  );
}

function IndicatorComment({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[28px] border border-border/70 bg-background/45 p-5">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p>
    </div>
  );
}

function IndicatorPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-foreground/80">
      {label} · {value}
    </div>
  );
}
