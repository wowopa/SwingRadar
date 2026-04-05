function normalizeOrigin(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  return normalized.replace(/\/$/, "");
}

export function resolveAppOrigin(request?: Request) {
  const explicit = normalizeOrigin(process.env.SWING_RADAR_API_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL);
  if (explicit) {
    return explicit;
  }

  if (request) {
    return new URL(request.url).origin;
  }

  const vercelOrigin = normalizeOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (vercelOrigin) {
    return vercelOrigin;
  }

  return "http://localhost:3000";
}

export function buildAppUrl(pathname: string, request?: Request) {
  return new URL(pathname, resolveAppOrigin(request)).toString();
}
