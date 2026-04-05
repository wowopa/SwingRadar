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
    label: "\uD654\uC774\uD2B8",
    description: "\uBC1D\uACE0 \uC120\uBA85\uD55C \uD654\uC774\uD2B8 \uC911\uC2EC \uCEEC\uB7EC\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4.",
    icon: SunMedium
  },
  {
    value: "dark" as const,
    label: "\uB2E4\uD06C",
    description: "\uC5B4\uB450\uC6B4 \uBC30\uACBD\uACFC \uB192\uC740 \uB300\uBE44\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4.",
    icon: MoonStar
  },
  {
    value: "system" as const,
    label: "\uC2DC\uC2A4\uD15C",
    description: "OS \uC124\uC815\uC5D0 \uB9DE\uCDB0 \uC790\uB3D9\uC73C\uB85C \uBCC0\uACBD\uD569\uB2C8\uB2E4.",
    icon: LaptopMinimal
  }
];

function getResolvedThemeLabel(theme: ResolvedTheme) {
  return theme === "dark" ? "\uB2E4\uD06C" : "\uD654\uC774\uD2B8";
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

  const activeLabel = THEME_OPTIONS.find((option) => option.value === preference)?.label ?? "\uD654\uC774\uD2B8";

  return (
    <Card data-tutorial="account-theme" className="border-border/70 bg-card/92 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>\uD654\uBA74 \uD14C\uB9C8</CardTitle>
          <Badge variant="secondary">
            \uD604\uC7AC \uC801\uC6A9 {getResolvedThemeLabel(resolvedTheme)}
          </Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          \uB79C\uB529 \uD398\uC774\uC9C0\uC640 \uB85C\uADF8\uC778 \uD6C4 \uD654\uBA74 \uC804\uCCB4\uC758 \uCEEC\uB7EC \uD14C\uB9C8\uB97C \uBC14\uAFC9\uB2C8\uB2E4.
          \uAE30\uBCF8\uAC12\uC740 \uB354 \uC120\uBA85\uD55C \uD654\uC774\uD2B8 \uD14C\uB9C8\uC785\uB2C8\uB2E4.
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
                  {isActive ? <Badge variant="neutral">\uC120\uD0DD\uB428</Badge> : null}
                </div>
                <p className="mt-4 text-base font-semibold text-foreground">{option.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{option.description}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-[24px] border border-border/70 bg-secondary/28 px-4 py-4 text-sm leading-6 text-muted-foreground">
          {preference === "system"
            ? `\uD604\uC7AC\uB294 \uC2DC\uC2A4\uD15C \uC124\uC815\uC5D0 \uB530\uB77C ${getResolvedThemeLabel(resolvedTheme)} \uD14C\uB9C8\uB85C \uBCF4\uC774\uACE0 \uC788\uC2B5\uB2C8\uB2E4.`
            : `\uC9C0\uAE08 \uC120\uD0DD\uD55C ${activeLabel} \uD14C\uB9C8\uAC00 \uBC14\uB85C \uC801\uC6A9\uB418\uACE0 \uC788\uC2B5\uB2C8\uB2E4.`}
        </div>
      </CardContent>
    </Card>
  );
}
