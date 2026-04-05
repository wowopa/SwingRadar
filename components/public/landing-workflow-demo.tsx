"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const landingStatusToneClasses = {
  positive: "border-emerald-300/45 bg-emerald-300/28 text-emerald-50",
  neutral: "border-amber-300/45 bg-amber-300/30 text-amber-50",
  caution: "border-rose-300/45 bg-rose-300/28 text-rose-50",
  secondary: "border-white/14 bg-white/8 text-white/86"
} as const;

const stages = [
  {
    id: "preopen",
    label: "장전 후보",
    eyebrow: "08:00",
    title: "먼저 볼 종목만 남깁니다.",
    description:
      "시장을 열기 전에 시선을 먼저 줄입니다. 많은 종목을 늘어놓는 대신, 오늘 아침 다시 볼 이유가 있는 후보만 정리합니다.",
    bullets: ["매수 검토 후보 0~3개", "관찰 후보 5~10개", "쫓지 않을 종목 미리 분리"],
    panelTitle: "오늘 먼저 볼 후보",
    panelNote: "전일 기준 장전 정리",
    boardItems: [
      { name: "ISC", status: "매수 검토", tone: "positive" as const },
      { name: "DN오토모티브", status: "관찰 우선", tone: "neutral" as const },
      { name: "씨에스윈드", status: "보류", tone: "caution" as const }
    ]
  },
  {
    id: "opening",
    label: "장초 확인",
    eyebrow: "09:00-09:10",
    title: "시초가에서 한 번 더 걸러냅니다.",
    description:
      "시초가와 초반 반응만 짧게 확인합니다. 그래서 무리한 추격보다 통과, 관찰, 보류를 더 빠르게 나눌 수 있습니다.",
    bullets: ["통과", "관찰 유지", "추격 금지", "제외"],
    panelTitle: "장초 확인 결과",
    panelNote: "초반 반응 짧게 재확인",
    boardItems: [
      { name: "ISC", status: "통과", tone: "positive" as const },
      { name: "DN오토모티브", status: "관찰 유지", tone: "neutral" as const },
      { name: "씨에스윈드", status: "추격 금지", tone: "caution" as const }
    ]
  },
  {
    id: "action",
    label: "오늘 행동",
    eyebrow: "09:10 이후",
    title: "실제로 움직일 후보만 남깁니다.",
    description:
      "통과한 종목을 모두 사는 화면이 아닙니다. 내 현금, 보유 종목, 한도까지 함께 보고 오늘 실제로 움직일 후보만 남깁니다.",
    bullets: ["오늘 매수 검토 0~2개", "보유 우선 관리", "손절과 목표가 함께 확인"],
    panelTitle: "오늘 실제 행동 보드",
    panelNote: "내 계좌 기준 최종 정리",
    boardItems: [
      { name: "ISC", status: "오늘 매수 검토", tone: "positive" as const },
      { name: "로보티즈", status: "관찰 유지", tone: "neutral" as const },
      { name: "같은 섹터 중복", status: "오늘은 보류", tone: "secondary" as const }
    ]
  }
] as const;

export function LandingWorkflowDemo() {
  const [activeStage, setActiveStage] = useState<(typeof stages)[number]["id"]>("preopen");
  const stage = stages.find((item) => item.id === activeStage) ?? stages[0];

  return (
    <section className="overflow-hidden rounded-[40px] border border-border/70 bg-card/94 p-4 shadow-[0_30px_100px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          {stages.map((item, index) => {
            const isActive = item.id === activeStage;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveStage(item.id)}
                className={cn(
                  "w-full rounded-[30px] border px-5 py-5 text-left transition-all duration-300",
                  isActive
                    ? "border-primary/20 bg-primary/[0.08] shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                    : "border-border/70 bg-card/92 hover:border-primary/20 hover:bg-card/98"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="public-section-kicker text-[11px] font-semibold uppercase tracking-[0.22em]">
                      0{index + 1} · {item.eyebrow}
                    </p>
                    <p className="public-section-title mt-3 text-[clamp(1.35rem,2vw,1.8rem)] font-semibold leading-[1] tracking-[-0.05em]">
                      {item.label}
                    </p>
                    <p className="public-section-copy mt-3 text-sm leading-6">{item.title}</p>
                  </div>
                  <span
                    className={cn(
                      "mt-1 h-3 w-3 rounded-full transition-all",
                      isActive ? "bg-primary shadow-[0_0_0_8px_hsl(var(--primary)_/_0.12)]" : "bg-border"
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div
          key={stage.id}
          className="landing-stage-enter rounded-[32px] border border-border/70 bg-[linear-gradient(180deg,hsl(220_22%_14%),hsl(220_20%_18%)_46%,hsl(32_32%_20%)_100%)] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="public-panel-kicker text-[11px] font-semibold uppercase tracking-[0.24em]">{stage.panelNote}</p>
              <h3 className="public-panel-title mt-3 text-[clamp(2.25rem,4vw,3.5rem)] font-semibold leading-[0.95] tracking-[-0.08em]">
                {stage.panelTitle}
              </h3>
              <p className="public-panel-copy mt-4 max-w-2xl text-[1.02rem] leading-8">{stage.description}</p>
            </div>
            <Badge className="border-white/10 bg-white/6 text-white" variant="secondary">
              {stage.label}
            </Badge>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {stage.bullets.map((bullet, index) => (
              <div
                key={bullet}
                className="public-panel-copy rounded-[24px] border border-white/10 bg-white/[0.055] px-4 py-4 text-sm"
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                {bullet}
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {stage.boardItems.map((item, index) => (
              <div key={item.name} className="rounded-[24px] border border-white/10 bg-white/[0.055] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-xs font-semibold text-white/70">
                      0{index + 1}
                    </span>
                    <p className="public-panel-title text-sm font-semibold">{item.name}</p>
                  </div>
                  <Badge variant="secondary" className={landingStatusToneClasses[item.tone]}>
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="public-panel-copy mt-5 rounded-[24px] border border-amber-300/14 bg-amber-300/8 px-4 py-4 text-sm leading-7">
            많이 읽게 만드는 서비스가 아니라, 더 빨리 결정하게 만드는 서비스입니다.
          </div>
        </div>
      </div>
    </section>
  );
}
