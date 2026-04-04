import Link from "next/link";
import {
  ArrowRight,
  Radar,
  ShieldCheck,
  TimerReset,
  TrendingUp,
  WalletCards
} from "lucide-react";

import { LandingWorkflowDemo } from "@/components/public/landing-workflow-demo";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const landingStatusToneClasses = {
  positive: "border-emerald-300/45 bg-emerald-300/28 text-emerald-50",
  neutral: "border-amber-300/45 bg-amber-300/30 text-amber-50",
  caution: "border-rose-300/45 bg-rose-300/28 text-rose-50"
} as const;

const heroOutcomeStrip = [
  {
    label: "아침 루틴",
    value: "5~10분",
    note: "시장 시작 전, 오늘 볼 종목부터 먼저 정리합니다."
  },
  {
    label: "실행 후보",
    value: "0~2개",
    note: "보고 끝나는 목록이 아니라 실제 행동 후보만 남깁니다."
  },
  {
    label: "복기 흐름",
    value: "계획→실행→회고",
    note: "하루의 판단이 다음 날 더 분명한 규칙으로 이어집니다."
  }
] as const;

const heroMorningChecklist = [
  "장전 후보를 먼저 줄입니다.",
  "시초가 반응으로 통과와 보류를 나눕니다.",
  "종료 기록이 다음 규칙으로 돌아옵니다."
] as const;

const heroChartBars = [
  { height: 28, tone: "bg-rose-300/80" },
  { height: 54, tone: "bg-emerald-300/80" },
  { height: 38, tone: "bg-emerald-300/75" },
  { height: 68, tone: "bg-emerald-300/85" },
  { height: 44, tone: "bg-amber-300/80" },
  { height: 82, tone: "bg-emerald-200/90" },
  { height: 58, tone: "bg-emerald-300/78" },
  { height: 96, tone: "bg-emerald-200/95" },
  { height: 72, tone: "bg-rose-300/76" },
  { height: 62, tone: "bg-emerald-300/84" }
] as const;

const benefitNarrative = [
  {
    title: "아침에 무엇을 볼지 먼저 정해집니다.",
    body: "좋아 보이는 종목을 끝없이 넘기기보다, 오늘 다시 볼 이유가 있는 후보만 먼저 남깁니다. 그래서 시장이 열리기 전부터 시선이 훨씬 차분해집니다."
  },
  {
    title: "추격보다 기다림을 더 쉽게 만듭니다.",
    body: "시초가와 초반 반응을 짧게 다시 보면서 무리한 진입을 덜 하게 만듭니다. 덕분에 급한 결정 대신 통과와 보류를 더 분명하게 나눌 수 있습니다."
  },
  {
    title: "같은 종목도 내 계좌 기준으로 다르게 해석합니다.",
    body: "누구에게나 같은 답을 주는 대신, 보유 종목과 현금, 한도까지 반영해 오늘 실제로 움직일 수 있는 행동만 남깁니다."
  }
] as const;

const productSurfaces = [
  {
    title: "Today",
    eyebrow: "오늘 바로 보는 화면",
    description:
      "아침에 가장 먼저 열어야 하는 화면입니다. 오늘 다시 볼 종목, 매수 검토, 보유 우선 관리를 한 흐름으로 이어서 보여줍니다.",
    bullets: ["오늘 다시 볼 후보가 바로 보입니다.", "매수 검토와 보유 관리가 분리됩니다.", "길게 읽지 않아도 다음 행동이 먼저 보입니다."],
    icon: Radar,
    span: "lg:col-span-6"
  },
  {
    title: "Opening Check",
    eyebrow: "장초 5~10분",
    description:
      "시초가와 초반 반응만 짧게 확인하고 통과, 관찰, 보류를 빠르게 기록합니다. 그래서 아침 판단이 더 짧고 더 또렷해집니다.",
    bullets: ["3개 체크로 빠르게 판단합니다.", "통과와 보류를 바로 나눕니다.", "최근 내 규칙도 함께 참고합니다."],
    icon: TimerReset,
    span: "lg:col-span-6"
  },
  {
    title: "Portfolio",
    eyebrow: "실행 이후까지 이어지는 기록",
    description:
      "보유 종목, 체결 기록, 손절과 익절 흐름을 포지션 단위로 이어서 관리합니다. 하루 판단이 끝난 뒤에도 흐름이 끊기지 않습니다.",
    bullets: ["보유와 저널이 함께 움직입니다.", "부분 익절과 손절 기록이 자연스럽게 쌓입니다.", "하루의 실행이 그대로 복기로 이어집니다."],
    icon: WalletCards,
    span: "lg:col-span-7"
  },
  {
    title: "Reviews",
    eyebrow: "다음 날 더 나아지는 이유",
    description:
      "종료 거래를 복기하고, 반복된 문장을 개인 규칙으로 승격시켜 다음 날 장초 확인에 다시 반영합니다.",
    bullets: ["잘한 점과 아쉬운 점을 짧게 남깁니다.", "반복된 문장은 개인 규칙으로 승격됩니다.", "복기가 다음 날 행동 기준으로 돌아옵니다."],
    icon: ShieldCheck,
    span: "lg:col-span-5"
  }
] as const;

