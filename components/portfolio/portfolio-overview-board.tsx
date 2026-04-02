import Link from "next/link";
import { ArrowUpRight, Clock3, ShieldAlert, Target, WalletCards } from "lucide-react";

import type { PortfolioTradeEventDialogPreset } from "@/components/portfolio/portfolio-trade-event-dialog";
import { SignalToneBadge } from "@/components/shared/signal-tone-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HoldingActionBoardDto, HoldingActionItemDto } from "@/lib/api-contracts/swing-radar";
import { cn, formatPercent, formatPrice } from "@/lib/utils";
import type { PortfolioProfile } from "@/types/recommendation";

function formatEnteredAt(value?: string) {
  if (!value) {
    return "진입일 미입력";
  }

  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul"
  }).format(date);
}

function formatQuantity(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}주`;
}

function getActionMeta(item?: HoldingActionItemDto | null) {
  if (!item) {
    return {
      label: "계획 유지",
      variant: "secondary" as const,
      note: "현재 등록된 보유 기준으로 추가 점검 신호는 많지 않습니다."
    };
  }

  if (item.actionStatus === "exit_review") {
    return {
      label: "즉시 점검",
      variant: "caution" as const,
      note: item.actionReason
    };
  }

  if (item.actionStatus === "take_profit") {
    return {
      label: "부분 익절",
      variant: "positive" as const,
      note: item.actionReason
    };
  }

  if (item.actionStatus === "tighten_stop") {
    return {
      label: "보호 가격 상향",
      variant: "neutral" as const,
      note: item.actionReason
    };
  }

  if (item.actionStatus === "time_stop_review") {
    return {
      label: "시간 점검",
      variant: "secondary" as const,
      note: item.actionReason
    };
  }

  return {
    label: item.actionLabel,
    variant: "default" as const,
    note: item.actionReason
  };
}

function buildActionMap(board?: HoldingActionBoardDto) {
  return new Map((board?.items ?? []).map((item) => [item.ticker, item]));
}

export function PortfolioOverviewBoard({
  profile,
  holdingActionBoard,
  onOpenSettings,
  onQuickTradeAction
}: {
  profile: PortfolioProfile;
  holdingActionBoard?: HoldingActionBoardDto;
  onOpenSettings?: () => void;
  onQuickTradeAction?: (preset: PortfolioTradeEventDialogPreset) => void;
}) {
  const actionMap = buildActionMap(holdingActionBoard);
  const riskBudget = Math.round((profile.totalCapital * profile.maxRiskPerTradePercent) / 100);
  const hasPositions = profile.positions.length > 0;

  return (
    <section className="space-y-6">
      <Card className="border-border/80 bg-white/90 shadow-[0_22px_56px_-34px_rgba(24,32,42,0.26)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-foreground">내 포트폴리오 스냅샷</CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                이 화면은 공용 관찰이 아니라, 내 계정에 입력한 보유 종목과 현금 기준으로 현재 포트폴리오를 관리하는
                용도입니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onOpenSettings ? (
                <Button type="button" variant="outline" onClick={onOpenSettings}>
                  자산 설정
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/account">자산 설정</Link>
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link href="/tracking">공용 관찰 보기</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryMetric title="총 자산" value={formatPrice(profile.totalCapital)} note="입력한 자산 기준" icon={WalletCards} />
            <SummaryMetric title="가용 현금" value={formatPrice(profile.availableCash)} note="신규 진입에 쓸 수 있는 현금" icon={ArrowUpRight} />
            <SummaryMetric title="보유 종목" value={`${profile.positions.length}개`} note="현재 계정에 등록된 보유 수" icon={ShieldAlert} />
            <SummaryMetric title="1회 손실 한도" value={formatPrice(riskBudget)} note={`${profile.maxRiskPerTradePercent.toFixed(1)}% 기준`} icon={ShieldAlert} />
            <SummaryMetric title="동시 보유 한도" value={`${profile.maxConcurrentPositions}개`} note="같이 관리할 최대 종목 수" icon={Target} />
            <SummaryMetric title="섹터 한도" value={`${profile.sectorLimit}개`} note="같은 섹터 신규 진입 상한" icon={Clock3} />
          </div>

          {holdingActionBoard ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ActionCountCard
                title="즉시 점검"
                count={holdingActionBoard.summary.exitReviewCount}
                note="손절과 구조 이탈 우선 확인"
                variant="caution"
              />
              <ActionCountCard
                title="부분 익절"
                count={holdingActionBoard.summary.takeProfitCount}
                note="이익을 일부 챙길 구간"
                variant="positive"
              />
              <ActionCountCard
                title="보호 가격 상향"
                count={holdingActionBoard.summary.tightenStopCount}
                note="손절 기준을 더 올릴 구간"
                variant="neutral"
              />
              <ActionCountCard
                title="시간 점검"
                count={holdingActionBoard.summary.timeStopReviewCount}
                note="보유 기간 기준 재검토"
                variant="secondary"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-white/90 shadow-[0_18px_46px_-32px_rgba(24,32,42,0.22)]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-foreground">현재 보유 종목</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                각 보유 종목의 평균단가와 다음 행동을 함께 봅니다.
              </p>
            </div>
            <Badge variant={hasPositions ? "positive" : "secondary"}>{profile.positions.length}개</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {hasPositions ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {profile.positions.map((position) => {
                const actionItem = actionMap.get(position.ticker);
                const actionMeta = getActionMeta(actionItem);
                const currentPrice = actionItem?.currentPrice ?? position.averagePrice;
                const quickPartialQuantity = position.quantity > 1 ? Math.max(1, Math.ceil(position.quantity / 2)) : position.quantity;

                return (
                  <div
                    key={position.ticker}
                    className="rounded-[24px] border border-border/80 bg-[hsl(42_38%_97%)] p-4 transition hover:border-primary/28 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {position.company} <span className="text-xs font-medium text-muted-foreground">{position.ticker}</span>
                          </p>
                          <Badge variant={actionMeta.variant}>{actionMeta.label}</Badge>
                          {actionItem?.signalTone ? <SignalToneBadge tone={actionItem.signalTone} /> : null}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {position.sector} · {formatEnteredAt(position.enteredAt)}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="sm" className="shrink-0">
                        <Link href={`/portfolio/${position.ticker}`}>상세 보기</Link>
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MiniMetric label="평균단가" value={formatPrice(position.averagePrice)} />
                      <MiniMetric
                        label="현재가"
                        value={
                          typeof actionItem?.currentPrice === "number"
                            ? formatPrice(actionItem.currentPrice)
                            : "확인 필요"
                        }
                      />
                      <MiniMetric label="보유 수량" value={formatQuantity(position.quantity)} />
                      <MiniMetric
                        label="평가손익"
                        value={
                          typeof actionItem?.unrealizedPnlPercent === "number"
                            ? formatPercent(actionItem.unrealizedPnlPercent)
                            : "확인 필요"
                        }
                      />
                    </div>

                    <div
                      className={cn(
                        "mt-4 rounded-[20px] border px-4 py-3",
                        actionMeta.variant === "caution"
                          ? "border-caution/24 bg-[hsl(var(--caution)/0.1)]"
                          : actionMeta.variant === "positive"
                            ? "border-positive/24 bg-[hsl(var(--positive)/0.1)]"
                            : actionMeta.variant === "neutral"
                              ? "border-neutral/24 bg-[hsl(var(--neutral)/0.1)]"
                              : "border-border/80 bg-[hsl(42_38%_97%)]"
                      )}
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">다음 행동</p>
                      <p className="mt-2 text-sm leading-6 text-foreground/82">
                        {actionItem?.nextAction ?? "현재는 보유 계획을 유지하며 추가 점검만 이어갑니다."}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{actionMeta.note}</p>
                    </div>

                    {onQuickTradeAction ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="relative z-10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onQuickTradeAction({
                              title: `${position.company} 부분 익절`,
                              description: "빠르게 익절 기록을 남기고 보유 수량과 가용 현금을 함께 갱신합니다.",
                              saveButtonLabel: "부분 익절 저장",
                              ticker: position.ticker,
                              company: position.company,
                              sector: position.sector,
                              type: "take_profit_partial",
                              quantity: quickPartialQuantity,
                              price: currentPrice,
                              note: "부분 익절 빠른 기록",
                              syncProfilePosition: true,
                              maxQuantity: position.quantity,
                              lockTicker: true,
                              lockType: true
                            });
                          }}
                        >
                          부분 익절
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="relative z-10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onQuickTradeAction({
                              title: `${position.company} 손절`,
                              description: "손절 체결을 빠르게 남기고 남은 보유 수량과 가용 현금을 즉시 맞춥니다.",
                              saveButtonLabel: "손절 저장",
                              ticker: position.ticker,
                              company: position.company,
                              sector: position.sector,
                              type: "stop_loss",
                              quantity: position.quantity,
                              price: currentPrice,
                              note: "손절 빠른 기록",
                              syncProfilePosition: true,
                              maxQuantity: position.quantity,
                              lockTicker: true,
                              lockType: true
                            });
                          }}
                        >
                          손절
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="relative z-10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onQuickTradeAction({
                              title: `${position.company} 전량 매도`,
                              description: "남은 수량 전체를 정리하는 체결을 빠르게 기록하고 보유 종목에서 바로 반영합니다.",
                              saveButtonLabel: "전량 매도 저장",
                              ticker: position.ticker,
                              company: position.company,
                              sector: position.sector,
                              type: "exit_full",
                              quantity: position.quantity,
                              price: currentPrice,
                              note: "전량 매도 빠른 기록",
                              syncProfilePosition: true,
                              maxQuantity: position.quantity,
                              lockTicker: true,
                              lockType: true
                            });
                          }}
                        >
                          전량 매도
                        </Button>
                      </div>
                    ) : null}

                    {position.note ? (
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">메모: {position.note}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-border/80 bg-[hsl(42_40%_97%)] px-5 py-6 text-sm leading-6 text-muted-foreground">
              아직 등록된 보유 종목이 없습니다. 먼저 자산 설정에서 보유 종목과 현금 기준을 입력해 주세요.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function SummaryMetric({
  title,
  value,
  note,
  icon: Icon
}: {
  title: string;
  value: string;
  note: string;
  icon: typeof WalletCards;
}) {
  return (
    <div className="rounded-[22px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,241,232,0.9))] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ActionCountCard({
  title,
  count,
  note,
  variant
}: {
  title: string;
  count: number;
  note: string;
  variant: "secondary" | "positive" | "neutral" | "caution";
}) {
  const toneByVariant = {
    secondary: "border-border/80 bg-[hsl(42_40%_97%)]",
    positive: "border-positive/22 bg-[hsl(var(--positive)/0.1)]",
    neutral: "border-neutral/22 bg-[hsl(var(--neutral)/0.1)]",
    caution: "border-caution/22 bg-[hsl(var(--caution)/0.1)]"
  } as const;

  return (
    <div className={cn("rounded-[22px] border p-4", toneByVariant[variant])}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Badge variant={variant}>{count}개</Badge>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-[hsl(42_40%_97%)] px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
