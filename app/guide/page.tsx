import Link from "next/link";
import { BookOpenText, CheckCircle2, Compass, Radar, Route, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    title: "1. 관찰 종목부터 보기",
    description: "추천 화면에서 지금 흐름을 볼 만한 종목과 점수, 기준 가격을 먼저 확인합니다.",
    href: "/recommendations",
    label: "추천 보기",
    icon: Radar
  },
  {
    title: "2. 상세 분석 읽기",
    description: "종목을 눌러 왜 보는지, 어떤 가격을 기준으로 봐야 하는지, 어떤 시나리오가 가능한지 확인합니다.",
    href: "/analysis/005930",
    label: "분석 예시 보기",
    icon: Compass
  },
  {
    title: "3. 이후 흐름 추적하기",
    description: "추적 화면에서 실제로 얼마나 움직였는지, 기대와 달랐는지, 다시 볼 점은 무엇인지 살펴봅니다.",
    href: "/tracking",
    label: "추적 보기",
    icon: Route
  }
] as const;

const signals = [
  {
    title: "점수",
    description: "숫자가 높을수록 현재 흐름이 상대적으로 더 좋아 보인다는 뜻입니다."
  },
  {
    title: "기준 이탈",
    description: "이 가격 아래로 내려가면 이번 흐름은 다시 점검해야 한다는 뜻입니다."
  },
  {
    title: "검증 승률",
    description: "비슷한 흐름이 과거에 얼마나 자주 잘 이어졌는지 보여줍니다."
  },
  {
    title: "최대 하락",
    description: "비슷한 흐름에서 중간에 얼마나 크게 흔들릴 수 있었는지 보여줍니다."
  }
] as const;

const cautions = [
  "점수가 높아도 바로 매수 신호로 받아들이기보다 기준 가격과 뉴스 흐름을 함께 보시는 편이 좋습니다.",
  "뉴스가 적거나 검증 표본이 적으면 결과가 더 보수적으로 보일 수 있습니다.",
  "화면의 설명은 판단 보조용이며, 실제 투자 결정은 본인 기준과 함께 보셔야 합니다."
] as const;

export default function GuidePage() {
  return (
    <main className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Guide"
        title="서비스 사용 방법"
        description="처음 들어오신 분도 추천, 분석, 추적 화면을 어떤 순서로 보면 되는지 빠르게 익힐 수 있도록 정리했습니다."
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

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <BookOpenText className="h-5 w-5 text-primary" />
              화면에서 자주 보는 표현
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
              이렇게 보시면 더 좋습니다
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
    </main>
  );
}