const experienceOutcomes = [
  {
    title: "볼 종목이 줄어듭니다.",
    note: "아침마다 긴 목록을 읽기보다, 실제로 다시 볼 후보부터 먼저 남깁니다.",
    icon: ShieldCheck
  },
  {
    title: "판단이 더 차분해집니다.",
    note: "시초가에서 한 번 더 걸러주기 때문에 조급한 추격 매수를 덜 하게 됩니다.",
    icon: TimerReset
  },
  {
    title: "기록이 다음 규칙이 됩니다.",
    note: "실행과 복기가 이어져, 반복되는 실수와 잘 맞는 패턴이 내 기준으로 쌓입니다.",
    icon: WalletCards
  }
] as const;

const finalDecisionOutcomes = [
  {
    title: "더 적게 봅니다.",
    body: "많이 읽는 아침 대신, 오늘 다시 볼 후보부터 먼저 남깁니다."
  },
  {
    title: "더 빨리 정합니다.",
    body: "장초 확인을 짧게 마치고 통과와 보류를 더 분명하게 나눕니다."
  },
  {
    title: "더 오래 남깁니다.",
    body: "하루의 실행과 복기가 다음 규칙으로 이어져 판단이 점점 선명해집니다."
  }
] as const;

const faqs = [
  {
    question: "어떤 사람에게 잘 맞나요?",
    answer: "장 시작 전과 장초 5~10분 사이에 오늘의 판단을 더 짧고 분명하게 정리하고 싶은 스윙 투자자에게 가장 잘 맞습니다."
  },
  {
    question: "왜 0~2개만 남긴다고 말하나요?",
    answer: "좋아 보이는 종목을 많이 보여주는 것보다, 실제로 움직일 수 있는 후보를 적게 남기는 편이 아침 판단과 실행에 더 도움이 되기 때문입니다."
  },
  {
    question: "자동 매수 서비스인가요?",
    answer: "아닙니다. 자동으로 사고파는 서비스가 아니라, 오늘 무엇을 볼지와 어떻게 기록하고 복기할지를 더 선명하게 만드는 운용 도구입니다."
  },
  {
    question: "로그인하면 무엇이 달라지나요?",
    answer: "내 계좌 기준으로 Today, Opening Check, Portfolio가 연결됩니다. 같은 종목도 내 보유와 현금, 규칙에 따라 다르게 해석됩니다."
  }
] as const;

const heroBoardItems = [
  {
    name: "ISC",
    status: "오늘 매수 검토",
    note: "진입 87,000 ~ 88,200 / 손절 83,400",
    tone: "positive" as const
  },
  {
    name: "DN오토모티브",
    status: "관찰 유지",
    note: "시초가 반응이 약하면 더 지켜보기",
    tone: "neutral" as const
  },
  {
    name: "씨에스윈드",
    status: "추격 금지",
    note: "이미 과열 구간이면 오늘은 보류",
    tone: "caution" as const
  }
] as const;

