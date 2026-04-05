import type { AppTutorialDefinition, AppTutorialScope } from "@/lib/tutorial/app-tutorial-content";

export type TutorialProgress = Partial<Record<AppTutorialScope, number>>;

export function normalizeTutorialProgress(value: unknown): TutorialProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const next: TutorialProgress = {};

  for (const [scope, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (rawValue === true) {
      next[scope as AppTutorialScope] = 1;
      continue;
    }

    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
      continue;
    }

    const version = Math.max(0, Math.floor(rawValue));

    if (version > 0) {
      next[scope as AppTutorialScope] = version;
    }
  }

  return next;
}

export function hasSeenTutorial(
  progress: TutorialProgress,
  definition: Pick<AppTutorialDefinition, "scope" | "version">
) {
  return (progress[definition.scope] ?? 0) >= definition.version;
}

export function markTutorialSeen(
  progress: TutorialProgress,
  definition: Pick<AppTutorialDefinition, "scope" | "version">
): TutorialProgress {
  return {
    ...progress,
    [definition.scope]: definition.version
  };
}
