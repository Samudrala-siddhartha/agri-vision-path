import { supabase } from "@/integrations/supabase/client";

/**
 * Best-effort client-side activity logging.
 * Logs are also written server-side from edge functions; this captures pure-client actions.
 * Failures are swallowed — activity logging must never block UX.
 */
export async function logActivity(
  action: string,
  meta: Record<string, unknown> = {},
  status = 200,
  endpoint?: string,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from("user_activity_log").insert({
      user_id: user.id,
      action,
      endpoint: endpoint ?? (typeof window !== "undefined" ? window.location.pathname : null),
      status,
      meta,
    });
  } catch {
    /* ignore */
  }
}

/** Helpful wrapper: logs and returns whether the user has been flagged suspicious. */
export async function evaluateSuspicious(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await (supabase as any).rpc("evaluate_suspicious", { _user_id: user.id });
    return Boolean(data);
  } catch {
    return false;
  }
}