export function LandingPage() {
  return (
    <main className="space-y-28 pb-16">
      <section className="relative min-h-[calc(100vh-164px)] overflow-hidden rounded-[44px] border border-white/10 bg-[linear-gradient(135deg,hsl(221_24%_15%),hsl(222_22%_18%)_52%,hsl(37_34%_20%)_100%)] px-6 py-7 text-white shadow-[0_50px_140px_hsl(220_32%_8%_/_0.18)] sm:px-8 sm:py-9 lg:px-12 lg:py-10 xl:px-14">
        <div className="relative lg:grid lg:min-h-[calc(100vh-244px)] lg:grid-cols-[minmax(0,1fr)_minmax(39rem,47rem)] lg:items-center lg:gap-8 xl:grid-cols-[minmax(0,0.96fr)_minmax(42rem,50rem)]">
          <ScrollReveal>
            <div className="max-w-[980px] space-y-8">
              <div className="space-y-5">
                <Badge className="public-hero-badge text-white hover:bg-white/8" variant="secondary">
                  Action-first swing operating system
                </Badge>
                <div className="space-y-6">
                  <h1 className="headline-balance public-hero-title max-w-none text-[clamp(4.2rem,9.4vw,9.2rem)] font-semibold leading-[0.86] tracking-[-0.11em] lg:max-w-[14.4ch]">
                    <span className="block sm:whitespace-nowrap">더 쉬운 스윙 투자,</span>
                    <span className="block">SWING-RADAR</span>
                  </h1>
                  <p className="public-hero-copy max-w-[840px] text-[clamp(1.05rem,1.45vw,1.26rem)] leading-8">
                    많은 종목을 읽는 대신, 오늘 움직일 후보만 남깁니다. 아침 판단은 더 짧아지고, 실행과 복기는 더 한 흐름으로 이어집니다.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-slate-950 hover:bg-white/92">
                  <Link href="/?auth=login">
                    로그인하고 내 흐름 열기
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="border border-white/14 bg-white/6 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="#workflow">어떤 경험이 달라지는지 보기</Link>
                </Button>
              </div>

              <div className="grid max-w-[1120px] gap-3 md:grid-cols-3">
                {heroOutcomeStrip.map((item, index) => (
                  <ScrollReveal key={item.label} delay={120 + index * 70} className="h-full">
                    <div className="flex h-full min-h-[128px] flex-col rounded-[28px] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                      <p className="public-hero-label text-[11px] font-semibold uppercase tracking-[0.24em]">{item.label}</p>
                      <p className="public-hero-title mt-3 text-[clamp(1.72rem,2.55vw,2.36rem)] font-semibold leading-none tracking-[-0.08em] md:whitespace-nowrap">
                        {item.value}
                      </p>
                      <p className="public-hero-note mt-auto pt-2 text-sm leading-6">{item.note}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <div className="landing-hero-board-enter relative mt-10 hidden lg:mt-0 lg:block lg:w-full lg:self-center">
            <div className="relative public-float ml-auto lg:w-full lg:max-w-[47rem] xl:max-w-[50rem]">
              <div className="absolute -inset-x-6 -inset-y-6 rounded-[42px] bg-[radial-gradient(circle_at_center,hsl(37_80%_68%_/_0.14),transparent_72%)] blur-3xl" />
              <div className="relative rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.17),rgba(255,255,255,0.08))] p-4 backdrop-blur-xl sm:p-5">
                <div className="rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(16,23,37,0.96),rgba(22,29,44,0.99))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-4">
                    <div>
                      <p className="public-panel-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">Morning flow board</p>
                      <p className="public-panel-title mt-2 text-[clamp(2rem,2.7vw,2.85rem)] font-semibold tracking-[-0.08em]">
                        PLAN → CHECK → REVIEW
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-300/16 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
                      action mode
                    </span>
                  </div>

                  <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.045] px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="public-panel-kicker text-[11px] font-semibold uppercase tracking-[0.22em]">
                          Shared setup
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="public-panel-title text-lg font-semibold">ISC</p>
                          <Badge variant="secondary" className={landingStatusToneClasses.positive}>
                            구조 유지
                          </Badge>
                        </div>
                        <p className="public-panel-note text-xs leading-6">
                          진입 87,000 ~ 88,200 · 손절 83,400 · 1차 목표 92,500
                        </p>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-emerald-100">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-4 rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-4 py-4">
                      <div className="flex items-end justify-between gap-2">
                        {heroChartBars.map((bar, index) => (
                          <div key={`${bar.height}-${index}`} className="flex min-w-0 flex-1 items-end justify-center">
                            <div className="relative flex h-[106px] w-full max-w-[22px] items-end justify-center">
                              <span className="absolute inset-x-1/2 top-1 bottom-1 -translate-x-1/2 border-l border-white/20" />
                              <span
                                className={`relative z-10 w-3 rounded-full ${bar.tone}`}
                                style={{ height: `${bar.height}px` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {[
                          ["Entry zone", "87,000 ~ 88,200"],
                          ["Opening check", "09:00 ~ 09:10"],
                          ["Position size", "내 계좌 기준 계산"]
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-[18px] border border-white/8 bg-white/[0.05] px-3 py-3">
                            <p className="public-panel-kicker text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</p>
                            <p className="public-panel-title mt-2 text-sm font-semibold">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.045] px-4 py-4">
                      <p className="public-panel-kicker text-[11px] font-semibold uppercase tracking-[0.22em]">Opening check</p>
                      <div className="mt-3 space-y-2">
                        {heroMorningChecklist.map((item, index) => (
                          <div key={item} className="flex items-start gap-3">
                            <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-300/18 bg-emerald-300/10 text-[10px] font-semibold text-emerald-100">
                              {index + 1}
                            </span>
                            <p className="public-panel-note text-sm leading-6">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-white/[0.045] px-4 py-4">
                      <p className="public-panel-kicker text-[11px] font-semibold uppercase tracking-[0.22em]">Personal rule</p>
                      <div className="mt-3 space-y-3">
                        <div className="rounded-[18px] border border-amber-300/16 bg-amber-300/10 px-3 py-3">
                          <p className="public-panel-title text-sm font-semibold">추격보다 보류 우선</p>
                          <p className="public-panel-note mt-1 text-xs leading-6">최근 회고에서 반복된 규칙이 다음 장초 판단에 바로 반영됩니다.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {heroBoardItems.map((item) => (
                            <Badge key={item.name} variant="secondary" className={landingStatusToneClasses[item.tone]}>
                              {item.status}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="public-panel-copy mt-4 rounded-[24px] border border-amber-300/16 bg-amber-300/8 px-4 py-4 text-sm leading-6">
                    차트로 구조를 보고, 장초에 한 번 더 걸러내고, 끝난 거래는 규칙으로 남깁니다. 이 흐름이 SWING-RADAR의 핵심입니다.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1560px] space-y-28">
        <section id="overview" className="scroll-mt-32 space-y-8 sm:scroll-mt-36">
          <ScrollReveal className="space-y-4">
            <p className="public-section-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">Benefits</p>
            <h2 className="headline-balance public-section-title text-[clamp(2.9rem,6.1vw,5.6rem)] font-semibold leading-[0.94] tracking-[-0.095em]">
              아침 판단이 더 짧고 선명해집니다.
            </h2>
          </ScrollReveal>

          <div className="grid gap-4 xl:grid-cols-3">
            {benefitNarrative.map((item, index) => (
              <ScrollReveal key={item.title} delay={index * 90}>
                <article className="h-full rounded-[34px] border border-border/70 bg-white/76 p-6 shadow-[0_24px_80px_hsl(33_22%_26%_/_0.06)] backdrop-blur-xl sm:p-8">
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 shrink-0 text-[1.35rem] font-semibold tracking-[-0.04em] text-primary sm:text-[1.55rem]">
                      #{index + 1}
                    </span>
                    <div className="space-y-3">
                      <h3 className="public-section-title text-[clamp(1.46rem,2vw,2.18rem)] font-semibold leading-[1.02] tracking-[-0.07em]">
                        {item.title}
                      </h3>
                      <p className="public-section-copy text-base leading-8">{item.body}</p>
                    </div>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section id="workflow" className="scroll-mt-32 space-y-8 sm:scroll-mt-36">
          <ScrollReveal className="space-y-4">
            <p className="public-section-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">Workflow</p>
            <h2 className="headline-balance public-section-title text-[clamp(2.9rem,6.2vw,5.7rem)] font-semibold leading-[0.94] tracking-[-0.095em]">
              계획은 짧게, 실행은 더 차분하게.
            </h2>
          </ScrollReveal>

          <div className="pt-2">
            <ScrollReveal delay={130}>
              <LandingWorkflowDemo />
            </ScrollReveal>
          </div>
        </section>

        <section id="product" className="scroll-mt-32 space-y-8 sm:scroll-mt-36">
          <ScrollReveal className="space-y-4">
            <p className="public-section-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">Product</p>
            <h2 className="headline-balance public-section-title text-[clamp(2.5rem,5.4vw,4.9rem)] font-semibold leading-[0.96] tracking-[-0.09em]">
              매일의 기록이 모여 나만의 거래 기준이 됩니다.
            </h2>
          </ScrollReveal>

          <div className="grid gap-4 lg:grid-cols-12">
            {productSurfaces.map((item, index) => {
              const Icon = item.icon;

              return (
                <ScrollReveal key={item.title} delay={index * 70} className={item.span}>
                  <section className="relative h-full overflow-hidden rounded-[34px] border border-border/70 bg-white/78 p-6 shadow-[0_24px_80px_hsl(33_22%_26%_/_0.06)] backdrop-blur-xl">
                    <div className="relative flex items-start justify-between gap-4">
                      <div className="max-w-[620px] space-y-3">
                        <p className="public-section-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">{item.eyebrow}</p>
                        <h3 className="public-section-title text-[clamp(1.95rem,2.4vw,2.8rem)] font-semibold leading-[0.96] tracking-[-0.07em]">
                          {item.title}
                        </h3>
                        <p className="public-section-copy max-w-xl text-sm leading-7">{item.description}</p>
                      </div>
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <ul className="relative mt-6 space-y-3">
                      {item.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <span className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/55" />
                          <span className="public-section-copy-soft text-sm leading-7">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </ScrollReveal>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {experienceOutcomes.map((item, index) => {
              const Icon = item.icon;

              return (
                <ScrollReveal key={item.title} delay={100 + index * 70}>
                  <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,hsl(35_23%_98%_/_0.92),hsl(33_18%_95%_/_0.98))] px-5 py-5 shadow-[0_18px_56px_hsl(33_22%_24%_/_0.05)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="public-section-title text-base font-semibold">{item.title}</p>
                    </div>
                    <p className="public-section-copy mt-3 text-sm leading-7">{item.note}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>

        <section className="rounded-[42px] border border-white/10 bg-[linear-gradient(135deg,hsl(221_24%_15%),hsl(222_22%_18%)_55%,hsl(37_34%_20%)_100%)] px-6 py-8 text-white shadow-[0_36px_120px_hsl(220_32%_8%_/_0.16)] sm:px-8 sm:py-10">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-center">
            <ScrollReveal className="space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100/80">Why it feels different</p>
              <h2 className="headline-balance text-[clamp(2.7rem,5.4vw,4.9rem)] font-semibold leading-[0.94] tracking-[-0.095em] text-white">
                더 많이 보는 서비스가 아니라, 더 빨리 결정하게 만드는 서비스.
              </h2>
              <p className="max-w-2xl text-[1rem] leading-8 text-white/78">
                아침에 무엇을 먼저 볼지, 장초에 무엇을 걸러낼지, 하루가 끝난 뒤 무엇을 남길지까지 한 흐름으로 이어집니다.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-slate-950 hover:bg-white/92">
                  <Link href="/?auth=signup">
                    지금 내 흐름 시작하기
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="border border-white/14 bg-white/6 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/?auth=login">이미 계정이 있다면 로그인</Link>
                </Button>
              </div>
            </ScrollReveal>

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              {finalDecisionOutcomes.map((item, index) => (
                <ScrollReveal key={item.title} delay={80 + index * 70}>
                  <div className="rounded-[28px] border border-white/12 bg-white/[0.055] px-5 py-5 backdrop-blur-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-100/76">0{index + 1}</p>
                    <h3 className="mt-3 text-[clamp(1.32rem,2vw,1.72rem)] font-semibold tracking-[-0.05em] text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-white/72">{item.body}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="scroll-mt-32 rounded-[42px] border border-border/70 bg-[linear-gradient(180deg,hsl(36_26%_98%_/_0.94),hsl(34_18%_95%_/_0.98))] px-6 py-8 shadow-[0_30px_100px_hsl(33_22%_24%_/_0.07)] sm:scroll-mt-36 sm:px-8 sm:py-10"
        >
          <div className="grid gap-10 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
            <ScrollReveal className="space-y-4">
              <p className="public-section-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">FAQ</p>
              <h2 className="headline-balance public-section-title text-[clamp(2.8rem,5.8vw,5rem)] font-semibold leading-[0.94] tracking-[-0.095em]">
                처음 보는 분들이 가장 많이 묻는 것
              </h2>
              <div className="pt-2">
                <Button asChild size="lg">
                  <Link href="/?auth=signup">
                    내 흐름 시작하기
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>

            <div className="space-y-3">
              {faqs.map((item, index) => (
                <ScrollReveal key={item.question} delay={index * 70}>
                  <article className="rounded-[28px] border border-border/70 bg-white/82 px-5 py-5">
                    <h3 className="public-section-title text-[clamp(1.2rem,1.8vw,1.55rem)] font-semibold leading-[1.08] tracking-[-0.05em]">
                      {item.question}
                    </h3>
                    <p className="public-section-copy mt-3 text-sm leading-7">{item.answer}</p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
