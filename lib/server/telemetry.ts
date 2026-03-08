import { jsonError, type ResponseMeta } from "@/lib/server/api-response";
import type { RequestContext } from "@/lib/server/request-context";
import { getRequestContext } from "@/lib/server/request-context";

interface RouteTelemetryOptions {
  route: string;
}

export async function withRouteTelemetry(
  request: Request,
  options: RouteTelemetryOptions,
  handler: (context: RequestContext) => Promise<Response>
) {
  const context = getRequestContext(request);
  const startedAt = context.startedAt;

  try {
    const response = await handler(context);
    emitRouteLog({
      route: options.route,
      method: request.method,
      status: response.status,
      requestId: context.requestId,
      durationMs: Date.now() - startedAt,
      url: request.url
    });
    response.headers.set("x-request-id", context.requestId);
    return response;
  } catch (error) {
    emitRouteLog({
      route: options.route,
      method: request.method,
      status: 500,
      requestId: context.requestId,
      durationMs: Date.now() - startedAt,
      url: request.url,
      error: error instanceof Error ? error.message : String(error)
    });
    return jsonError(error, context.requestId);
  }
}

export function emitRouteLog(event: {
  route: string;
  method: string;
  status: number;
  requestId: string;
  durationMs: number;
  url: string;
  error?: string;
}) {
  console.info(
    JSON.stringify({
      scope: "api",
      timestamp: new Date().toISOString(),
      ...event
    })
  );
}

export function buildResponseMeta(context: RequestContext, cacheSeconds = 30): ResponseMeta {
  return {
    requestId: context.requestId,
    cacheSeconds,
    durationMs: Date.now() - context.startedAt
  };
}
