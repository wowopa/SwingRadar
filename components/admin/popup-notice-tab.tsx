"use client";
/* eslint-disable @next/next/no-img-element */

import { BadgeAlert, CalendarRange, ImageIcon } from "lucide-react";

import type { PopupNoticeDocument } from "@/components/admin/dashboard-types";
import { Field, formatDateTime } from "@/components/admin/dashboard-shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function formatDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

function getPopupStatus(document: PopupNoticeDocument) {
  if (!document.enabled) {
    return { label: "비활성", note: "설정은 저장돼 있지만 사이트에는 노출되지 않습니다." };
  }

  const now = Date.now();
  const startAt = document.startAt ? new Date(document.startAt).getTime() : null;
  const endAt = document.endAt ? new Date(document.endAt).getTime() : null;

  if (startAt !== null && !Number.isNaN(startAt) && now < startAt) {
    return {
      label: "예약 중",
      note: `${formatDateTime(document.startAt ?? "")}부터 표시됩니다.`
    };
  }

  if (endAt !== null && !Number.isNaN(endAt) && now > endAt) {
    return {
      label: "종료됨",
      note: `${formatDateTime(document.endAt ?? "")} 이후에는 표시되지 않습니다.`
    };
  }

  return { label: "노출 중", note: "조건을 만족하는 첫 방문자에게 팝업으로 노출됩니다." };
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-border/70 bg-secondary/35 px-3 py-2 text-xs font-medium text-foreground">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2">{value}</span>
    </div>
  );
}

export function PopupNoticeTab({
  document,
  setDocument,
  onSave,
  disabled
}: {
  document: PopupNoticeDocument | null;
  setDocument: (updater: (current: PopupNoticeDocument) => PopupNoticeDocument) => void;
  onSave: () => void;
  disabled: boolean;
}) {
  if (!document) {
    return null;
  }

  const status = getPopupStatus(document);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-3">
            <div>
              <CardTitle>팝업 공지</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">첫 진입 사용자에게 보여줄 공지를 간단히 설정합니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SummaryPill label="상태" value={status.label} />
              <SummaryPill label="이미지" value={document.imageUrl ? "사용" : "없음"} />
              <SummaryPill
                label="기간"
                value={
                  document.startAt || document.endAt
                    ? `${document.startAt ? "시작 설정" : "즉시"} · ${document.endAt ? "종료 설정" : "수동 종료"}`
                    : "즉시 ~ 수동 종료"
                }
              />
            </div>
          </div>
          <Button onClick={onSave} disabled={disabled}>
            저장
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center gap-3 rounded-[24px] border border-border/70 bg-secondary/35 px-4 py-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={document.enabled}
              onChange={(event) => setDocument((current) => ({ ...current, enabled: event.target.checked }))}
            />
            <span className="font-medium">팝업 공지 사용</span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="노출 시작">
              <Input
                type="datetime-local"
                value={formatDateTimeLocalValue(document.startAt)}
                onChange={(event) => setDocument((current) => ({ ...current, startAt: event.target.value || null }))}
              />
            </Field>
            <Field label="노출 종료">
              <Input
                type="datetime-local"
                value={formatDateTimeLocalValue(document.endAt)}
                onChange={(event) => setDocument((current) => ({ ...current, endAt: event.target.value || null }))}
              />
            </Field>
          </div>

          <Field label="제목">
            <Input
              value={document.title}
              placeholder="예: 오늘 점검 시간 안내"
              onChange={(event) => setDocument((current) => ({ ...current, title: event.target.value }))}
            />
          </Field>

          <Field label="내용">
            <Textarea
              className="min-h-[180px]"
              value={document.body}
              placeholder={"공지 내용을 문단 단위로 적어주세요.\n\n빈 줄을 넣으면 문단이 나뉩니다."}
              onChange={(event) => setDocument((current) => ({ ...current, body: event.target.value }))}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <Field label="이미지 URL">
              <Input
                value={document.imageUrl ?? ""}
                placeholder="https://..."
                onChange={(event) => setDocument((current) => ({ ...current, imageUrl: event.target.value || null }))}
              />
            </Field>
            <Field label="이미지 설명">
              <Input
                value={document.imageAlt ?? ""}
                placeholder="선택"
                onChange={(event) => setDocument((current) => ({ ...current, imageAlt: event.target.value || null }))}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-[radial-gradient(circle_at_top_left,hsl(41_56%_89%_/_0.45),transparent_42%),linear-gradient(180deg,hsl(44_38%_96%),hsl(36_24%_98%))]">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <BadgeAlert className="h-4 w-4 text-primary" />
            Popup Preview
          </div>
          <CardTitle className="mt-3 text-xl">{document.title || "팝업 제목을 입력하면 여기에 미리 보입니다."}</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            {status.label} · {status.note}
          </p>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border/70 bg-secondary/35 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarRange className="h-4 w-4 text-primary" />
                노출 기간
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {document.startAt ? formatDateTime(document.startAt) : "즉시 노출"} ~{" "}
                {document.endAt ? formatDateTime(document.endAt) : "직접 종료 전까지"}
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-secondary/35 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ImageIcon className="h-4 w-4 text-primary" />
                방문자 옵션
              </div>
              <p className="mt-3 text-sm text-muted-foreground">오늘 하루 보지 않기 체크박스와 닫기 버튼이 함께 보입니다.</p>
            </div>
          </div>

          {document.imageUrl ? (
            <div className="overflow-hidden rounded-[28px] border border-border/70 bg-secondary/20">
              <img src={document.imageUrl} alt={document.imageAlt ?? document.title} className="h-56 w-full object-cover" />
            </div>
          ) : null}

          <div className="space-y-3 rounded-[28px] border border-border/70 bg-white p-5 shadow-sm">
            {(document.body || "내용을 입력하면 방문자에게 보여줄 문단이 여기에 표시됩니다.")
              .split(/\n{2,}/)
              .map((paragraph, index) => (
                <p key={`${paragraph}-${index}`} className="whitespace-pre-line text-sm leading-7 text-foreground/88">
                  {paragraph}
                </p>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
