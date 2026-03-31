import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BrandMark } from "@/components/layout/brand-signature";
import { LandingWorkflowDemo } from "@/components/public/landing-workflow-demo";
import { ScrollReveal } from "@/components/public/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const landingStatusToneClasses = {
  positive: "border-emerald-200/28 bg-emerald-200/16 text-emerald-50",
  neutral: "border-amber-200/28 bg-amber-200/16 text-amber-50",
  caution: "border-rose-200/28 bg-rose-200/16 text-rose-50"
} as const;

const benefitStrip = [
  { label: "신규 매수", value: "0~2개", note: "많이 보여주지 않고, 실제로 볼 것만 남깁니다." },
  { label: "아침 판단", value: "5~10분", note: "장초에 짧게 다시 보고 무리한 추격을 막습니다." },
  { label: "운용 기준", value: "개인화", note: "내 자산과 보유 종목 기준으로 행동이 달라집니다." }
] as const;

const benefitNarrative = [
  {
    number: "01",
    title: "볼 종목 수부터 줄여줍니다.",
    body: "좋아 보이는 종목은 많아도, 실제로 살 수 있는 종목은 많지 않습니다. 서비스는 아침에 먼저 볼 후보만 남겨서 결정을 훨씬 가볍게 만듭니다."
  },
  {
    number: "02",
    title: "추격 매수를 덜 하게 만듭니다.",
    body: "전일 강했던 종목도 장초에 다시 걸러냅니다. 이미 많이 튄 종목은 쫓지 않게 하고, 기다릴 종목과 보류할 종목을 바로 나눕니다."
  },
  {
    number: "03",
    title: "내 계좌 기준으로 판단해줍니다.",
    body: "같은 종목도 누구에게나 같은 답이 나오지 않습니다. 자산, 현금, 보유 종목, 섹터 한도까지 반영해서 오늘 가능한 행동만 보여줍니다."
  }
] as const;

const productSurfaces = [
  {
    title: "Dashboard",
    eyebrow: "오늘 바로 볼 것",
    description: "로그인하면 가장 먼저 오늘 매수 검토, 장초 확인 대기, 보유 점검 알림이 한 화면에 뜹니다.",
    bullets: ["오늘 매수 검토 0~2개", "장초 확인 대기 종목", "보유 즉시 점검 알림"],
    span: "lg:col-span-7",
    previewSrc: "/landing/product-previews/dashboard-preview.svg"
  },
  {
    title: "Portfolio",
    eyebrow: "들고 있는 종목 관리",
    description: "새 종목만 고르는 화면이 아닙니다. 익절 검토, 보호 가격 상향, 시간 점검까지 함께 보여줍니다.",
    bullets: ["즉시 점검", "부분 익절 검토", "시간 점검 알림"],
    span: "lg:col-span-5",
    previewSrc: "/landing/product-previews/portfolio-preview.svg"
  },
  {
    title: "Account",
    eyebrow: "내 자산에 맞춤",
    description: "총 자산, 가용 현금, 허용 손실, 현재 보유를 기준으로 오늘 가능한 행동만 계산합니다.",
    bullets: ["자산 규모 입력", "현금과 손실 한도", "내 기준 행동 보드"],
    span: "lg:col-span-4",
    previewSrc: "/landing/product-previews/account-preview.svg"
  },
  {
    title: "Explore",
    eyebrow: "필요할 때만 깊게",
    description: "랭킹과 상세 분석은 따로 열어볼 수 있게 두고, 기본 화면은 최대한 행동 중심으로 유지합니다.",
    bullets: ["상세 분석 열기", "후보 비교 보기", "보류 종목 점검"],
    span: "lg:col-span-8",
    previewSrc: "/landing/product-previews/explore-preview.svg"
  }
] as const;

