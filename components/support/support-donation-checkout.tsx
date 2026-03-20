"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, HeartHandshake, Smartphone } from "lucide-react";

import type { SupportTier } from "@/lib/server/support-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

type SupportDonationCheckoutProps = {
  enabled: boolean;
  bankName: string;
  accountNumber: string | null;
  accountHolder: string | null;
  supportTitle: string;
  tiers: SupportTier[];
};

export function SupportDonationCheckout({
  enabled,
  bankName,
  accountNumber,
  accountHolder,
  supportTitle,
  tiers
}: SupportDonationCheckoutProps) {
  const [copied, setCopied] = useState<"account" | number | null>(null);

  const accountLabel = useMemo(() => {
    if (!accountNumber) {
      return "";
    }

    return `${bankName} ${accountNumber}${accountHolder ? ` (${accountHolder})` : ""}`;
  }, [accountHolder, accountNumber, bankName]);

  async function handleCopy(value: string, kind: "account" | number) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1800);
    } catch {
      setCopied(null);
    }
  }

  if (!enabled || !accountNumber || tiers.length === 0) {
    return (
      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-foreground">
            <HeartHandshake className="h-5 w-5 text-primary" />
            후원 준비 중
          </CardTitle>
        </CardHeader>
        <CardContent className="rounded-[24px] border border-dashed border-border/80 bg-secondary/40 p-5 text-sm leading-6 text-muted-foreground">
          토스 송금 링크를 연결하면 여기에서 바로 1회성 운영 후원을 받을 수 있습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-xl text-foreground">
            <HeartHandshake className="h-5 w-5 text-primary" />
            1회성 운영 후원
          </CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            아래 금액 버튼을 누르면 모바일에서는 토스 앱 송금 화면이 바로 열립니다. 각 금액은 같은 계좌로 연결되며,
            서비스 운영과 개선에 사용됩니다.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div key={tier.amount} className="flex flex-col rounded-[28px] border border-border/70 bg-secondary/45 p-5">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{tier.label}</p>
                <p className="text-2xl font-semibold text-foreground">{formatPrice(tier.amount)}</p>
                <p className="text-sm leading-6 text-foreground/78">{tier.description}</p>
              </div>

              <div className="mt-5 space-y-3">
                <Button asChild className="w-full">
                  <a href={tier.deepLink}>
                    <Smartphone className="h-4 w-4" />
                    토스로 열기
                  </a>
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => void handleCopy(tier.deepLink, tier.amount)}>
                  {copied === tier.amount ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  링크 복사
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">안내</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-foreground/80">
          <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
            <p className="font-semibold text-foreground">{supportTitle}</p>
            <p className="mt-2">모바일에서 링크를 누르면 토스 앱으로 이동해 송금 화면이 열립니다.</p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
            <p className="font-semibold text-foreground">송금 계좌</p>
            <p className="mt-2 break-all font-mono text-base text-foreground">{accountLabel}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void handleCopy(accountLabel, "account")}>
                {copied === "account" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                계좌 복사
              </Button>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
            <p className="font-semibold text-foreground">데스크톱에서 여는 경우</p>
            <p className="mt-2">
              PC에서는 딥링크가 바로 열리지 않을 수 있습니다. 이 경우 계좌를 복사해 토스 앱에서 직접 송금하거나, 모바일에서
              페이지를 다시 열어 진행해 주세요.
            </p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
            <p className="font-semibold text-foreground">후원 성격</p>
            <p className="mt-2">
              정기 구독이 아닌 1회성 운영 후원입니다. 후원 여부와 관계없이 기존 기능은 그대로 이용하실 수 있습니다.
            </p>
          </div>

          <a
            href={tiers[0]?.deepLink}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            기본 후원 링크 열기
            <ExternalLink className="h-4 w-4" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
