"use client";

import { useEffect, useState } from "react";
import { LaptopMinimal, MoonStar, SunMedium } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getResolvedThemeFromDocument,
  persistThemePreference,
  readStoredThemePreference,
  THEME_PREFERENCE_EVENT,
  type ResolvedTheme,
  type ThemePreference
} from "@/lib/theme/theme-preference";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  {
    value: "light" as const,
    label: "화이트",
    description: "밝고 선명한 화이트 중심 컬러로 표시합니다.",
    icon: SunMedium
  },
  {
    value: "dark" as const,
    label: "다크",
    description: "어두운 배경과 높은 대비로 표시합니다.",
    icon: MoonStar
  },
  {
    value: "system" as const,
    label: "시스템",
    description: "OS 설정에 맞춰 자동으로 변경합니다.",
    icon: LaptopMinimal
  }
];

function getResolvedThemeLabel(theme: ResolvedTheme) {
  return theme === "dark" ? "다크" : "화이트";
}

export function AccountThemeSettingsCard() {
  const [preference, setPreference] = useState<ThemePreference>("light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const syncTheme = () => {
      setPreference(readStoredThemePreference());
      setResolvedTheme(getResolvedThemeFromDocument());
    };

    syncTheme();
    window.addEventListener(THEME_PREFERENCE_EVENT, syncTheme);

    return () => {
      window.removeEventListener(THEME_PREFERENCE_EVENT, syncTheme);
    };
  }, []);

  const activeLabel = THEME_OPTIONS.find((option) => option.value === preference)?.label ?? "화이트";

  return (
    <Card data-tutorial="account-theme" className="border-border/70 bg-card/92 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>화면 테마</CardTitle>
          <Badge variant="secondary">현재 적용 {getResolvedThemeLabel(resolvedTheme)}</Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          랜딩 페이지와 로그인 후 화면 전체의 컬러 테마를 바꿉니다. 기본값은 더 선명한 화이트 테마입니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = preference === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setPreference(option.value);
                  setResolvedTheme(persistThemePreference(option.value));
                }}
                className={cn(
                  "rounded-[24px] border px-4 py-4 text-left transition",
                  isActive
                    ? "border-primary/34 bg-primary/10 shadow-[0_16px_36px_-26px_hsl(var(--primary)/0.35)]"
                    : "border-border/80 bg-background hover:border-primary/22 hover:bg-accent/55"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  {isActive ? <Badge variant="neutral">선택됨</Badge> : null}
                </div>
                <p className="mt-4 text-base font-semibold text-foreground">{option.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{option.description}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-[24px] border border-border/70 bg-secondary/28 px-4 py-4 text-sm leading-6 text-muted-foreground">
          {preference === "system"
            ? `현재는 시스템 설정에 따라 ${getResolvedThemeLabel(resolvedTheme)} 테마로 보이고 있습니다.`
            : `지금 선택한 ${activeLabel} 테마가 바로 적용되고 있습니다.`}
        </div>
      </CardContent>
    </Card>
  );
}
