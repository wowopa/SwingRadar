import { NextResponse } from "next/server";

import { isApiError } from "@/lib/server/api-error";

export interface ResponseMeta {
  status?: number;
  requestId: string;
  cacheSeconds?: number;
  durationMs?: number;
}

export function jsonOk<T>(data: T, options: ResponseMeta) {
  const response = NextResponse.json(data, { status: options.status ?? 200 });
  response.headers.set("x-request-id", options.requestId);
  response.headers.set("cache-control", `public, s-maxage=${options.cacheSeconds ?? 30}, stale-while-revalidate=60`);
  if (typeof options.durationMs === "number") {
    response.headers.set("server-timing", `app;dur=${options.durationMs}`);
  }
  return response;
}

export function jsonError(error: unknown, requestId: string) {
  if (isApiError(error)) {
    const response = NextResponse.json(
      {
        message: error.message,
        code: error.code,
        requestId,
        details: error.details
      },
      { status: error.status }
    );
    response.headers.set("x-request-id", requestId);
    response.headers.set("cache-control", "no-store");
    return response;
  }

  const response = NextResponse.json(
    {
      message: "Unexpected server error",
      code: "INTERNAL_SERVER_ERROR",
      requestId
    },
    { status: 500 }
  );
  response.headers.set("x-request-id", requestId);
  response.headers.set("cache-control", "no-store");
  return response;
}
