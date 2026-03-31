import Link from "next/link";
import { ArrowRight, Compass, LockKeyhole, Radar, ShieldCheck, TimerReset, WalletCards } from "lucide-react";

import { LandingWorkflowDemo } from "@/components/public/landing-workflow-demo";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const promiseStrip = [
  { label: "신규 매수", value: "0~2개", note: "많이 고르는 서비스가 아닙니다." },
  { label: "장초 점검", value: "5~10분", note: "시초가와 구조를 짧게 다시 봅니다." },
  { label: "운용 기준", value: "개인화", note: "내 자산과 보유 기준으로 판단합니다." }
] as const;

const painNarrative = [
  {
    title: "종목이 많을수록 결정은 더 어려워집니다.",
    body: "좋아 보이는 종목이 열 개 보여도 실제로 매수할 수 있는 종목은 많지 않습니다. 그래서 서비스는 후보를 늘리는 대신, 오늘 실제로 검토할 소수의 종목만 남겨야 합니다."
  },
  {
    title: "전일 강했던 종목이 오늘도 좋은 종목은 아닙니다.",
    body: "장전 후보는 계획일 뿐입니다. 시초가가 과하게 뜨거나 손절 여유가 얕아지면 그 종목은 바로 추격 금지 또는 관찰 유지로 내려가야 합니다."
  },
  {
    title: "사용자가 궁금한 건 설명이 아니라 행동입니다.",
    body: "그래서 SWING-RADAR는 점수와 분석을 앞세우지 않습니다. 오늘 뭘 볼지, 무엇을 보류할지, 얼마까지 살 수 있을지를 먼저 보여주는 방식으로 바뀌었습니다."
  }
] as const;

const productSurfaces = [
  {
    title: "Dashboard",
    eyebrow: "오늘 먼저 볼 화면",
    description: "오늘 매수 검토, 장초 확인 대기, 보유 즉시 점검을 한 화면에서 정리합니다.",
    bullets: ["오늘 실제 매수 검토 0~2개", "장초 확인 대기 종목", "긴급 보유 관리 알림"],
    icon: Radar,
    span: "lg:col-span-7"
  },
  {
    title: "Portfolio",
    eyebrow: "보유 관리",
    description: "이미 보유 중인 종목을 손절, 부분 익절, 보호 가격 상향 기준으로 나눕니다.",
    bullets: ["즉시 점검", "부분 익절 검토", "시간 손절 검토"],
    icon: WalletCards,
    span: "lg:col-span-5"
  },
  {
    title: "Account",
    eyebrow: "개인 운용 기준",
    description: "총 자산, 가용 현금, 손실 한도, 보유 종목을 저장해 내 기준으로 행동을 계산합니다.",
    bullets: ["자산 규모 입력", "현금과 손실 한도", "사용자별 행동 보드"],
    icon: LockKeyhole,
    span: "lg:col-span-4"
  },
  {
    title: "Explore",
    eyebrow: "필요할 때만 깊게",
    description: "전체 후보와 상세 분석은 뒤로 보내고, 오늘 행동을 정한 뒤에만 깊게 들어갑니다.",
    bullets: ["상세 분석", "후보 비교", "보류 종목 점검"],
    icon: Compass,
    span: "lg:col-span-8"
  }
] as const;

const faqs = [
  {
    question: "1위 종목이면 바로 사는 건가요?",
    answer: "아닙니다. 장전 후보일 뿐입니다. 장초 확인을 통과하고 포트폴리오 한도까지 맞아야 오늘 실제 행동 보드에 올라갑니다."
  },
  {
    question: "종목이 많이 보이면 다 사야 하나요?",
    answer: "아닙니다. 이 서비스는 오히려 종목 수를 줄이는 쪽에 가깝습니다. 좋은 후보가 많아도 오늘 신규 매수는 0~2개만 남기는 방향으로 설계했습니다."
  },
  {
    question: "왜 로그인해야 기능을 볼 수 있나요?",
    answer: "핵심 가치가 내 자산, 내 보유, 내 손실 한도 기준의 개인화된 행동 보드이기 때문입니다. 로그인 후에야 운용 화면이 완성됩니다."
  },
  {
    question: "이 서비스는 실시간 급등 추격용인가요?",
    answer: "아닙니다. 전일 데이터로 장전 계획을 만들고, 장초에 짧게 다시 확인한 뒤 행동을 좁혀가는 차분한 스윙 운용 흐름을 전제로 합니다."
  }
] as const;

