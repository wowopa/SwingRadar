import { timingSafeEqual } from "crypto";

import { ApiError } from "@/lib/server/api-error";

function normalizeBearerToken(header: string | null) {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

export function assertAdminRequest(request: Request) {
  const expected = process.env.SWING_RADAR_ADMIN_TOKEN?.trim();
  if (!expected) {
    throw new ApiError(500, "ADMIN_TOKEN_NOT_CONFIGURED", "SWING_RADAR_ADMIN_TOKEN is not configured");
  }

  const received = normalizeBearerToken(request.headers.get("authorization"));
  if (!received) {
    throw new ApiError(401, "ADMIN_UNAUTHORIZED", "Missing or invalid authorization header");
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new ApiError(403, "ADMIN_FORBIDDEN", "Admin token validation failed");
  }
}
