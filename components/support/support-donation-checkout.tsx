"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleDollarSign, HeartHandshake, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatPrice } from "@/lib/utils";

type SupportDonationCheckoutProps = {
  enabled: boolean;
  clientKey: string | null;
  paymentMethodVariantKey: string | null;
  agreementVariantKey: string | null;
  presetAmounts: number[];
  minimumAmount: number;
  maximumAmount: number;
  orderName: string;
  isTestMode: boolean;
};

type SupportOrderResponse = {
  ok: true;
  requestId: string;
  order: {
    orderId: string;
    amount: number;
    orderName: string;
    customerKey: string;
  };
};

type TossWidgetsInstance = {
  setAmount: (amount: { value: number; currency: "KRW" }) => void;
  renderPaymentMethods: (params: { selector: string; variantKey?: string }) => Promise<TossWidgetRenderable> | TossWidgetRenderable;
  renderAgreement?: (params: { selector: string; variantKey?: string }) => Promise<TossWidgetRenderable> | TossWidgetRenderable;
  requestPayment: (paymentRequest: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerName?: string;
    metadata?: Record<string, string>;
    windowTarget?: "self" | "iframe";
  }) => Promise<void> | void;
};

type TossWidgetRenderable = {
  destroy?: () => void;
};

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      widgets: (params: { customerKey: string }) => TossWidgetsInstance;
    };
  }
}

