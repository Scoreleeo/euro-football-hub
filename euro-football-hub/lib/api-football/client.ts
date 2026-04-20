import "server-only";
import { config } from "@/lib/config";

export async function apiFootballFetch<T>(
  path: string,
  params?: Record<string, string | number>,
  revalidate = 60
): Promise<T> {
  const url = new URL(`${config.apiFootballBaseUrl}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": config.apiFootballKey,
    },
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}