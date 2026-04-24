// Shared security helpers for edge functions: per-user rate limiting + activity logging.
// Best-effort: failures should not block the request, but rate-limit hits return a 429.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type RateLimitResult = { allowed: boolean; remaining?: number; reason?: string };

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getUserIdFromAuthHeader(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data } = await userClient.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Per-user rate limit. Falls back to IP if no user. Uses public.check_rate_limit. */
export async function rateLimit(
  sb: SupabaseClient,
  scope: string,
  identifier: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await sb.rpc("check_rate_limit", {
      _key: `${scope}:${identifier}`,
      _max: max,
      _window_seconds: windowSeconds,
    });
    if (error) return { allowed: true };
    return { allowed: Boolean(data), reason: data ? undefined : "Usage limit reached. Try later." };
  } catch {
    return { allowed: true };
  }
}

export async function logActivity(
  sb: SupabaseClient,
  userId: string | null,
  action: string,
  status: number,
  endpoint: string,
  meta: Record<string, unknown> = {},
  ip?: string | null,
) {
  try {
    if (!userId) return;
    await sb.from("user_activity_log").insert({
      user_id: userId,
      action,
      endpoint,
      status,
      meta,
      ip: ip ?? null,
    });
    // Heuristic suspicious detection (server-side, ignores errors).
    await sb.rpc("evaluate_suspicious", { _user_id: userId });
  } catch {
    /* ignore */
  }
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function rateLimitedResponse(corsHeaders: Record<string, string>, message = "Usage limit reached. Try later.") {
  return new Response(JSON.stringify({ error: message, code: "rate_limited" }), {
    status: 429,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
