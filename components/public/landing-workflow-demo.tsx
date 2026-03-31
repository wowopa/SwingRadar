"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stages = [
  {
    id: "preopen",
    label: "장전 후보",
    eyebrow: "08:00",
    title: "전일 데이터를 기준으로 오늘 볼 종목만 먼저 좁힙니다.",
    description:
      "실시간 추격이 아니라, 전일 종가 기준으로 오늘 장초에 확인할 후보를 미리 정리합니다. 이 단계는 계획이지 매수 지시가 아닙니다.",
    bullets: ["신규 매수 검토 후보 0~3개", "관찰 후보 5~10개", "급등 추격형 후보 자동 감점"],
    boardTitle: "오늘 먼저 볼 후보",
    boardItems: [
      { name: "ISC", status: "매수 검토 후보", tone: "positive" as const },
      { name: "DN오토모티브", status: "관찰 우선", tone: "neutral" as const },
      { name: "씨에스윈드", status: "추격 금지 후보", tone: "caution" as const }
    ]
  },
  {
    id: "opening",
    label: "장초 확인",
    eyebrow: "09:00-09:10",
    title: "시초가와 초반 5~10분 흐름으로 실제 행동 가능 여부를 확인합니다.",
    description:
      "갭상승이 과하면 추격 금지로 내리고, 손절 기준과 멀지 않으면 제외합니다. 통과한 종목만 오늘 행동 보드로 올라갑니다.",
    bullets: ["통과", "관찰 유지", "추격 금지", "제외"],
    boardTitle: "장초 확인 결과",
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
    title: "통과한 종목만 0~2개 수준으로 남겨 실제 행동으로 연결합니다.",
    description:
      "보유 종목 수, 같은 섹터 수, 가용 현금과 리스크 한도까지 함께 보고 오늘 살 수 있는 종목만 최종 행동 보드에 남깁니다.",
    bullets: ["권장 비중과 수량 계산", "보유 종목 관리 알림", "손절과 1차 목표 함께 제시"],
    boardTitle: "오늘 실제 행동 보드",
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
    <Card className="overflow-hidden border-border/70 bg-white/82 shadow-panel">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {stages.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveStage(item.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                item.id === activeStage
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/70 bg-secondary/30 text-foreground/72 hover:border-primary/20 hover:bg-white"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <div>
              <p className="eyebrow-label">{stage.eyebrow}</p>
              <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.04em] text-foreground">{stage.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{stage.description}</p>
            </div>
            <div className="space-y-2">
              {stage.bullets.map((bullet) => (
                <div key={bullet} className="rounded-2xl border border-border/70 bg-secondary/25 px-4 py-3 text-sm text-foreground/82">
                  {bullet}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-border/70 bg-secondary/20 p-4">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{stage.boardTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">실제 서비스는 이 흐름을 기준으로 화면을 정리합니다.</p>
              </div>
              <Badge variant="secondary">{stage.label}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {stage.boardItems.map((item) => (
                <div key={item.name} className="rounded-2xl border border-border/70 bg-white/90 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <Badge variant={item.tone}>{item.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm leading-6 text-foreground/82">
              종목을 많이 보여주는 것보다, 지금 무엇을 해야 하는지 먼저 답하는 화면이 되도록 설계했습니다.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

