import { HeartHandshake, Server, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SupportDonationCheckout } from "@/components/support/support-donation-checkout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupportConfig } from "@/lib/server/support-donations";

export const dynamic = "force-dynamic";

const supportReasons = [
  {
    title: "서버와 배치 운영",
    description: "매일 아침 종목 데이터 갱신, 후보 정리, 공용 추적 운영에 들어가는 기본 비용입니다.",
    icon: Server
  },
  {
    title: "데이터 품질 개선",
    description: "기술 지표, 검증 기준, 공용 추적 로직처럼 실제 서비스 품질을 꾸준히 다듬는 작업에 사용됩니다.",
    icon: Wrench
  },
  {
    title: "서비스 지속성",
    description: "지금처럼 기능 차등 없이 열어두되, 오래 유지할 수 있게 돕는 운영 후원입니다.",
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
        description="이 서비스가 도움이 되셨다면 1회성 후원으로 운영을 도와주실 수 있습니다. 후원은 선택이며, 기존 기능은 그대로 열려 있습니다."
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
        clientKey={supportConfig.clientKey}
        paymentMethodVariantKey={supportConfig.paymentMethodVariantKey}
        agreementVariantKey={supportConfig.agreementVariantKey}
        presetAmounts={supportConfig.presetAmounts}
        minimumAmount={supportConfig.minimumAmount}
        maximumAmount={supportConfig.maximumAmount}
        orderName={supportConfig.orderName}
        isTestMode={supportConfig.isTestMode}
      />
    </main>
  );
}
