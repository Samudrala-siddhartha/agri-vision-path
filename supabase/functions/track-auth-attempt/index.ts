// Logs login attempts (success/failure) for admin monitoring.
// Called from the client right before/after supabase.auth.signInWithPassword.
import { clientIp, getServiceClient } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, success } = await req.json();
    if (typeof email !== "string" || !email) {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const svc = getServiceClient();
    const ip = clientIp(req);
    const ua = req.headers.get("user-agent") ?? "";
    await svc.from("login_attempts").insert({
      email: email.toLowerCase().slice(0, 320),
      success: Boolean(success),
      ip,
      user_agent: ua.slice(0, 500),
    });
    // If 5+ failed attempts in last 10 min for same email, flag any matching profile as suspicious.
    if (!success) {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await svc
        .from("login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("email", email.toLowerCase())
        .eq("success", false)
        .gt("created_at", since);
      if ((count ?? 0) >= 5) {
        // best-effort: profile may not exist
        await svc
          .from("profiles")
          .update({ suspicious: true, suspicious_reason: `5+ failed logins in 10m`, suspicious_at: new Date().toISOString() })
          .eq("display_name", email);
      }
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