const faqs = [
  {
    question: "1위면 바로 사면 되나요?",
    answer: "아닙니다. 순위는 시작점일 뿐입니다. 장초 확인을 통과하고 포트폴리오 한도까지 맞아야 오늘 행동 보드에 올라갑니다."
  },
  {
    question: "종목이 많으면 다 사야 하나요?",
    answer: "아닙니다. 이 서비스는 많이 사게 만드는 쪽이 아니라, 덜 사게 만드는 쪽에 가깝습니다. 보통 오늘 검토는 0~2개만 남깁니다."
  },
  {
    question: "왜 로그인이 필요한가요?",
    answer: "진짜 가치가 내 자산과 보유 기준으로 달라지기 때문입니다. 로그인 후에는 내 계좌 기준 행동 보드가 열립니다."
  },
  {
            question: "실시간 급등을 쫓는 서비스인가요?",
    answer: "아닙니다. 전일 데이터로 계획을 세우고, 장초에 짧게 다시 확인한 뒤, 차분하게 실행할 종목만 남기는 방식입니다."
  }
] as const;

const operatingPrinciples = [
  {
    title: "먼저 줄이고",
    note: "전일 데이터로 오늘 먼저 볼 종목만 좁혀둡니다."
  },
  {
    title: "한 번 더 거르고",
    note: "장초에 짧게 다시 보고 무리한 진입은 바로 멈춥니다."
  },
  {
    title: "내 기준으로 실행",
    note: "자산과 보유 기준으로 오늘 가능한 행동만 남깁니다."
  }
] as const;

const heroBoardItems = [
  { name: "ISC", status: "오늘 매수 검토", note: "진입 87,000 ~ 88,200 / 손절 83,400", tone: "positive" as const },
  { name: "DN오토모티브", status: "관찰 유지", note: "시초가 반응이 약하면 더 지켜보기", tone: "neutral" as const },
  { name: "씨에스윈드", status: "추격 금지", note: "이미 과열 구간이면 오늘은 보류", tone: "caution" as const }
] as const;

