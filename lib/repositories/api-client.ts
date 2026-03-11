interface FetchJsonOptions<T> {
  fallback?: () => Promise<T> | T;
  init?: RequestInit;
}

function resolveBaseUrl() {
  if (typeof window !== "undefined") {
    return "";
  }

  const explicit = process.env.SWING_RADAR_API_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return `https://${vercel}`;
  }

  return null;
}

export async function fetchJson<T>(path: string, options: FetchJsonOptions<T> = {}): Promise<T> {
  const baseUrl = resolveBaseUrl();

  if (!baseUrl) {
    if (options.fallback) {
      return await options.fallback();
    }

    throw new Error(`No API base URL available for ${path}`);
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options.init,
      headers: {
        "Content-Type": "application/json",
        ...(options.init?.headers ?? {})
      },
      cache: options.init?.cache ?? "no-store"
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (options.fallback) {
      return await options.fallback();
    }

    throw error;
  }
}
