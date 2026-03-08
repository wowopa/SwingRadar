"use client";

import { RouteErrorState } from "@/components/shared/route-error-state";

export default function TrackingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      title="사후 추적 워크스페이스를 불러오지 못했습니다"
      description="신호 이력이나 상세 드릴다운 데이터를 가져오는 중 문제가 발생했습니다."
      reset={reset}
    />
  );
}