export function LandingPage() {
  return (
    <main className="space-y-24 pb-16">
      <ScrollReveal>
        <section className="relative overflow-hidden rounded-[42px] border border-[hsl(220_18%_16%_/_0.08)] bg-[linear-gradient(145deg,hsl(220_26%_12%),hsl(210_18%_18%)_42%,hsl(38_32%_22%)_100%)] px-6 py-8 text-white shadow-[0_40px_120px_hsl(220_22%_12%_/_0.22)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(40_84%_70%_/_0.18),transparent_26%),radial-gradient(circle_at_80%_20%,hsl(202_72%_62%_/_0.18),transparent_24%),linear-gradient(180deg,transparent,rgba(255,255,255,0.02))]" />
          <div className="public-pan pointer-events-none absolute -right-12 top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,hsl(40_82%_72%_/_0.18),transparent_70%)] blur-3xl" />
          <div className="public-float-delayed pointer-events-none absolute left-10 top-20 h-24 w-24 rounded-full bg-[radial-gradient(circle,hsl(197_88%_74%_/_0.18),transparent_72%)] blur-2xl" />

          <div className="relative grid gap-10 xl:grid-cols-[minmax(0,1.02fr)_minmax(520px,0.98fr)] xl:items-end">
            <div className="space-y-8">
              <ScrollReveal delay={80}>
                <div className="space-y-5">
                  <Badge className="border-white/12 bg-white/8 text-white hover:bg-white/8" variant="secondary">
                    Action-first swing operating system
                  </Badge>
                  <div className="space-y-6">
                    <h1 className="max-w-5xl text-balance text-[clamp(4.2rem,10vw,8rem)] font-semibold leading-[0.9] tracking-[-0.1em] text-white">
                      오늘 무엇을 해야 하는지
                      <br />
                      먼저 답하는 스윙 서비스.
                    </h1>
                    <p className="max-w-3xl text-[clamp(1.05rem,1.8vw,1.32rem)] leading-8 text-white/72">
                      SWING-RADAR는 종목을 많이 나열하는 대신, 장전 후보를 만들고 장초에 다시 확인한 뒤 실제로 검토할 0~2개의
                      행동만 남기는 개인 운용 대시보드입니다.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={150}>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg" className="bg-white text-slate-950 hover:bg-white/92">
                    <Link href="/auth">
                      로그인하고 내 대시보드 열기
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="border border-white/14 bg-white/6 text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link href="#workflow">운용 흐름 보기</Link>
                  </Button>
                </div>
              </ScrollReveal>

              <div className="grid gap-3 md:grid-cols-3">
                {promiseStrip.map((item, index) => (
                  <ScrollReveal key={item.label} delay={220 + index * 70}>
                    <div className="rounded-[28px] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48">{item.label}</p>
                      <p className="mt-3 text-[clamp(2rem,3vw,2.7rem)] font-semibold leading-none tracking-[-0.08em] text-white">
                        {item.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/62">{item.note}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>

            <ScrollReveal delay={220} axis="x">
              <div className="relative public-float">
                <div className="absolute -inset-x-8 -top-8 h-32 rounded-full bg-[radial-gradient(circle,hsl(39_84%_72%_/_0.18),transparent_68%)] blur-3xl" />
                <div className="relative rounded-[36px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] p-4 backdrop-blur-xl sm:p-5">
                  <div className="rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(16,23,37,0.94),rgba(22,29,44,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">Today board</p>
                        <p className="mt-2 text-[clamp(1.9rem,3vw,2.9rem)] font-semibold tracking-[-0.07em] text-white">
                          오늘 실제 행동 2개
                        </p>
                      </div>
                      <span className="rounded-full border border-emerald-300/16 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
                        선별 모드
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {[
                        ["매수 검토", "2개"],
                        ["보유 점검", "1개"],
                        ["장초 확인 대기", "3개"]
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4">
                          <p className="text-xs font-medium text-white/48">{label}</p>
                          <p className="mt-2 text-[clamp(1.7rem,2.4vw,2.5rem)] font-semibold tracking-[-0.07em] text-white">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-3">
                      {[
                        ["ISC", "오늘 매수 검토", "진입 87,000 ~ 88,200 / 손절 83,400"],
                        ["DN오토모티브", "관찰 유지", "시초가 반응이 약하면 더 지켜보기"],
                        ["씨에스윈드", "추격 금지", "갭상승 과열로 오늘은 보류"]
                      ].map(([name, state, note], index) => (
                        <div
                          key={name}
                          className="rounded-[24px] border border-white/8 bg-white/[0.045] px-4 py-4 transition duration-300 hover:bg-white/[0.075]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-xs font-semibold text-white/72">
                                0{index + 1}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-white">{name}</p>
                                <p className="mt-1 text-xs text-white/46">{note}</p>
                              </div>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-medium text-white/72">
                              {state}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-[24px] border border-amber-300/16 bg-amber-300/8 px-4 py-4 text-sm leading-6 text-white/72">
                      종목이 많아도 다 사지 않습니다. 장초 확인과 포트폴리오 한도를 함께 통과한 종목만 오늘 행동 보드에 남깁니다.
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </ScrollReveal>

      <section id="overview" className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <ScrollReveal className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow-label">Overview</p>
          <h2 className="max-w-xl text-balance text-[clamp(3rem,6vw,5.2rem)] font-semibold leading-[0.94] tracking-[-0.08em] text-foreground">
            분석 리포트처럼 길게 읽지 않아도 되게 바꿨습니다.
          </h2>
          <p className="max-w-lg text-[clamp(1rem,1.4vw,1.18rem)] leading-8 text-muted-foreground">
            Stripe가 큰 문장과 명확한 정보 계층으로 제품 약속을 바로 전달하고, RH Design이 강한 타이포와 넓은 여백으로 장면을
            분리하듯이, 이 랜딩도 한 섹션에 하나의 메시지만 남기도록 다시 구성했습니다.
          </p>
        </ScrollReveal>

        <div className="space-y-4">
          {painNarrative.map((item, index) => (
            <ScrollReveal key={item.title} delay={index * 90}>
              <article className="rounded-[34px] border border-border/70 bg-white/76 p-6 shadow-[0_24px_80px_hsl(33_22%_26%_/_0.06)] backdrop-blur-xl sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/8 text-sm font-semibold text-primary">
                    0{index + 1}
                  </span>
                  <div className="space-y-3">
                    <h3 className="text-[clamp(1.8rem,2.8vw,2.7rem)] font-semibold leading-[1] tracking-[-0.06em] text-foreground">
                      {item.title}
                    </h3>
                    <p className="max-w-2xl text-base leading-8 text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="workflow" className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <ScrollReveal className="space-y-4">
            <p className="eyebrow-label">Workflow</p>
            <h2 className="max-w-3xl text-balance text-[clamp(3rem,6vw,5rem)] font-semibold leading-[0.94] tracking-[-0.08em] text-foreground">
              장전 후보에서 끝나지 않습니다.
              <br />
              장초 확인을 거쳐야 오늘 행동이 됩니다.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="rounded-[30px] border border-border/70 bg-white/72 px-5 py-5 text-[1.02rem] leading-8 text-muted-foreground shadow-[0_18px_56px_hsl(33_22%_24%_/_0.05)] backdrop-blur-xl sm:px-6">
              전일 데이터로 계획을 세우고, 장 시작 후 5~10분 동안 실제 행동 가능 여부를 다시 확인합니다. 이 짧은 점검이 실시간
              추격과 차분한 스윙을 가르는 핵심 단계입니다.
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={120}>
          <LandingWorkflowDemo />
        </ScrollReveal>
      </section>

      <section id="product" className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <ScrollReveal className="space-y-4">
            <p className="eyebrow-label">Product</p>
            <h2 className="max-w-3xl text-balance text-[clamp(3rem,6vw,5rem)] font-semibold leading-[0.94] tracking-[-0.08em] text-foreground">
              로그인 후에는 설명이 아니라
              <br />
              개인 운용 대시보드가 열립니다.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={110}>
            <div className="max-w-xl rounded-[28px] border border-border/70 bg-white/72 px-5 py-5 text-[1.02rem] leading-8 text-muted-foreground shadow-[0_18px_56px_hsl(33_22%_24%_/_0.05)] backdrop-blur-xl">
              공개 영역은 서비스 철학과 흐름만 보여주고, 실제 기능은 모두 로그인 후 대시보드 안쪽에서만 보이게 바꾸었습니다.
            </div>
          </ScrollReveal>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {productSurfaces.map((item, index) => {
            const Icon = item.icon;

            return (
              <ScrollReveal key={item.title} delay={index * 80} className={item.span}>
                <section className="h-full rounded-[34px] border border-border/70 bg-white/78 p-6 shadow-[0_24px_80px_hsl(33_22%_26%_/_0.06)] backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <p className="eyebrow-label">{item.eyebrow}</p>
                      <h3 className="text-[clamp(1.8rem,2.4vw,2.5rem)] font-semibold leading-[1] tracking-[-0.06em] text-foreground">
                        {item.title}
                      </h3>
                      <p className="max-w-xl text-sm leading-7 text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {item.bullets.map((bullet, bulletIndex) => (
                      <div
                        key={bullet}
                        className="rounded-[22px] border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-foreground/80"
                        style={{ transitionDelay: `${bulletIndex * 60}ms` }}
                      >
                        {bullet}
                      </div>
                    ))}
                  </div>
                </section>
              </ScrollReveal>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "장전 계획",
              note: "전일 데이터로 오늘 먼저 볼 종목을 미리 좁힙니다.",
              icon: ShieldCheck
            },
            {
              title: "장초 확인",
              note: "시초가와 구조를 짧게 다시 보고 통과 여부를 정합니다.",
              icon: TimerReset
            },
            {
              title: "개인 포트폴리오",
              note: "내 자산과 보유 기준으로 오늘 실제 행동을 제한합니다.",
              icon: WalletCards
            }
          ].map((item, index) => {
            const Icon = item.icon;

            return (
              <ScrollReveal key={item.title} delay={100 + index * 70}>
                <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,hsl(35_23%_98%_/_0.92),hsl(33_18%_95%_/_0.98))] px-5 py-5 shadow-[0_18px_56px_hsl(33_22%_24%_/_0.05)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-base font-semibold text-foreground">{item.title}</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.note}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      <ScrollReveal>
        <section
          id="faq"
          className="rounded-[40px] border border-border/70 bg-[linear-gradient(180deg,hsl(35_23%_98%_/_0.92),hsl(33_18%_95%_/_0.98))] px-6 py-8 shadow-[0_30px_100px_hsl(33_22%_24%_/_0.07)] sm:px-8 sm:py-10"
        >
          <div className="grid gap-10 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
            <div className="space-y-4">
              <p className="eyebrow-label">FAQ</p>
              <h2 className="max-w-xl text-balance text-[clamp(2.8rem,5vw,4.6rem)] font-semibold leading-[0.96] tracking-[-0.08em] text-foreground">
                사용자가 바로 묻는 질문부터
                <br />
                짧고 분명하게 답합니다.
              </h2>
              <p className="max-w-lg text-[clamp(1rem,1.4vw,1.18rem)] leading-8 text-muted-foreground">
                로그인 전에는 서비스가 어떤 원리로 종목 수를 줄이는지 이해하고, 로그인 후에는 내 기준의 운용 화면으로 바로
                이어지게 만드는 것이 목표입니다.
              </p>
              <div className="pt-2">
                <Button asChild size="lg">
                  <Link href="/auth">
                    내 기준으로 시작하기
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {faqs.map((item, index) => (
                <ScrollReveal key={item.question} delay={index * 70}>
                  <article className="rounded-[26px] border border-border/70 bg-white/82 px-5 py-5">
                    <h3 className="text-[clamp(1.15rem,1.8vw,1.45rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-foreground">
                      {item.question}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>
    </main>
  );
}
