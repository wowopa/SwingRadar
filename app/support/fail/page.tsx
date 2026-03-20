import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const knownMessages: Record<string, string> = {
  PAY_PROCESS_CANCELED: "결제 과정이 중간에 취소되었습니다. 필요하시면 다시 한 번 시도해주세요.",
  PAY_PROCESS_ABORTED: "결제 진행 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
};

export default async function SupportFailPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = firstValue(params.code) ?? "PAYMENT_FAILED";
  const message = firstValue(params.message) ?? knownMessages[code] ?? "후원 결제를 완료하지 못했습니다.";

  return (
    <main className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Support"
        title="후원 결제가 완료되지 않았습니다"
        description="결제 과정이 취소되었거나 오류가 발생했습니다. 필요한 경우 다시 시도하실 수 있습니다."
      />

      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-foreground">
            <AlertTriangle className="h-5 w-5 text-primary" />
            결제 결과
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-5 text-sm leading-6 text-foreground/80">
            <p className="font-semibold text-foreground">{code}</p>
            <p className="mt-2">{message}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/support">후원 페이지로 돌아가기</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/recommendations">관찰 종목으로 이동</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
