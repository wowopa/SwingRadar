import { HeartHandshake, Server, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SupportDonationCheckout } from "@/components/support/support-donation-checkout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupportConfig } from "@/lib/server/support-config";

export const dynamic = "force-dynamic";

const supportReasons = [
  {
    title: "서버와 배치 운영",
    description: "매일 아침 데이터 갱신과 후보 재정리, 공용 추적 운영에 들어가는 기본 비용을 꾸준히 감당합니다.",
    icon: Server
  },
  {
    title: "기능 개선",
    description: "분석 화면, 랭킹 흐름, 추적 로직처럼 실제로 체감되는 개선 작업을 계속 이어갈 수 있게 돕습니다.",
    icon: Wrench
  },
  {
    title: "가벼운 1회성 후원",
    description: "구독 없이 한 번만 후원하고 끝나는 구조라 부담 없이 응원해 주실 수 있습니다.",
    icon: HeartHandshake
  }
] as const;

export default function SupportPage() {
  const supportConfig = getSupportConfig();

  return (
    <main className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Support"
        title="SWING-RADAR 운영 후원"
        description="서비스가 도움이 되셨다면 1회성 운영 후원을 보낼 수 있습니다. 후원은 선택이며, 기존 기능은 그대로 이용하실 수 있습니다."
      />

      <section className="grid gap-4 md:grid-cols-3">
        {supportReasons.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="border-border/70 bg-white/82 shadow-sm">
              <CardHeader className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg text-foreground">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-foreground/80">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <SupportDonationCheckout
        enabled={supportConfig.enabled}
        bankName={supportConfig.bankName}
        accountNumber={supportConfig.accountNumber}
        accountHolder={supportConfig.accountHolder}
        supportTitle={supportConfig.supportTitle}
        tiers={supportConfig.tiers}
      />
    </main>
  );
}
