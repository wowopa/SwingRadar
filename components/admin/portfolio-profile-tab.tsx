"use client";

import { Plus, Trash2, WalletCards } from "lucide-react";

import type { PortfolioProfilePayload } from "@/components/admin/dashboard-types";
import { Field, MetricCard, formatDateTime } from "@/components/admin/dashboard-shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(value)}원`;
}

function updateNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function PortfolioProfileTab({
  profile,
  setProfile,
  onSave,
  disabled
}: {
  profile: PortfolioProfilePayload | null;
  setProfile: (updater: (current: PortfolioProfilePayload) => PortfolioProfilePayload) => void;
  onSave: () => void;
  disabled: boolean;
}) {
  if (!profile) {
    return null;
  }

  const investedCapital = profile.positions.reduce((sum, position) => sum + position.quantity * position.averagePrice, 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>단일 포트폴리오 프로필</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              계정 시스템 전 단계에서 서비스가 사용할 공용 운용 프로필입니다. 현재 보유 종목, 현금, 리스크 한도를
              저장해 오늘 행동 보드의 제약 조건으로 씁니다.
            </p>
          </div>
          <Button onClick={onSave} disabled={disabled}>
            저장
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="프로필 이름">
            <Input
              value={profile.name}
              placeholder="예: 스윙 기본 계정"
              onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="총 자산">
              <Input
                type="number"
                min={0}
                value={String(profile.totalCapital)}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, totalCapital: updateNumber(event.target.value) }))
                }
              />
            </Field>
            <Field label="가용 현금">
              <Input
                type="number"
                min={0}
                value={String(profile.availableCash)}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, availableCash: updateNumber(event.target.value) }))
                }
              />
            </Field>
            <Field label="1회 손실 허용(%)">
              <Input
                type="number"
                min={0}
                step="0.1"
                value={String(profile.maxRiskPerTradePercent)}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, maxRiskPerTradePercent: updateNumber(event.target.value) }))
                }
              />
            </Field>
            <Field label="동시 관리 한도">
              <Input
                type="number"
                min={1}
                value={String(profile.maxConcurrentPositions)}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    maxConcurrentPositions: Math.max(1, Math.round(updateNumber(event.target.value)))
                  }))
                }
              />
            </Field>
            <Field label="같은 섹터 한도">
              <Input
                type="number"
                min={1}
                value={String(profile.sectorLimit)}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    sectorLimit: Math.max(1, Math.round(updateNumber(event.target.value)))
                  }))
                }
              />
            </Field>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-secondary/35 p-4 text-sm leading-6 text-muted-foreground">
            다음 단계에서 이 프로필을 기준으로 종목별 매수 금액과 포지션 비중까지 계산할 수 있게 됩니다. 지금 단계에서는
            포트폴리오 슬롯과 섹터 중복 제한에 먼저 연결합니다.
          </div>

          <div className="space-y-4 rounded-[28px] border border-border/70 bg-background/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">현재 보유 종목</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  티커만 넣어도 저장 시 종목명과 섹터를 자동으로 보강합니다.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setProfile((current) => ({
                    ...current,
                    positions: [
                      ...current.positions,
                      {
                        ticker: "",
                        company: "",
                        sector: "",
                        quantity: 0,
                        averagePrice: 0,
                        enteredAt: "",
                        note: ""
                      }
                    ]
                  }))
                }
              >
                <Plus className="h-4 w-4" />
                보유 추가
              </Button>
            </div>

            {profile.positions.length ? (
              <div className="space-y-4">
                {profile.positions.map((position, index) => (
                  <div key={`${position.ticker || "new"}-${index}`} className="rounded-[24px] border border-border/70 bg-secondary/30 p-4">
                    <div className="grid gap-4 xl:grid-cols-[0.9fr_1fr_1fr_1fr_auto]">
                      <Field label="티커">
                        <Input
                          value={position.ticker}
                          placeholder="005930"
                          onChange={(event) =>
                            setProfile((current) => ({
                              ...current,
                              positions: current.positions.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, ticker: event.target.value.trim().toUpperCase() } : item
                              )
                            }))
                          }
                        />
                      </Field>
                      <Field label="수량">
                        <Input
                          type="number"
                          min={0}
                          step="0.0001"
                          value={String(position.quantity)}
                          onChange={(event) =>
                            setProfile((current) => ({
                              ...current,
                              positions: current.positions.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, quantity: updateNumber(event.target.value) } : item
                              )
                            }))
                          }
                        />
                      </Field>
                      <Field label="평균단가">
                        <Input
                          type="number"
                          min={0}
                          value={String(position.averagePrice)}
                          onChange={(event) =>
                            setProfile((current) => ({
                              ...current,
                              positions: current.positions.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, averagePrice: updateNumber(event.target.value) } : item
                              )
                            }))
                          }
                        />
                      </Field>
                      <Field label="진입일">
                        <Input
                          type="date"
                          value={position.enteredAt ?? ""}
                          onChange={(event) =>
                            setProfile((current) => ({
                              ...current,
                              positions: current.positions.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, enteredAt: event.target.value } : item
                              )
                            }))
                          }
                        />
                      </Field>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setProfile((current) => ({
                              ...current,
                              positions: current.positions.filter((_, itemIndex) => itemIndex !== index)
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                          삭제
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
                      <Field label="저장된 종목명">
                        <Input value={position.company} placeholder="저장 후 자동 보강" readOnly />
                      </Field>
                      <Field label="저장된 섹터">
                        <Input value={position.sector} placeholder="저장 후 자동 보강" readOnly />
                      </Field>
                    </div>

                    <Field label="운용 메모">
                      <Textarea
                        value={position.note ?? ""}
                        placeholder="예: 실적 발표 전 비중 축소, 진입 5일 차 관리"
                        onChange={(event) =>
                          setProfile((current) => ({
                            ...current,
                            positions: current.positions.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, note: event.target.value } : item
                            )
                          }))
                        }
                      />
                    </Field>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
                아직 저장된 보유 종목이 없습니다. 첫 종목을 추가하면 오늘 행동 보드가 실제 포트폴리오 슬롯과 섹터 제한을
                반영하기 시작합니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>프로필 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard label="총 자산" value={formatCurrency(profile.totalCapital)} note="향후 비중 계산의 기준 금액" />
            <MetricCard label="가용 현금" value={formatCurrency(profile.availableCash)} note="신규 매수에 바로 쓸 수 있는 현금" />
            <MetricCard
              label="1회 손실 허용"
              value={`${profile.maxRiskPerTradePercent.toFixed(1)}%`}
              note={formatCurrency((profile.totalCapital * profile.maxRiskPerTradePercent) / 100)}
            />
            <MetricCard
              label="보유 수 / 한도"
              value={`${profile.positions.length} / ${profile.maxConcurrentPositions}`}
              note={`같은 섹터 최대 ${profile.sectorLimit}개`}
            />
          </div>

          <div className="rounded-[28px] border border-border/70 bg-secondary/30 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <WalletCards className="h-4 w-4" />
              현재 입력 기준 메모
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              총 {profile.positions.length}개 보유를 기준으로 오늘 행동 보드의 포트폴리오 슬롯과 섹터 중복을 판단합니다.
              다음 단계에서는 이 데이터를 이용해 종목별 매수 금액과 비중을 계산할 예정입니다.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              마지막 저장 {formatDateTime(profile.updatedAt)} · {profile.updatedBy}
            </p>
          </div>

          <div className="rounded-[28px] border border-border/70 bg-background/35 p-5">
            <p className="text-sm font-semibold text-foreground">추정 투자 원가</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(investedCapital)}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              수량과 평균단가를 곱한 단순 합계입니다. 실제 평가 손익은 아직 계산하지 않습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
