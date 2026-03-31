"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stages = [
  {
    id: "preopen",
    label: "장전 후보",
    eyebrow: "08:00",
    title: "전일 데이터로 오늘 먼저 볼 종목만 좁힙니다.",
    description:
      "실시간 급등을 따라붙지 않고, 전일 종가 기준으로 장초에 확인할 후보만 정리합니다. 이 단계는 계획이지 매수 지시가 아닙니다.",
    bullets: ["매수 검토 0~3개", "관찰 후보 5~10개", "급등 추격형 후보 감점"],
    panelTitle: "오늘 먼저 볼 후보",
    panelNote: "전일 종가 기준 장전 계획",
    boardItems: [
      { name: "ISC", status: "매수 검토 후보", tone: "positive" as const },
      { name: "DN오토모티브", status: "관찰 우선", tone: "neutral" as const },
      { name: "씨에스윈드", status: "보류", tone: "caution" as const }
    ]
  },
  {
    id: "opening",
    label: "장초 확인",
    eyebrow: "09:00-09:10",
    title: "시초가와 초반 흐름으로 실제 행동 가능 여부를 다시 봅니다.",
    description:
      "갭상승이 과하면 추격 금지로 내리고, 손절 여유가 얕으면 제외합니다. 통과한 종목만 오늘 행동 보드로 올립니다.",
    bullets: ["통과", "관찰 유지", "추격 금지", "제외"],
    panelTitle: "장초 확인 결과",
    panelNote: "시초가와 구조를 짧게 다시 점검",
    boardItems: [
      { name: "ISC", status: "통과", tone: "positive" as const },
      { name: "DN오토모티브", status: "관찰 유지", tone: "neutral" as const },
      { name: "씨에스윈드", status: "추격 금지", tone: "caution" as const }
    ]
  },
  {
    id: "action",
    label: "당일 행동",
    eyebrow: "09:10 이후",
    title: "통과한 종목만 0~2개로 남겨 실제 행동으로 연결합니다.",
    description:
      "포트폴리오 슬롯, 같은 섹터 수, 가용 현금, 손실 한도까지 함께 보고 오늘 정말 살 수 있는 종목만 남깁니다.",
    bullets: ["권장 비중과 수량 계산", "보유 관리 알림", "손절과 목표가 함께 제시"],
    panelTitle: "오늘 실제 행동 보드",
    panelNote: "행동으로 좁혀진 최종 보드",
    boardItems: [
      { name: "ISC", status: "오늘 매수 검토", tone: "positive" as const },
      { name: "로킷헬스케어", status: "관찰 유지", tone: "neutral" as const },
      { name: "같은 섹터 과밀", status: "오늘은 보류", tone: "secondary" as const }
    ]
  }
] as const;

export function LandingWorkflowDemo() {
  const [activeStage, setActiveStage] = useState<(typeof stages)[number]["id"]>("preopen");
  const stage = stages.find((item) => item.id === activeStage) ?? stages[0];

  return (
    <section className="overflow-hidden rounded-[40px] border border-border/70 bg-[linear-gradient(180deg,hsl(35_23%_98%_/_0.95),hsl(33_18%_94%_/_0.98))] p-4 shadow-[0_30px_100px_hsl(33_22%_24%_/_0.07)] sm:p-5">
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
                    ? "border-primary/20 bg-primary/[0.08] shadow-[0_16px_40px_hsl(33_22%_24%_/_0.08)]"
                    : "border-border/70 bg-white/76 hover:border-primary/20 hover:bg-white"
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
                  <Badge variant={item.tone}>{item.status}</Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="public-panel-copy mt-5 rounded-[24px] border border-amber-300/14 bg-amber-300/8 px-4 py-4 text-sm leading-7">
            종목을 많이 보여주는 것보다, 지금 무엇을 해야 하는지 먼저 답하는 화면이 되도록 설계했습니다.
          </div>
        </div>
      </div>
    </section>
  );
}
