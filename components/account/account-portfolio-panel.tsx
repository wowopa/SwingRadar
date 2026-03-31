"use client";

import { useState } from "react";

import type { PortfolioProfilePayload } from "@/components/admin/dashboard-types";
import { PortfolioProfileTab } from "@/components/admin/portfolio-profile-tab";

export function AccountPortfolioPanel({
  initialProfile
}: {
  initialProfile: PortfolioProfilePayload;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/account/portfolio-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          totalCapital: profile.totalCapital,
          availableCash: profile.availableCash,
          maxRiskPerTradePercent: profile.maxRiskPerTradePercent,
          maxConcurrentPositions: profile.maxConcurrentPositions,
          sectorLimit: profile.sectorLimit,
          positions: profile.positions
        })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        profile?: PortfolioProfilePayload;
      };

      if (!response.ok || !payload.profile) {
        throw new Error(payload.message ?? `저장에 실패했습니다. (${response.status})`);
      }

      setProfile(payload.profile);
      setMessage("내 포트폴리오 프로필을 저장했습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "프로필 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      {message ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground/82">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <PortfolioProfileTab
        profile={profile}
        setProfile={(updater) => setProfile((current) => updater(current))}
        onSave={() => void saveProfile()}
        disabled={loading}
      />
    </section>
  );
}
