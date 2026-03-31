import { LockKeyhole, Radar, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/auth/auth-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUserSession } from "@/lib/server/user-auth";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const session = await getCurrentUserSession();
  const nextHref =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/recommendations";

  if (session) {
    redirect("/recommendations");
  }

  return (
    <main className="space-y-8 pb-10">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] xl:items-start">
        <div className="space-y-5">
          <Badge variant="positive">Private Dashboard</Badge>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.05em] text-white/95 drop-shadow-[0_12px_24px_rgba(15,23,42,0.18)] sm:text-[3.35rem]">
              로그인 후에만 개인 포트폴리오 기준의 행동 보드가 열립니다.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-white/72">
              SWING-RADAR는 공개 리포트를 보여주는 서비스가 아니라, 내 자산과 내 보유를 기준으로 오늘 무엇을 할지 정리하는 운용
              도구입니다. 로그인 후에는 장전 후보, 장초 확인, 보유 관리까지 모두 내 기준으로 계산됩니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: LockKeyhole,
                title: "개인 운용 기준",
                description: "총 자산, 가용 현금, 리스크 한도를 내 계정 기준으로 저장합니다."
              },
              {
                icon: Radar,
                title: "오늘 행동 보드",
                description: "장전 후보와 장초 확인 결과를 묶어 오늘 매수 검토 대상을 좁힙니다."
              },
              {
                icon: ShieldCheck,
                title: "보유 관리",
                description: "손절, 부분 익절, 시간 손절 검토를 현재 보유 종목 기준으로 보여줍니다."
              }
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.title} className="border-white/30 bg-white/90 shadow-[0_18px_42px_rgba(15,23,42,0.12)] backdrop-blur-md">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="xl:pl-4">
          <AuthPanel nextHref={nextHref} />
        </div>
      </section>
    </main>
  );
}

