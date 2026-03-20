import Link from "next/link";
import { CheckCircle2, ReceiptText } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/server/api-error";
import { confirmSupportDonation } from "@/lib/server/support-donations";
import { formatDateTimeShort, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SupportSuccessPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const paymentKey = firstValue(params.paymentKey);
  const orderId = firstValue(params.orderId);
  const amount = firstValue(params.amount);

  let result:
    | Awaited<ReturnType<typeof confirmSupportDonation>>
    | {
        error: string;
      };

  try {
    if (!paymentKey || !orderId || !amount) {
      throw new ApiError(400, "SUPPORT_CONFIRM_INVALID", "결제 확인에 필요한 정보가 부족합니다.");
    }

    result = await confirmSupportDonation({
      paymentKey,
      orderId,
      amount
    });
  } catch (error) {
    result = {
      error: error instanceof Error ? error.message : "후원 결제 확인에 실패했습니다."
    };
  }

  return (
    <main className="space-y-8 pb-10">
      <PageHeader
        eyebrow="Support"
        title={("error" in result) ? "후원 확인이 필요합니다" : "후원이 정상적으로 완료되었습니다"}
        description={
          "error" in result
            ? "결제 인증은 끝났지만 승인 확인 단계에서 문제가 있어 다시 확인이 필요합니다."
            : "SWING-RADAR 운영 후원을 보내주셔서 감사합니다. 운영과 개선 작업에 소중히 사용하겠습니다."
        }
      />

      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-foreground">
            {"error" in result ? (
              <ReceiptText className="h-5 w-5 text-primary" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            )}
            {"error" in result ? "후원 확인 결과" : "후원 완료"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {"error" in result ? (
            <div className="rounded-[24px] border border-destructive/25 bg-destructive/5 p-5 text-sm leading-6 text-destructive">
              {result.error}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">금액</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{formatPrice(result.amount)}</p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">결제 수단</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{result.provider ?? result.method ?? "일반결제"}</p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">승인 시각</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {result.approvedAt ? formatDateTimeShort(result.approvedAt) : "-"}
                  </p>
                </div>
              </div>

              {result.message ? (
                <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4 text-sm leading-6 text-foreground/80">
                  남겨주신 응원: {result.message}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/recommendations">관찰 종목으로 돌아가기</Link>
                </Button>
                {result.receiptUrl ? (
                  <Button asChild variant="outline">
                    <a href={result.receiptUrl} target="_blank" rel="noreferrer">
                      영수증 보기
                    </a>
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
