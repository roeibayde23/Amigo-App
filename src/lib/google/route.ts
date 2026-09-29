import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_MODE } from "../env";
import { gmailServerConfigured } from "../env.server";
import { createServerSupabase } from "../supabase/server";
import type { ApiError } from "../types";
import { GoogleApiError, GoogleAuthError } from "./api";
import { getGoogleAccessToken, invalidateAccessToken, ReconnectRequiredError } from "./tokens";

export type GoogleCtx = { token: string; userId: string; email: string | null; supabase: SupabaseClient };

export function apiJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
export function apiError(error: ApiError, status: number, reason?: string) {
  return apiJson({ ok: false, error, ...(reason ? { reason } : {}) }, status);
}

export class BadRequest extends Error {}

/**
 * Shared wrapper for every Google-backed route: auth check, config check, access token with the
 * required scopes, one retry on a revoked access token, and uniform error mapping.
 */
export async function withGoogle(required: string[], fn: (ctx: GoogleCtx) => Promise<Response>): Promise<Response> {
  if (DEMO_MODE) return apiError("demo", 400);
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return apiError("unauthorized", 401);
  if (!gmailServerConfigured()) return apiError("not_configured", 503);

  try {
    try {
      const token = await getGoogleAccessToken(user.id, required);
      return await fn({ token, userId: user.id, email: user.email ?? null, supabase });
    } catch (e) {
      if (!(e instanceof GoogleAuthError)) throw e;
      invalidateAccessToken(user.id);
      const token = await getGoogleAccessToken(user.id, required);
      return await fn({ token, userId: user.id, email: user.email ?? null, supabase });
    }
  } catch (e) {
    if (e instanceof ReconnectRequiredError) return apiError("reconnect", 409, e.reason);
    if (e instanceof BadRequest) return apiError("bad_request", 400, e.message);
    if (e instanceof GoogleApiError) {
      if (e.insufficientScope) return apiError("reconnect", 409, "missing_scopes");
      if (e.apiDisabled) return apiError("api_disabled", 503, e.message);
      if (e.status === 404 || e.status === 410) return apiError("not_found", 404);
      if (e.status === 400) return apiError("bad_request", 400, e.message);
    }
    console.error("[google] request failed:", e instanceof Error ? e.message : e);
    return apiError("google_failed", 502);
  }
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new BadRequest("invalid JSON body");
  }
}
