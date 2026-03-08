import { ApiError } from "@/lib/server/api-error";
import type { ZodType } from "zod";

export function parseSearchParams<T>(searchParams: URLSearchParams, schema: ZodType<T>): T {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);

  if (!result.success) {
    throw new ApiError(400, "INVALID_QUERY", "Invalid query parameters", result.error.flatten());
  }

  return result.data;
}