"use client";

import { RouteErrorState } from "@/components/shared/route-error-state";

export default function TrackingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      title="지난 흐름 화면을 불러오지 못했습니다"
      description="종목이 이후 어떻게 움직였는지 가져오는 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요."
      reset={reset}
    />
  );
}