export function LandingPage() {
  return (
    <main className="space-y-28 pb-16">
      <section className="relative overflow-hidden rounded-[44px] border border-white/10 bg-[linear-gradient(160deg,hsl(218_28%_12%)_0%,hsl(217_20%_16%)_46%,hsl(34_30%_22%)_100%)] px-6 py-7 text-white shadow-[0_50px_140px_hsl(220_32%_8%_/_0.26)] sm:px-8 sm:py-9 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,hsl(39_80%_72%_/_0.18),transparent_24%),radial-gradient(circle_at_84%_18%,hsl(196_94%_72%_/_0.14),transparent_20%),radial-gradient(circle_at_68%_82%,hsl(34_88%_62%_/_0.16),transparent_18%)]" />
        <div className="public-pan pointer-events-none absolute right-[-4rem] top-10 h-60 w-60 rounded-full bg-[radial-gradient(circle,hsl(39_78%_72%_/_0.16),transparent_72%)] blur-3xl" />
        <div className="public-float-delayed pointer-events-none absolute left-16 top-20 h-28 w-28 rounded-full bg-[radial-gradient(circle,hsl(197_88%_74%_/_0.12),transparent_72%)] blur-3xl" />

        <div className="relative lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(29rem,34rem)] lg:items-start lg:gap-10">
          <ScrollReveal>
            <div className="max-w-[860px] space-y-8">
              <div className="space-y-5">
                <Badge className="public-hero-badge hover:bg-white/8" variant="secondary">
                  Action-first swing operating system
                </Badge>
                <div className="space-y-6">
                  <h1 className="headline-balance public-hero-title max-w-[7.6ch] text-[clamp(4.4rem,11vw,9.4rem)] font-semibold leading-[0.86] tracking-[-0.11em]">
                    오늘 할 행동만 남깁니다.
                  </h1>
                  <p className="public-hero-copy max-w-[760px] text-[clamp(1.05rem,1.6vw,1.28rem)] leading-8">
                    많이 보여주는 대신, 실제로 검토할 종목만 줄여줍니다. 장전 후보를 만들고 장초에 한 번 더 걸러서 내 계좌 기준으로
                    오늘 볼 행동 0~2개만 남깁니다.
                  </p>
                </div>
              </div>

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
                  <Link href="#workflow">어떻게 줄여주는지 보기</Link>
                </Button>
              </div>

              <div className="grid max-w-[780px] gap-3 md:grid-cols-3">
                {benefitStrip.map((item, index) => (
                  <ScrollReveal key={item.label} delay={120 + index * 70}>
                    <div className="rounded-[28px] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                      <p className="public-hero-label text-[11px] font-semibold uppercase tracking-[0.24em]">{item.label}</p>
                      <p className="public-hero-title mt-3 text-[clamp(2rem,3vw,2.8rem)] font-semibold leading-none tracking-[-0.08em]">
                        {item.value}
                      </p>
                      <p className="public-hero-note mt-2 text-sm leading-6">{item.note}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <div className="landing-hero-board-enter relative mt-10 lg:mt-2 lg:justify-self-end lg:self-start">
            <div className="relative public-float lg:w-[31rem] xl:w-[34rem]">
                <div className="absolute -inset-x-6 -inset-y-6 rounded-[42px] bg-[radial-gradient(circle_at_center,hsl(37_80%_68%_/_0.14),transparent_72%)] blur-3xl" />
                <div className="relative rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.17),rgba(255,255,255,0.08))] p-4 backdrop-blur-xl sm:p-5">
                  <div className="rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(16,23,37,0.96),rgba(22,29,44,0.99))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-4">
                      <div>
                        <p className="public-panel-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">Today board</p>
                        <p className="public-panel-title mt-2 text-[clamp(2.2rem,3vw,3.15rem)] font-semibold tracking-[-0.08em]">
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
                          <p className="public-panel-kicker text-xs font-medium">{label}</p>
                          <p className="public-panel-title mt-2 text-[clamp(1.8rem,2.4vw,2.5rem)] font-semibold tracking-[-0.07em]">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-3">
                      {heroBoardItems.map((item, index) => (
                        <div
                          key={item.name}
                          className="rounded-[24px] border border-white/8 bg-white/[0.045] px-4 py-4 transition duration-300 hover:bg-white/[0.075]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-xs font-semibold text-white/72">
                                0{index + 1}
                              </span>
                              <div>
                                <p className="public-panel-title text-sm font-semibold">{item.name}</p>
                                <p className="public-panel-note mt-1 text-xs">{item.note}</p>
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className={landingStatusToneClasses[item.tone]}
                            >
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="public-panel-copy mt-4 rounded-[24px] border border-amber-300/16 bg-amber-300/8 px-4 py-4 text-sm leading-6">
                      많이 보여주는 대신, 지금 볼 것만 남깁니다. 그래서 아침 판단이 더 빠르고 덜 흔들립니다.
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      <section id="overview" className="scroll-mt-32 space-y-8 sm:scroll-mt-36">
        <ScrollReveal className="space-y-4">
          <p className="public-section-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">Benefits</p>
          <h2 className="headline-balance public-section-title text-[clamp(2.9rem,6.1vw,5.6rem)] font-semibold leading-[0.94] tracking-[-0.095em]">
            명확한 기준으로 종목 선택의 고민을 줄여줍니다.
          </h2>
        </ScrollReveal>

        <div className="grid gap-4 xl:grid-cols-3">
          {benefitNarrative.map((item, index) => (
            <ScrollReveal key={item.title} delay={index * 90}>
              <article className="h-full rounded-[34px] border border-border/70 bg-white/76 p-6 shadow-[0_24px_80px_hsl(33_22%_26%_/_0.06)] backdrop-blur-xl sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/8 text-sm font-semibold text-primary">
                    {item.number}
                  </span>
                  <div className="space-y-3">
                    <h3 className="public-section-title text-[clamp(1.65rem,2.2vw,2.45rem)] font-semibold leading-[1] tracking-[-0.07em]">
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
            아침 10분이면 오늘 할 일이 정리됩니다.
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
          <h2 className="headline-balance public-section-title text-[clamp(2.9rem,6.1vw,5.6rem)] font-semibold leading-[0.94] tracking-[-0.095em]">
            스윙에 필요한 세부 기능을 모두 제공합니다.
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={70}>
          <p className="public-section-copy max-w-[900px] text-[clamp(0.98rem,1.28vw,1.08rem)] leading-8">
            투자 유의: 본 서비스는 투자 판단을 보조하는 참고 도구이며, 최종 투자 결정과 그에 따른 책임은 사용자에게 있습니다.
          </p>
        </ScrollReveal>

        <div className="grid gap-4 lg:grid-cols-12">
          {productSurfaces.map((item, index) => {
            return (
              <ScrollReveal key={item.title} delay={index * 70} className={item.span}>
                <section className="relative h-full overflow-hidden rounded-[34px] border border-border/70 bg-white/78 p-6 shadow-[0_24px_80px_hsl(33_22%_26%_/_0.06)] backdrop-blur-xl">
                  <div className="pointer-events-none absolute inset-y-5 right-5 hidden w-[42%] overflow-hidden rounded-[28px] border border-white/70 bg-white/72 shadow-[0_20px_60px_hsl(33_22%_26%_/_0.08)] md:block">
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.18))]" />
                    <Image
                      src={item.previewSrc}
                      alt=""
                      fill
                      className="object-cover object-top"
                      sizes="(min-width: 1024px) 32vw, 0px"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,243,0.94)_0%,rgba(255,250,243,0.7)_22%,rgba(255,250,243,0.18)_54%,rgba(255,250,243,0.08)_100%)]" />
                  </div>

                  <div className="relative flex items-start justify-between gap-4">
                    <div className="max-w-[520px] space-y-3 md:max-w-[54%]">
                      <p className="public-section-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">{item.eyebrow}</p>
                      <h3 className="public-section-title text-[clamp(1.95rem,2.4vw,2.8rem)] font-semibold leading-[0.96] tracking-[-0.07em]">
                        {item.title}
                      </h3>
                      <p className="public-section-copy max-w-xl text-sm leading-7">{item.description}</p>
                    </div>
                    <BrandMark compact className="h-12 w-12 shrink-0 rounded-2xl" />
                  </div>

                  <ul className="relative mt-6 space-y-3 md:max-w-[52%]">
                    {item.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/55" />
                        <span className="public-section-copy-soft text-sm leading-7">{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="relative mt-6 overflow-hidden rounded-[24px] border border-border/70 bg-white/76 md:hidden">
                    <div className="relative h-44">
                      <Image
                        src={item.previewSrc}
                        alt=""
                        fill
                        className="object-cover object-top"
                        sizes="100vw"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,250,243,0.06)_0%,rgba(255,250,243,0.22)_100%)]" />
                    </div>
                  </div>
                </section>
              </ScrollReveal>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {operatingPrinciples.map((item, index) => {
            return (
              <ScrollReveal key={item.title} delay={100 + index * 70}>
                <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,hsl(35_23%_98%_/_0.92),hsl(33_18%_95%_/_0.98))] px-5 py-5 shadow-[0_18px_56px_hsl(33_22%_24%_/_0.05)]">
                  <div className="flex items-center gap-3">
                    <BrandMark compact className="h-10 w-10 rounded-2xl shadow-none" />
                    <p className="public-section-title text-base font-semibold">{item.title}</p>
                  </div>
                  <p className="public-section-copy mt-3 text-sm leading-7">{item.note}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      <section id="faq" className="scroll-mt-32 rounded-[42px] border border-border/70 bg-[linear-gradient(180deg,hsl(35_23%_98%_/_0.92),hsl(33_18%_95%_/_0.98))] px-6 py-8 shadow-[0_30px_100px_hsl(33_22%_24%_/_0.07)] sm:scroll-mt-36 sm:px-8 sm:py-10">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
          <ScrollReveal className="space-y-4">
            <p className="public-section-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">FAQ</p>
            <h2 className="headline-balance public-section-title text-[clamp(2.8rem,5.8vw,5rem)] font-semibold leading-[0.94] tracking-[-0.095em]">
              SWING-RADAR에 대한 모든 것
            </h2>
            <div className="pt-2">
              <Button asChild size="lg">
                <Link href="/auth">
                  내 기준으로 시작하기
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
    </main>
  );
}
