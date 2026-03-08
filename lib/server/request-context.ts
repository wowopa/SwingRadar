import { randomUUID } from "crypto";

export interface RequestContext {
  requestId: string;
  startedAt: number;
}

export function getRequestContext(request: Request): RequestContext {
  return {
    requestId: request.headers.get("x-request-id") ?? randomUUID(),
    startedAt: Date.now()
  };
}
