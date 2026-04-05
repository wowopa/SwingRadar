"use client";

import { CircleHelp } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { AppTutorialScope } from "@/lib/tutorial/app-tutorial-content";
import { writeTutorialLaunchRequest } from "@/lib/tutorial/tutorial-launch-request";
import { cn } from "@/lib/utils";

interface TutorialLauncherButtonProps {
  iconOnly?: boolean;
  tone?: "default" | "light";
  resetAll?: boolean;
  className?: string;
  label?: string;
  scope?: AppTutorialScope;
  href?: string;
}

export function TutorialLauncherButton({
  iconOnly = false,
  tone = "default",
  resetAll = false,
  className,
  label,
  scope,
  href
}: TutorialLauncherButtonProps) {
  const isLight = tone === "light";
  const router = useRouter();
  const pathname = usePathname();

  function openTutorial() {
    if (scope && href && pathname !== href) {
      writeTutorialLaunchRequest({
        scope,
        resetAll
      });
      router.push(href);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("swing-radar:tutorial-open", {
        detail: {
          resetAll,
          scope
        }
      })
    );
  }

  return (
    <Button
      type="button"
      variant={isLight ? "secondary" : "outline"}
      size="sm"
      onClick={openTutorial}
      className={cn(
        iconOnly ? "h-10 w-10 rounded-full p-0" : "h-9 rounded-full px-3.5",
        isLight ? "border-white/14 bg-white/10 text-white hover:bg-white/14 hover:text-white" : undefined,
        className
      )}
      aria-label={label ?? (resetAll ? "전체 튜토리얼 다시 보기" : "현재 화면 튜토리얼 보기")}
      title={label ?? (resetAll ? "전체 튜토리얼 다시 보기" : "현재 화면 튜토리얼 보기")}
    >
      <CircleHelp className="h-4 w-4" />
      {iconOnly ? null : <span className="ml-2">{label ?? (resetAll ? "튜토리얼 다시 보기" : "가이드")}</span>}
    </Button>
  );
}
