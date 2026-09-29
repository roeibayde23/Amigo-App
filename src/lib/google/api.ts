import "server-only";

/** 401 from Google: access token rejected (revoked) – caller may refresh once and retry. */
export class GoogleAuthError extends Error {}

/** Any other non-2xx from a Google API. */
export class GoogleApiError extends Error {
  constructor(
    public status: number,
    public reason: string,
    message: string,
  ) {
    super(message);
  }
  get insufficientScope() {
    return this.status === 403 && /insufficient|SCOPE_INSUFFICIENT|insufficientPermissions/i.test(this.reason + this.message);
  }
  get apiDisabled() {
    return this.status === 403 && /accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/i.test(this.reason + this.message);
  }
}

type GoogleErrorBody = {
  error?: {
    message?: string;
    status?: string;
    errors?: { reason?: string }[];
    details?: { reason?: string }[];
  };
};

export async function googleFetch<T>(accessToken: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (res.status === 401) throw new GoogleAuthError("Google rejected the access token");
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GoogleErrorBody;
    const reason =
      body.error?.errors?.[0]?.reason ?? body.error?.details?.find((d) => d.reason)?.reason ?? body.error?.status ?? "";
    throw new GoogleApiError(res.status, reason, body.error?.message ?? `Google API ${res.status}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