export function SupportDonationCheckout(props: SupportDonationCheckoutProps) {
  const [amount, setAmount] = useState<number>(props.presetAmounts[1] ?? props.presetAmounts[0] ?? props.minimumAmount);
  const [donorName, setDonorName] = useState("");
  const [message, setMessage] = useState("");
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const widgetsRef = useRef<TossWidgetsInstance | null>(null);
  const paymentMethodsRef = useRef<TossWidgetRenderable | null>(null);
  const agreementRef = useRef<TossWidgetRenderable | null>(null);
  const customerKey = useMemo(() => `support.${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`, []);

  useEffect(() => {
    if (!props.enabled || !props.clientKey || !sdkLoaded || widgetsRef.current || !window.TossPayments) {
      return;
    }

    let mounted = true;

    const initialize = async () => {
      try {
        const tossPayments = window.TossPayments?.(props.clientKey!);
        if (!tossPayments) {
          throw new Error("토스 결제 SDK를 불러오지 못했습니다.");
        }

        const widgets = tossPayments.widgets({ customerKey });
        widgets.setAmount({ value: amount, currency: "KRW" });
        widgetsRef.current = widgets;

        paymentMethodsRef.current = await widgets.renderPaymentMethods({
          selector: "#support-payment-methods",
          variantKey: props.paymentMethodVariantKey ?? undefined
        });

        if (widgets.renderAgreement) {
          agreementRef.current = await widgets.renderAgreement({
            selector: "#support-agreement",
            variantKey: props.agreementVariantKey ?? undefined
          });
        }

        if (mounted) {
          setWidgetReady(true);
          setError(null);
        }
      } catch (widgetError) {
        if (mounted) {
          setError(widgetError instanceof Error ? widgetError.message : "후원 결제 화면을 준비하지 못했습니다.");
        }
      }
    };

    void initialize();

    return () => {
      mounted = false;
      paymentMethodsRef.current?.destroy?.();
      agreementRef.current?.destroy?.();
      widgetsRef.current = null;
      paymentMethodsRef.current = null;
      agreementRef.current = null;
      setWidgetReady(false);
    };
  }, [customerKey, props.agreementVariantKey, props.clientKey, props.enabled, props.paymentMethodVariantKey, sdkLoaded]);

  useEffect(() => {
    if (!widgetsRef.current) {
      return;
    }

    widgetsRef.current.setAmount({ value: amount, currency: "KRW" });
  }, [amount]);

  async function handleDonate() {
    if (!props.enabled || !widgetsRef.current) {
      return;
    }

    if (!Number.isInteger(amount) || amount < props.minimumAmount || amount > props.maximumAmount) {
      setError(
        `후원 금액은 ${props.minimumAmount.toLocaleString("ko-KR")}원부터 ${props.maximumAmount.toLocaleString("ko-KR")}원 사이여야 합니다.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch("/api/support/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount,
          donorName,
          message
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | SupportOrderResponse
        | {
            message?: string;
          }
        | null;
      const errorMessage =
        payload && "message" in payload && typeof payload.message === "string" ? payload.message : "후원 주문을 준비하지 못했습니다.";

      if (!response.ok || !payload || !("order" in payload)) {
        throw new Error(errorMessage);
      }

      const successUrl = `${window.location.origin}/support/success`;
      const failUrl = `${window.location.origin}/support/fail`;

      await widgetsRef.current.requestPayment({
        orderId: payload.order.orderId,
        orderName: payload.order.orderName,
        successUrl,
        failUrl,
        customerName: donorName.trim() || undefined,
        metadata: message.trim() ? { cheer: message.trim().slice(0, 120) } : undefined,
        windowTarget: "self"
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "후원 결제를 시작하지 못했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" onLoad={() => setSdkLoaded(true)} />

      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-foreground">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            1회성 운영 후원
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-[24px] border border-border/70 bg-secondary/40 p-4 text-sm leading-6 text-foreground/80">
            서버비와 데이터 운영비, 서비스 개선 작업에 보탬이 되는 1회성 후원입니다. 후원은 선택이며 기존 기능은 그대로 이용하실 수 있습니다.
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">후원 금액</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {props.presetAmounts.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={cn(
                    "rounded-[20px] border px-4 py-3 text-left transition-colors",
                    amount === preset
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/70 bg-white/70 text-foreground hover:border-primary/25"
                  )}
                >
                  <p className="text-sm font-semibold">{formatPrice(preset)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">가볍게 운영을 응원하는 금액</p>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">직접 입력</p>
              <Input
                type="number"
                min={props.minimumAmount}
                max={props.maximumAmount}
                step={1000}
                value={String(amount)}
                onChange={(event) => setAmount(Number(event.target.value || 0))}
              />
              <p className="text-xs text-muted-foreground">
                최소 {formatPrice(props.minimumAmount)} · 최대 {formatPrice(props.maximumAmount)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">표시 이름</p>
              <Input
                maxLength={50}
                placeholder="익명도 괜찮습니다"
                value={donorName}
                onChange={(event) => setDonorName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">한 줄 응원</p>
              <Textarea
                maxLength={200}
                className="min-h-[88px]"
                placeholder="남기고 싶은 응원 문구가 있다면 적어주세요"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
          </div>

          {props.enabled ? (
            <div className="space-y-4">
              <div id="support-payment-methods" className="overflow-hidden rounded-[24px] border border-border/70 bg-white" />
              <div id="support-agreement" className="overflow-hidden rounded-[24px] border border-border/70 bg-white" />
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border/80 bg-secondary/40 p-5 text-sm leading-6 text-muted-foreground">
              토스 결제 연동 키를 연결하면 이 자리에서 바로 1회성 후원을 받을 수 있습니다.
            </div>
          )}

          {error ? (
            <div className="rounded-[20px] border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
          ) : null}

          <Button
            size="lg"
            className="w-full"
            disabled={!props.enabled || !widgetReady || submitting}
            onClick={() => {
              void handleDonate();
            }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
            {submitting ? "후원 주문을 준비하는 중..." : `${formatPrice(amount)} 후원하기`}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-white/82 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">안내</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-foreground/80">
          <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
            후원은 토스 결제창에서 진행되고, 승인까지 완료되면 감사 페이지로 이동합니다.
          </div>
          <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
            정기 구독이 아닌 1회성 결제입니다. 카드, 간편결제 등 실제 노출 수단은 토스 위젯 설정에 따라 달라집니다.
          </div>
          <div className="rounded-[24px] border border-border/70 bg-secondary/45 p-4">
            후원 내역은 내부 운영 기록으로만 관리되며, 사이트 기능 차등이나 투자 판단 우대와는 연결되지 않습니다.
          </div>
          {props.isTestMode ? (
            <div className="rounded-[24px] border border-primary/25 bg-primary/8 p-4 text-primary">
              현재 테스트 키 기준으로 동작합니다. 실제 결제가 아닌 테스트 결제 흐름으로 확인하실 수 있습니다.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
