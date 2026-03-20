"use client";

import { useEffect, useMemo, useState } from "react";
import { toDataURL } from "qrcode";
import { Check, Copy, HeartHandshake, QrCode, Smartphone, Sparkles } from "lucide-react";

import type { SupportTier } from "@/lib/server/support-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils";

type SupportDonationCheckoutProps = {
  enabled: boolean;
  bankName: string;
  accountNumber: string | null;
  accountHolder: string | null;
  supportTitle: string;
  tiers: SupportTier[];
};

const tierAccents = [
  {
    badge: "Light",
    card: "border-border/70 bg-secondary/45",
    accent: "bg-white/80 text-foreground"
  },
  {
    badge: "Recommended",
    card: "border-primary/20 bg-primary/10",
    accent: "bg-primary text-primary-foreground"
  },
  {
    badge: "Deep",
    card: "border-[hsl(var(--positive)/0.18)] bg-[hsl(var(--positive)/0.08)]",
    accent: "bg-[hsl(var(--positive))] text-white"
  }
] as const;

export function SupportDonationCheckout({
  enabled,
  bankName,
  accountNumber,
  accountHolder,
  supportTitle,
  tiers
}: SupportDonationCheckoutProps) {
  const [copied, setCopied] = useState<"account" | null>(null);
  const [qrSources, setQrSources] = useState<Record<number, string>>({});

  const accountCopyValue = useMemo(() => {
    if (!accountNumber) {
      return "";
    }

    return `${bankName} ${accountNumber}`;
  }, [accountNumber, bankName]);

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      const entries = await Promise.all(
        tiers.map(async (tier) => {
          const dataUrl = await toDataURL(tier.deepLink, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 240,
            color: {
              dark: "#183153",
              light: "#0000"
            }
          });

          return [tier.amount, dataUrl] as const;
        })
      );

      if (!cancelled) {
        setQrSources(Object.fromEntries(entries));
      }
    }

    if (tiers.length > 0) {
      void generate();
    }

    return () => {
      cancelled = true;
    };
  }, [tiers]);

  async function handleCopy(value: string, kind: "account") {
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
          토스로 후원하실 수 있도록 계좌와 링크를 연결하면 여기에서 바로 1회성 운영 후원을 받을 수 있습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-xl text-foreground">
            <HeartHandshake className="h-5 w-5 text-primary" />
            1회성 운영 후원
          </CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            후원은 토스를 통해서만 진행할 수 있습니다. 모바일에서는 버튼으로 바로 열 수 있고, 데스크톱에서는 금액별 QR 코드를
            열어 같은 송금 화면으로 이어서 확인하실 수 있습니다.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {tiers.map((tier, index) => {
            const accent = tierAccents[index] ?? tierAccents[0];

            return (
              <div key={tier.amount} className={`flex flex-col rounded-[28px] border p-5 shadow-sm ${accent.card}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{tier.label}</p>
                    <p className="text-2xl font-semibold text-foreground">{formatPrice(tier.amount)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${accent.accent}`}>
                    {accent.badge}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-foreground/78">{tier.description}</p>

                <div className="mt-5 grid gap-3">
                  <Button asChild className="w-full">
                    <a href={tier.deepLink}>
                      <Smartphone className="h-4 w-4" />
                      토스로 열기
                    </a>
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" className="w-full">
                        <QrCode className="h-4 w-4" />
                        QR 코드 보기
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{formatPrice(tier.amount)} 후원 QR 코드</DialogTitle>
                        <DialogDescription>
                          토스 앱으로 아래 QR 코드를 스캔하면 해당 금액의 송금 화면을 바로 열 수 있습니다.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="rounded-[28px] border border-border/70 bg-secondary/35 p-5">
                          <div className="mx-auto flex w-full max-w-[260px] items-center justify-center rounded-[24px] border border-border/70 bg-white p-4 shadow-sm">
                            {qrSources[tier.amount] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={qrSources[tier.amount]} alt={`${formatPrice(tier.amount)} 후원 QR 코드`} className="h-56 w-56" />
                            ) : (
                              <div className="flex h-56 w-56 items-center justify-center text-sm text-muted-foreground">QR 준비 중</div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Sparkles className="h-4 w-4 text-primary" />
                            {tier.label}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-foreground/78">{tier.description}</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">안내</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-foreground/80">
          <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
            <p className="font-semibold text-foreground">{supportTitle}</p>
            <p className="mt-2">모바일에서는 버튼으로 바로 이동할 수 있고, 데스크톱에서는 금액별 QR 코드로 같은 송금 화면을 열 수 있습니다.</p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
            <p className="font-semibold text-foreground">송금 계좌</p>
            <div className="mt-3 rounded-[22px] border border-border/70 bg-white/90 p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">은행</p>
                  <p className="mt-1 text-base font-medium text-foreground">{bankName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">계좌번호</p>
                  <p className="mt-1 text-base font-medium tracking-[0.04em] text-foreground">{accountNumber}</p>
                </div>
                {accountHolder ? (
                  <div>
                    <p className="text-sm text-muted-foreground">예금주</p>
                    <p className="mt-1 text-base font-medium text-foreground">{accountHolder}</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void handleCopy(accountCopyValue, "account")}>
                {copied === "account" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                계좌 복사
              </Button>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
            <p className="font-semibold text-foreground">데스크톱에서 여는 경우</p>
            <p className="mt-2">상단 금액 카드의 QR 코드를 열어 토스 앱으로 스캔해 주세요. 계좌 복사로 직접 송금하셔도 됩니다.</p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
            <p className="font-semibold text-foreground">후원 성격</p>
            <p className="mt-2">정기 구독이 아닌 1회성 운영 후원입니다. 후원 여부와 관계없이 기존 기능은 그대로 이용하실 수 있습니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
