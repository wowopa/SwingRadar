import Link from "next/link";
import { BookOpenText, CheckCircle2, Compass, Radar, Route, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    title: "1. 추천에서 오늘의 후보를 확인",
    description: "오늘 시장에서 먼저 볼 만한 종목과 추천 이유, 다시 체크해야 할 가격 기준을 빠르게 확인합니다.",
    href: "/recommendations",
    label: "추천 보기",
    icon: Radar
  },
  {
    title: "2. 분석에서 근거와 구조를 이해",
    description: "추세, 거래대금, 기술 지표, 이벤트 커버리지를 보고 왜 이 종목을 보는지 해석합니다.",
    href: "/analysis/005930",
    label: "분석 예시 보기",
    icon: Compass
  },
  {
    title: "3. 추적에서 실제 결과를 확인",
    description: "서비스가 공용으로 추적한 종목이 어떻게 이어졌는지, 왜 종료됐는지까지 결과를 확인합니다.",
    href: "/tracking",
    label: "추적 보기",
    icon: Route
  }
] as const;

const signals = [
  {
    title: "추세 점수",
    description: "가격이 중기 흐름 위에서 버티고 있는지, 방향성이 살아 있는지를 먼저 봅니다."
  },
  {
    title: "거래대금",
    description: "단순 거래량보다 실제로 돈이 붙는 종목인지가 더 중요합니다."
  },
  {
    title: "상대 거래량",
    description: "최근 평균보다 거래가 조금 더 붙는 구간은 좋지만, 과열 구간은 따로 조심해서 봅니다."
  },
  {
    title: "기준 이탈",
    description: "어느 가격 아래로 내려가면 다시 봐야 하는지 기준이 분명해야 무리한 대응을 줄일 수 있습니다."
  },
  {
    title: "RSI / MACD",
    description: "과열과 추세 확인을 돕는 보조 신호입니다. 단독 판단보다 흐름 확인용으로 함께 봅니다."
  },
  {
    title: "검증 근거",
    description: "실측 기반인지, 유사 업종 참고인지에 따라 신뢰도를 다르게 읽습니다."
  }
] as const;

const cautions = [
  "점수가 높아도 기준 이탈 가격이 너무 가깝거나 거래대금이 약하면 먼저 걸러서 보는 편이 좋습니다.",
  "뉴스가 많다고 항상 좋은 종목은 아닙니다. 추세와 거래가 함께 받쳐주는지가 더 중요합니다.",
  "상대 거래량이 너무 높은 종목은 단기 급등 뒤 흔들림이 커질 수 있어 보수적으로 봅니다.",
  "자동 편입과 자동 추적은 참고 기준이고, 분석 화면에서 가격 구조까지 함께 보는 것이 더 안전합니다."
] as const;

const autoWatchRules = [
  "추천 상위권에 반복해서 오르고 유동성 기준을 통과한 종목만 감시 대상으로 좁혀집니다.",
  "현재가가 너무 낮거나 거래대금이 부족하면 상위 후보라도 감시 강도를 낮춥니다.",
  "과열된 거래량과 무리한 확장 구간은 감점해 감시 우선순위를 낮춥니다."
] as const;

const autoTrackingRules = [
  "추적은 개인 기록이 아니라 서비스가 공용으로 시작한 관찰 사례입니다.",
  "감시 종목 중 점수, 유동성, 가격 구조 기준을 통과한 종목만 추적 상태로 승격됩니다.",
  "추적이 시작되면 시작가, 기준 이탈가, 목표 구간, 보유 기간을 함께 기록합니다.",
  "기준 이탈, 목표 도달, 최대 보유 기간 초과 중 하나가 발생하면 자동 종료됩니다."
] as const;

const productView = [
  "이 서비스는 사용자가 매매를 기록하는 도구가 아니라, 서비스가 매일 시장을 해석해 정리한 공용 화면에 가깝습니다.",
  "추천은 오늘 먼저 볼 후보이고, 감시는 기준을 통과한 종목, 추적은 서비스가 실제로 공용 관찰 사례로 채택한 종목입니다.",
  "따라서 사용자는 무엇을 입력해야 하느냐보다, 서비스가 어떤 흐름을 중요하게 보는지를 관찰하는 쪽으로 이해하면 더 자연스럽습니다."
] as const;

export default function GuidePage() {
  return (
    <main className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Guide"
        title="서비스 이용 가이드"
        description="추천, 분석, 감시, 추적이 어떤 흐름으로 이어지고, 서비스가 어떤 기준으로 종목을 고르는지 한 번에 정리해두었습니다."
      />

      <section className="grid gap-6 xl:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.title} className="border-border/70 bg-white/82 shadow-sm">
              <CardHeader className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl text-foreground">{step.title}</CardTitle>
                  <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              </CardHeader>
              <CardContent>
                <Link
                  href={step.href}
                  className="inline-flex items-center rounded-full border border-border/70 bg-secondary/55 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/35 hover:text-primary"
                >
                  {step.label}
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              먼저 보면 좋은 신호
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {signals.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-foreground/78">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <ShieldAlert className="h-5 w-5 text-primary" />
              이런 흐름은 조심해서 봅니다
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cautions.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-foreground/82">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              자동 감시 기준
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {autoWatchRules.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-foreground/82">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <Route className="h-5 w-5 text-primary" />
              자동 추적 기준
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {autoTrackingRules.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-foreground/82">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <BookOpenText className="h-5 w-5 text-primary" />
              서비스를 보는 관점
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-foreground/80">
            {productView.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <Compass className="h-5 w-5 text-primary" />
              기준 문서
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-foreground/80">
            <p>
              서비스의 목표와 자동 운영 철학은{" "}
              <Link href="/guide" className="font-medium text-primary underline-offset-4 hover:underline">
                이 가이드
              </Link>
              에서 자연스럽게 함께 읽을 수 있도록 정리해두었습니다.
            </p>
            <p>앞으로 추천, 감시, 추적, 종료 기능도 모두 같은 기준을 바탕으로 같은 언어와 같은 흐름으로 맞춰갑니다.</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
