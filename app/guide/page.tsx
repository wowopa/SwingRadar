import Link from "next/link";
import {
  Activity,
  BookOpenText,
  CheckCircle2,
  Compass,
  HandHeart,
  Medal,
  Radar,
  Search,
  ShieldAlert,
  Sparkles
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const serviceFlow = [
  {
    title: "1. 관찰 신호 보드에서 오늘 후보 확인",
    description:
      "매일 정리된 관찰 후보를 먼저 보고, 지금 시장에서 어떤 종목을 우선 확인하면 좋을지 빠르게 훑습니다.",
    href: "/recommendations",
    label: "관찰 신호 보드 보기",
    icon: Sparkles
  },
  {
    title: "2. 개별 분석에서 가격 구조 읽기",
    description:
      "차트, 핵심 가격대, 보조지표, 검증 메모를 같이 보며 진입 기준과 위험 가격을 확인합니다.",
    href: "/recommendations",
    label: "관찰 종목에서 종목 선택하기",
    icon: Compass
  },
  {
    title: "3. 추천 랭킹과 공용 추적으로 좁혀 보기",
    description:
      "오늘 상위 후보와 반복적으로 올라오는 종목, 공용 추적에 들어간 종목을 보며 우선순위를 더 줄입니다.",
    href: "/ranking",
    label: "추천 랭킹 보기",
    icon: Medal
  }
] as const;

const dailyUpdateNotes = [
  "오전 8시에 종목 데이터를 갱신합니다.",
  "오전 8시 30분에 갱신된 데이터를 바탕으로 후보와 분석 내용을 다시 정리합니다.",
  "이 서비스는 실시간 시세 서비스가 아니라, 영업일 기준으로 구조를 다시 정리해 보여주는 데일리 서비스입니다."
] as const;

const analysisSignals = [
  {
    title: "추세 구조",
    description: "중기 이동평균선 위에서 가격이 버티는지, 방향성이 유지되는지를 먼저 봅니다."
  },
  {
    title: "거래대금",
    description: "거래량보다 실제 거래대금이 충분한지, 감시하기에 유동성이 받쳐주는지 확인합니다."
  },
  {
    title: "무효화 가격",
    description: "아이디어가 틀렸다고 볼 기준 가격입니다. 위험 관리의 중심이 되는 값입니다."
  },
  {
    title: "보조지표",
    description: "RSI, MACD, ADX, MFI 같은 지표는 추세와 힘을 보조적으로 읽는 참고 자료입니다."
  },
  {
    title: "검증 메모",
    description: "과거 유사 흐름이 어떤 성과를 냈는지, 표본이 충분한지 함께 읽어야 합니다."
  },
  {
    title: "검증 신뢰도",
    description: "실측 기반인지, 유사 흐름 참고인지, 아직 보수 계산 단계인지를 구분해 해석 강도를 조절합니다."
  },
  {
    title: "공용 추적 진단",
    description: "활성화 점수와 거래대금, 확인 가격, 반복 등장 조건이 공용 추적 기준을 넘는지 바로 보여줍니다."
  },
  {
    title: "시나리오",
    description: "지금 구간에서 가능한 흐름을 보수, 기준, 확장 시나리오로 나눠서 살펴봅니다."
  }
] as const;

const scoreSystemNotes = [
  {
    title: "기본 신호",
    description:
      "개별 종목의 추세, 수급, 변동성, 품질, 보조지표를 바탕으로 계산한 기본 분석 점수입니다. 개별 종목 분석에서 가장 먼저 읽는 중심 점수입니다."
  },
  {
    title: "랭킹 점수",
    description:
      "기본 신호에 검증 품질, 유동성, 거래량 상태, 가격 구조를 더해 오늘의 후보를 다시 정렬한 점수입니다. 추천 랭킹과 오늘의 후보에서 우선순위를 볼 때 사용합니다."
  },
  {
    title: "활성화 점수",
    description:
      "공용 추적에 올릴지 판단하는 별도 점수입니다. 최근 상위 후보 반복 등장, 거래대금, 기술 구조, 가격 위치까지 함께 반영해 자동 감시 시작이나 진입 추적 조건을 넘는지 확인합니다."
  }
] as const;

const cautions = [
  "점수가 높아도 무효화 가격이 너무 가깝거나 거래대금이 약하면 보수적으로 보는 편이 좋습니다.",
  "후보 수가 많다고 다 좋은 종목은 아닙니다. 가격 구조와 거래대금이 같이 받쳐주는지가 더 중요합니다.",
  "뉴스는 서비스 안에서 큐레이션하지 않습니다. 필요할 때만 종목별 뉴스 검색 버튼으로 직접 확인하는 구조입니다.",
  "공용 추적은 개인 기록장이 아니라 서비스가 공통 기준으로 지켜보는 공용 추적 목록입니다."
] as const;

const pageRoles = [
  {
    title: "관찰 신호 보드",
    icon: Radar,
    description: "지금 차분히 볼 만한 종목을 빠르게 훑는 시작 화면입니다."
  },
  {
    title: "추천 랭킹",
    icon: Medal,
    description: "오늘 상위 후보와 자주 올라온 종목을 우선순위 중심으로 보는 화면입니다."
  },
  {
    title: "공용 추적",
    icon: Activity,
    description: "서비스 기준으로 계속 지켜볼 만하다고 본 종목의 진행 경과를 모아둔 화면입니다."
  },
  {
    title: "개별 분석",
    icon: Search,
    description: "차트와 가격 기준, 판단 메모를 바탕으로 실제 매매 판단을 돕는 화면입니다."
  },
  {
    title: "운영 후원",
    icon: HandHeart,
    description: "서비스가 도움이 되셨다면 토스로 1회성 운영 후원을 보낼 수 있는 화면입니다."
  }
] as const;

export default function GuidePage() {
  return (
    <main className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Guide"
        title="서비스 이용 가이드"
        description="지금 서비스가 어떤 순서로 데이터를 정리하고, 각 화면이 무엇을 의미하는지 현재 기준에 맞춰 다시 정리했습니다."
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
              <BookOpenText className="h-5 w-5 text-primary" />
              데일리 갱신 흐름
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dailyUpdateNotes.map((item) => (
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
              <Compass className="h-5 w-5 text-primary" />
              각 화면의 역할
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
              분석에서 먼저 보는 항목
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {analysisSignals.map((item) => (
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
              이렇게 읽으면 더 좋습니다
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

      <section>
        <Card className="border-border/70 bg-white/82 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-foreground">
              <Medal className="h-5 w-5 text-primary" />
              점수 체계 읽는 법
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {scoreSystemNotes.map((item) => (
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
