"use client";

import { Plus, Trash2 } from "lucide-react";

import type { PortfolioProfilePayload } from "@/components/admin/dashboard-types";
import { Field, formatDateTime } from "@/components/admin/dashboard-shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function updateNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function PortfolioProfileTab({
  profile,
  setProfile,
  onSave,
  disabled,
  saveButtonLabel = "자산 저장"
}: {
  profile: PortfolioProfilePayload | null;
  setProfile: (updater: (current: PortfolioProfilePayload) => PortfolioProfilePayload) => void;
  onSave: () => void;
  disabled: boolean;
  saveButtonLabel?: string;
}) {
  if (!profile) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>자산 설정</CardTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            총 자산, 가용 현금, 손실 한도, 보유 종목을 저장해 내 포트폴리오 스냅샷과 행동 보드에 바로 반영합니다.
          </p>
        </div>
        <Button onClick={onSave} disabled={disabled}>
          {saveButtonLabel}
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
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
          저장 후에는 내 포트폴리오 스냅샷, 보유 관리 보드, 오늘 행동 보드가 이 기준으로 다시 계산됩니다.
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
                <div
                  key={`${position.ticker || "new"}-${index}`}
                  className="rounded-[24px] border border-border/70 bg-secondary/30 p-4"
                >
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

          <div className="rounded-[24px] border border-border/70 bg-secondary/20 px-4 py-3 text-xs leading-5 text-muted-foreground">
            마지막 저장 {formatDateTime(profile.updatedAt)} · {profile.updatedBy}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
