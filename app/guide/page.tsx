import Link from "next/link";
import {
  Activity,
  BookOpenText,
  CheckCircle2,
  Compass,
  HandHeart,
  Radar,
  ShieldAlert,
  Sparkles
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const serviceFlow = [
  {
    title: "1. 오늘의 운영 요약 확인",
    description: "먼저 전일 종가 기준 장전 계획에서 오늘 신규 매수를 몇 개까지 볼 수 있는지, 지금이 공격 구간인지 관찰 구간인지부터 확인합니다.",
    href: "/recommendations",
    label: "오늘의 운영 요약 보기",
    icon: Sparkles
  },
  {
    title: "2. 장초 재판정 후 행동 후보만 확인",
    description: "종목을 볼 때는 점수보다 장초 5~10분 재판정, 매수 구간, 손절 기준, 1차 목표가가 함께 있는지부터 봅니다.",
    href: "/recommendations",
    label: "오늘 먼저 볼 종목 보기",
    icon: Compass
  },
  {
    title: "3. 보유와 관찰을 따로 관리",
    description: "이미 추적 중인 종목은 계속 들고 갈지, 관찰만 할지, 지금은 쉬어야 할지 분리해서 봅니다.",
    href: "/tracking",
    label: "보유/관찰 관리 보기",
    icon: Activity
  }
] as const;

const operatingPrinciples = [
  "이 서비스는 좋은 종목을 많이 나열하는 서비스가 아니라, 오늘 실제로 행동할 종목 수를 줄여주는 서비스입니다.",
  "좋아 보이는 종목이 많아도 모두 사는 것이 아니라, 규칙상 허용된 수만 봐야 합니다.",
  "장전 후보는 전일 종가 기준 계획이며, 장초 재판정 전까지는 최종 매수 신호가 아닙니다.",
  "매수 전에는 반드시 손절 기준과 목표 구간을 먼저 확인해야 합니다.",
  "관찰 종목과 장초 통과 시 매수 검토 종목은 다릅니다. 관찰은 준비 단계이고, 장초 통과 시 매수 검토는 조건이 확인된 상태입니다."
] as const;

const actionBuckets = [
  {
    title: "장초 통과 시 매수 검토",
    description: "장초 재판정을 통과하면 진입을 검토할 수 있는 종목입니다. 매수 구간, 손절 기준, 목표 구간을 함께 확인합니다."
  },
  {
    title: "관찰만",
    description: "흐름은 좋지만 아직 조건이 덜 갖춰진 종목입니다. 지금 바로 추격하기보다 대기합니다."
  },
  {
    title: "보유 관리",
    description: "이미 추적 중인 종목입니다. 추가 매수보다 보유 유지, 손절, 부분 익절 여부를 봅니다."
  },
  {
    title: "보류 또는 추격 금지",
    description: "단기 과열이나 구조 훼손 때문에 지금은 손대지 않는 종목입니다. 놓친 종목을 억지로 따라가지 않습니다."
  }
] as const;

const tradeChecklist = [
  "장초 재판정을 통과한 매수 검토 종목인가, 아니면 관찰만 하는 종목인가?",
  "어디 가격대에서 들어갈 것인가?",
  "틀리면 어디서 바로 끊을 것인가?",
  "맞으면 어디서 먼저 일부 이익을 챙길 것인가?",
  "오늘 전체 포트폴리오에서 몇 개까지만 새로 살 것인가?"
] as const;

const pageRoles = [
  {
    title: "오늘의 운영 요약",
    icon: Radar,
    description: "오늘 시장을 공격적으로 볼지, 보수적으로 볼지와 먼저 볼 종목 수를 정리하는 시작 화면입니다."
  },
  {
    title: "보유/관찰 관리",
    icon: Activity,
    description: "서비스가 계속 추적하는 종목을 보며 유지, 관찰, 종료 판단을 정리하는 화면입니다."
  },
  {
    title: "종목별 상세 분석",
    icon: Compass,
    description: "한 종목을 자세히 볼 때 매수 구간, 손절 기준, 목표 구간, 차트 구조를 확인하는 화면입니다."
  },
  {
    title: "이용 가이드",
    icon: BookOpenText,
    description: "이 서비스가 무엇을 해주는지와 사용자가 어떤 순서로 판단하면 되는지 빠르게 익히는 화면입니다."
  },
  {
    title: "운영 후원",
    icon: HandHeart,
    description: "서비스 운영을 응원하고 싶은 사용자를 위한 안내 화면입니다."
  }
] as const;

const scoreNotes = [
  {
    title: "점수는 우선순위입니다",
    description: "점수는 어떤 종목을 먼저 볼지 정리하는 보조 정보입니다. 점수만 높다고 바로 매수하는 것은 아닙니다."
  },
  {
    title: "행동 문장이 더 중요합니다",
    description: "기본 화면에서는 점수보다 장초 통과 시 매수 검토인지, 관찰만 해야 하는지가 먼저 보여야 합니다."
  },
  {
    title: "세부 로그는 확인용입니다",
    description: "점수 로그와 세부 지표는 왜 이런 판단이 나왔는지 확인하는 용도이며, 처음부터 모두 읽을 필요는 없습니다."
  }
] as const;

export default function GuidePage() {
  return (
    <main className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Guide"
        title="서비스 이용 가이드"
        description="복잡한 점수보다 오늘 무엇을 어떻게 판단해야 하는지 중심으로 서비스를 이해할 수 있게 정리했습니다."
      />

      <section className="grid gap-6 xl:grid-cols-3">
        {serviceFlow.map((step) => {
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
              <CheckCircle2 className="h-5 w-5 text-primary" />
              먼저 이해해야 할 운영 원칙
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {operatingPrinciples.map((item) => (
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
              <Radar className="h-5 w-5 text-primary" />
              각 화면이 하는 일
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {pageRoles.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <div className="flex items-center gap-2 text-foreground">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{item.title}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground/80">{item.description}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              화면에서 먼저 볼 행동 구분
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {actionBuckets.map((item) => (
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
              종목을 볼 때 꼭 확인할 질문
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tradeChecklist.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-foreground/82">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <BookOpenText className="h-5 w-5 text-primary" />
              점수는 이렇게 읽으면 충분합니다
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {scoreNotes.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-foreground/80">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
