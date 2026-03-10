import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TechnicalIndicators } from "@/types/analysis";

function formatPrice(value: number | null) {
  if (value === null) return "계산 중";
  return `${Math.round(value).toLocaleString()}원`;
}

function formatNumber(value: number | null, digits = 1) {
  if (value === null) return "계산 중";
  return value.toFixed(digits);
}

function getTrendStatus(indicators: TechnicalIndicators) {
  if (indicators.sma20 === null || indicators.sma60 === null) {
    return { label: "계산 중", tone: "bg-slate-100 text-slate-700", note: "가격 이력이 더 필요합니다." };
  }

  if (indicators.sma20 > indicators.sma60) {
    return { label: "좋음", tone: "bg-emerald-100 text-emerald-700", note: "20일선이 60일선 위에 있어 중기 추세가 비교적 안정적입니다." };
  }

  return { label: "주의", tone: "bg-rose-100 text-rose-700", note: "20일선이 60일선 아래라 추세가 아직 약한 편입니다." };
}

function getRsiStatus(value: number | null) {
  if (value === null) {
    return { label: "계산 중", tone: "bg-slate-100 text-slate-700", note: "RSI를 계산할 가격 이력이 아직 부족합니다." };
  }
  if (value >= 45 && value <= 65) {
    return { label: "좋음", tone: "bg-emerald-100 text-emerald-700", note: "과열도 과매도도 아닌 무난한 구간입니다." };
  }
  if (value > 70) {
    return { label: "주의", tone: "bg-rose-100 text-rose-700", note: "단기 과열에 가까워 추격 매수는 조심하는 편이 좋습니다." };
  }
  return { label: "보통", tone: "bg-amber-100 text-amber-700", note: "반등 여지는 있지만 추가 확인이 더 필요합니다." };
}

function getMacdStatus(indicators: TechnicalIndicators) {
  if (indicators.macd === null || indicators.macdSignal === null || indicators.macdHistogram === null) {
    return { label: "계산 중", tone: "bg-slate-100 text-slate-700", note: "MACD를 계산할 정보가 아직 충분하지 않습니다." };
  }
  if (indicators.macd > indicators.macdSignal && indicators.macdHistogram > 0) {
    return { label: "좋음", tone: "bg-emerald-100 text-emerald-700", note: "시그널선 위에서 움직여 추세 확인 신호로는 비교적 좋습니다." };
  }
  if (indicators.macd < indicators.macdSignal && indicators.macdHistogram < 0) {
    return { label: "주의", tone: "bg-rose-100 text-rose-700", note: "시그널선 아래에 있어 추가 약세를 함께 봐야 합니다." };
  }
  return { label: "보통", tone: "bg-amber-100 text-amber-700", note: "방향이 뚜렷하지 않아 다른 신호와 함께 보는 편이 좋습니다." };
}

function getVolumeStatus(value: number | null) {
  if (value === null) {
    return { label: "계산 중", tone: "bg-slate-100 text-slate-700", note: "거래량 비교값을 계산 중입니다." };
  }
  if (value >= 1.05 && value <= 2) {
    return { label: "좋음", tone: "bg-emerald-100 text-emerald-700", note: "최근 평균보다 거래가 적당히 붙는 상태입니다." };
  }
  if (value > 2.5) {
    return { label: "주의", tone: "bg-rose-100 text-rose-700", note: "거래가 과하게 몰린 상태라 단기 과열일 수 있습니다." };
  }
  return { label: "보통", tone: "bg-amber-100 text-amber-700", note: "거래가 아주 강하지도 약하지도 않은 편입니다." };
}

export function TechnicalIndicatorsPanel({ indicators }: { indicators: TechnicalIndicators }) {
  const trend = getTrendStatus(indicators);
  const rsi = getRsiStatus(indicators.rsi14);
  const macd = getMacdStatus(indicators);
  const volume = getVolumeStatus(indicators.volumeRatio20);

  const items = [
    {
      label: "이동평균",
      value: indicators.sma20 !== null && indicators.sma60 !== null ? `20일선 ${formatPrice(indicators.sma20)} / 60일선 ${formatPrice(indicators.sma60)}` : "계산 중",
      status: trend
    },
    {
      label: "RSI(14)",
      value: formatNumber(indicators.rsi14),
      status: rsi
    },
    {
      label: "MACD",
      value: indicators.macd !== null ? `${formatNumber(indicators.macd)} / 시그널 ${formatNumber(indicators.macdSignal)}` : "계산 중",
      status: macd
    },
    {
      label: "거래량 배수",
      value: indicators.volumeRatio20 !== null ? `${formatNumber(indicators.volumeRatio20, 2)}배` : "계산 중",
      status: volume
    },
    {
      label: "20EMA",
      value: formatPrice(indicators.ema20),
      status: trend
    },
    {
      label: "볼린저 밴드",
      value:
        indicators.bollingerLower !== null && indicators.bollingerUpper !== null
          ? `${formatPrice(indicators.bollingerLower)} ~ ${formatPrice(indicators.bollingerUpper)}`
          : "계산 중",
      status: {
        label: "참고",
        tone: "bg-slate-100 text-slate-700",
        note: "최근 가격이 움직이는 범위를 함께 보는 참고 지표입니다."
      }
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>핵심 보조지표</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-[24px] border border-border/70 bg-secondary/35 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <span className={cn("rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap", item.status.tone)}>
                {item.status.label}
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.status.note}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
