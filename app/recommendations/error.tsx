"use client";

import { RouteErrorState } from "@/components/shared/route-error-state";

export default function RecommendationsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      title="관찰 신호 보드를 불러오지 못했습니다"
      description="추천이 아니라 관찰 신호를 정리하는 페이지에서 응답을 가져오는 중 문제가 발생했습니다."
      reset={reset}
    />
  );
}