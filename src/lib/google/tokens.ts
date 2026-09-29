import "server-only";
import { decryptSecret, encryptSecret } from "../crypto";
import { hasScopes } from "../env";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "../env.server";
import { createAdminSupabase } from "../supabase/admin";

export type ReconnectReason = "not_connected" | "invalid_grant" | "missing_scopes";

/** Thrown when the user must sign in with Google again (no token / expired / new scopes needed). */
export class ReconnectRequiredError extends Error {
  constructor(public reason: ReconnectReason) {
    super(reason);
  }
}

type Cached = { token: string; scopes: string; expiresAt: number };
// Short-lived access tokens cached per server instance.
const accessCache = new Map<string, Cached>();

export async function saveRefreshToken(userId: string, email: string, refreshToken: string, scopes: string) {
  const admin = createAdminSupabase();
  const { error } = await admin.from("google_tokens").upsert(
    {
      user_id: userId,
      google_email: email,
      refresh_token_enc: encryptSecret(refreshToken),
      scopes,
      obtained_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Saving Google token failed: ${error.message}`);
  accessCache.delete(userId);
}

/** Scopes actually granted to an access token (the user may untick boxes on Google's consent screen). */
export async function grantedScopesOf(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { scope?: string };
    return json.scope ?? null;
  } catch {
    return null;
  }
}

async function deleteToken(userId: string) {
  accessCache.delete(userId);
  const admin = createAdminSupabase();
  await admin.from("google_tokens").delete().eq("user_id", userId);
}

/**
 * Returns a valid Google access token that carries all `required` scopes,
 * refreshing it with the stored (encrypted) refresh token when needed.
 */
export async function getGoogleAccessToken(userId: string, required: string[] = []): Promise<string> {
  const cached = accessCache.get(userId);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    if (!hasScopes(cached.scopes, required)) throw new ReconnectRequiredError("missing_scopes");
    return cached.token;
  }

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("google_tokens")
    .select("refresh_token_enc, scopes")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Reading Google token failed: ${error.message}`);
  if (!data) throw new ReconnectRequiredError("not_connected");
  // Fast path: stored grant is known to lack a scope (e.g. token from before Calendar/Tasks were added).
  if (!hasScopes(data.scopes, required)) throw new ReconnectRequiredError("missing_scopes");

  const refreshToken = decryptSecret(data.refresh_token_enc);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    if (json.error === "invalid_grant") {
      // Expired (7-day Testing-mode limit) or revoked → force a fresh Google sign-in.
      await deleteToken(userId);
      throw new ReconnectRequiredError("invalid_grant");
    }
    throw new Error(`Google token refresh failed: ${json.error ?? res.status} ${json.error_description ?? ""}`);
  }

  // Google reports the scopes actually attached to the grant – keep the DB in sync.
  const scopes = json.scope ?? data.scopes;
  if (json.scope && json.scope !== data.scopes) {
    await admin.from("google_tokens").update({ scopes: json.scope }).eq("user_id", userId);
  }
  accessCache.set(userId, {
    token: json.access_token,
    scopes,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  });
  if (!hasScopes(scopes, required)) throw new ReconnectRequiredError("missing_scopes");
  return json.access_token;
}

export function invalidateAccessToken(userId: string) {
  accessCache.delete(userId);
}
