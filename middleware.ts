import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_PREFIXES = [
  "/maintenance",
  "/admin",
  "/api/admin",
  "/api/health",
  "/_next",
  "/favicon.ico"
];

function isAllowedPath(pathname: string) {
  return ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

async function isMaintenanceEnabled(request: NextRequest) {
  if (process.env.SWING_RADAR_MAINTENANCE_MODE === "true") {
    return true;
  }

  try {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance-mode.json";
    url.searchParams.set("ts", String(Date.now()));

    const response = await fetch(url, {
      cache: "no-store"
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { enabled?: boolean };
    return payload.enabled === true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  if (!(await isMaintenanceEnabled(request))) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
