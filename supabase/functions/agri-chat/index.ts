import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { clientIp, getServiceClient, getUserIdFromAuthHeader, logActivity, rateLimit, rateLimitedResponse } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Msg = { role: "user" | "assistant"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { messages, language } = (await req.json()) as { messages: Msg[]; language?: string };
    const lang = language === "hi" || language === "te" ? language : "en";
    const langName = lang === "hi" ? "Hindi" : lang === "te" ? "Telugu" : "English";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const svc = getServiceClient();

    const ip = clientIp(req);
    const uid = await getUserIdFromAuthHeader(req);

    // Per-user rate limit: 20 chatbot turns per hour
    const rl = await rateLimit(svc, "chat", uid ?? `ip:${ip}`, 20, 3600);
    if (!rl.allowed) {
      await logActivity(svc, uid, "agri_chat", 429, "/agri-chat", {}, ip);
      return rateLimitedResponse(corsHeaders);
    }

    // Pull farmer context from auth header
    let context = "No user context available.";
    if (uid) {
      {
        const [{ data: fields }, { data: scans }] = await Promise.all([
          supa.from("fields").select("name,crop,location").eq("user_id", uid).limit(10),
          supa.from("scans").select("crop,disease_name,severity,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
        ]);
        context = JSON.stringify({ fields: fields ?? [], recent_scans: scans ?? [] });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys = `You are AgriPulse Assistant, a controlled in-app helper for an Indian farmer.
RULES:
- Reply ONLY in ${langName}.
- Use ONLY the supplied user context and well-known agronomy facts. Do not fabricate diagnoses, prices, or scan history.
- If the user asks about something you cannot verify (e.g. "what disease is on my plant right now?"), reply: "I don't have enough data to answer that — please run a Scan."
- Suggest in-app actions when relevant: Scan Crop (/scan/new), Plan Crop (/plan), View History (/dashboard), Raise Ticket (/tickets/new).
- Keep responses under 6 sentences. Use simple words.

USER CONTEXT (JSON):
${context}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, ...messages],
        stream: true,
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit, please retry in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok || !resp.body) {
      const t = await resp.text();
      console.error("ai gateway", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agri-chat", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
