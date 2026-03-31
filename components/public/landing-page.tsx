import Link from "next/link";
import { ArrowRight, BookOpenText, BriefcaseBusiness, Compass, Radar, ShieldCheck, WalletCards } from "lucide-react";

import { LandingWorkflowDemo } from "@/components/public/landing-workflow-demo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const painPoints = [
  {
    title: "종목은 많은데 다 살 수는 없습니다.",
    description: "좋아 보이는 종목이 여러 개 보여도 실제로는 포트폴리오 슬롯과 리스크 한도 안에서 소수만 골라야 합니다."
  },
  {
    title: "점수만 높다고 바로 사면 늦습니다.",
    description: "전일 기준으로 좋았던 후보라도 장초 갭상승과 과열 여부를 다시 확인해야 합니다."
  },
  {
    title: "결국 궁금한 것은 오늘의 행동입니다.",
    description: "그래서 이 서비스는 분석 설명보다 장전 후보, 장초 확인, 당일 행동 순서를 먼저 보여줍니다."
  }
] as const;

const appAreas = [
  {
    icon: Radar,
    title: "Dashboard",
    description: "오늘의 운영 모드, 실제 매수 검토, 장초 확인, 보유 관리 알림을 한 화면에서 확인합니다."
  },
  {
    icon: WalletCards,
    title: "Portfolio",
    description: "이미 보유 중인 종목을 손절, 부분 익절, 시간 손절 기준으로 관리합니다."
  },
  {
    icon: Compass,
    title: "Explore",
    description: "오늘의 후보 순위, 전체 탐색, 종목 상세 분석을 필요할 때만 깊게 확인합니다."
  },
  {
    icon: BriefcaseBusiness,
    title: "Account",
    description: "총 자산, 가용 현금, 손실 한도, 보유 종목을 저장해 내 기준으로 행동 보드를 계산합니다."
  }
] as const;

const faqs = [
  {
    question: "1위 종목이면 바로 사는 건가요?",
    answer: "아닙니다. 전일 데이터로 고른 장전 후보일 뿐이고, 장초 확인을 통과해야 오늘 행동 보드로 올라갑니다."
  },
  {
    question: "종목이 많이 보이면 다 사야 하나요?",
    answer: "아닙니다. 이 서비스는 오히려 포지션 수를 제한하고, 오늘 실제로 검토할 0~2개만 남기는 방향을 목표로 합니다."
  },
  {
    question: "손절과 익절은 누가 정하나요?",
    answer: "서비스가 진입 구간, 손절 기준, 1차 목표를 함께 제안하고, 보유 관리 보드에서 다음 행동을 이어서 보여줍니다."
  },
  {
    question: "왜 로그인 후에만 기능을 볼 수 있나요?",
    answer: "이제 서비스의 핵심 가치가 내 자산과 내 보유 기준의 개인화된 행동 보드이기 때문에, 개인 계정이 있어야 경험이 완성됩니다."
  }
] as const;

export function LandingPage() {
  return (
    <main className="space-y-10 pb-10">
      <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.96fr)] xl:items-start">
        <div className="space-y-6">
          <Badge variant="positive">Action-First Swing Operating System</Badge>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.06em] text-foreground sm:text-[4.2rem]">
              매일 수많은 종목 대신, 오늘 실행할 0~2개의 행동만 남깁니다.
            </h1>
            <p className="max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              SWING-RADAR는 분석 리포트를 길게 보여주는 대신, 장전 후보를 추리고 장초 확인으로 다시 걸러 내며 포트폴리오 한도 안에서
              실제로 검토할 종목만 남기는 스윙 운용 경험을 제공합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/auth">
                로그인하고 시작하기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="#workflow">운영 흐름 먼저 보기</Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "신규 매수", value: "0~2개", note: "다 사는 서비스가 아닙니다." },
              { label: "판단 순서", value: "3단계", note: "장전 후보 -> 장초 확인 -> 당일 행동" },
              { label: "핵심 기준", value: "행동 우선", note: "점수보다 지금 해야 할 행동을 먼저 보여줍니다." }
            ].map((item) => (
              <Card key={item.label} className="border-border/70 bg-white/82 shadow-sm">
                <CardContent className="space-y-2 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                  <p className="text-3xl font-semibold tracking-[-0.05em] text-foreground">{item.value}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{item.note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <LandingWorkflowDemo />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {painPoints.map((item) => (
          <Card key={item.title} className="border-border/70 bg-white/82 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <p className="text-lg font-semibold text-foreground">{item.title}</p>
              <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="workflow" className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="eyebrow-label">Why It Works</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-foreground">차분한 스윙 운용에 맞게 설계했습니다.</h2>
              </div>
            </div>
            <div className="space-y-3">
              {[
                "장전 후보는 전일 데이터 기준의 계획이고, 장중 추격 신호가 아닙니다.",
                "장초 확인을 통과해야만 오늘 실제 행동 보드로 올라갑니다.",
                "보유 종목 수와 같은 섹터 수까지 함께 보아 오늘 과도한 진입을 막습니다.",
                "매수 구간, 손절 기준, 1차 목표, 권장 비중까지 함께 제시해 행동 문장으로 마무리합니다."
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-border/70 bg-secondary/25 px-4 py-3 text-sm leading-7 text-foreground/82">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BookOpenText className="h-5 w-5" />
              </div>
              <div>
                <p className="eyebrow-label">What Changes After Login</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-foreground">로그인 후에는 설명 대신 운용 화면이 열립니다.</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {appAreas.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.title} className="rounded-2xl border border-border/70 bg-secondary/25 p-4">
                    <div className="flex items-center gap-2 text-foreground">
                      <Icon className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">{item.title}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="eyebrow-label">FAQ</p>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">사용자가 가장 자주 묻는 질문부터 답합니다.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((item) => (
            <Card key={item.question} className="border-border/70 bg-white/82 shadow-sm">
              <CardContent className="space-y-3 p-6">
                <p className="text-lg font-semibold text-foreground">{item.question}</p>
                <p className="text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

