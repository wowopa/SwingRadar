"use client";

import { RouteErrorState } from "@/components/shared/route-error-state";

export default function RecommendationsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      title="대시보드 화면을 불러오지 못했습니다"
      description="종목 분석 내용을 가져오는 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요."
      reset={reset}
    />
  );
}
