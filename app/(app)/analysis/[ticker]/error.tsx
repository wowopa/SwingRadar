"use client";

import { RouteErrorState } from "@/components/shared/route-error-state";

export default function AnalysisError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      title="분석 페이지를 불러오지 못했습니다"
      description="선택한 티커의 시나리오와 점수 분해 데이터를 가져오는 중 오류가 발생했습니다."
      reset={reset}
    />
  );
}