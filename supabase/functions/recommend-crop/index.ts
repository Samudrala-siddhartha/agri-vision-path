import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { clientIp, getServiceClient, getUserIdFromAuthHeader, logActivity, rateLimit, rateLimitedResponse } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type In = {
  n: number; p: number; k: number;
  temperature: number; humidity: number; ph: number; rainfall: number;
  land_acres?: number;
  irrigation?: string;
  previous_crop?: string;
  language?: "en" | "hi" | "te";
};

const num = (v: unknown, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await req.json()) as In;
    const params = {
      _n: num(body.n, 50), _p: num(body.p, 50), _k: num(body.k, 50),
      _temperature: num(body.temperature, 25),
      _humidity: num(body.humidity, 60),
      _ph: num(body.ph, 6.5),
      _rainfall: num(body.rainfall, 100),
      _knn: 25, _top: 3,
    };
    const lang = body.language === "hi" || body.language === "te" ? body.language : "en";
    const land = num(body.land_acres, 1);
    const irrigation = (body.irrigation ?? "rainfed").toString();
    const previous = (body.previous_crop ?? "unknown").toString();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const svc = getServiceClient();
    const ip = clientIp(req);
    const uid = await getUserIdFromAuthHeader(req);

    // Per-user rate limit: 15 plans per hour
    const rl = await rateLimit(svc, "plan", uid ?? `ip:${ip}`, 15, 3600);
    if (!rl.allowed) {
      await logActivity(svc, uid, "recommend_crop", 429, "/recommend-crop", {}, ip);
      return new Response(JSON.stringify({ error: "Usage limit reached. Try later.", code: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rows, error } = await supa.rpc("recommend_crops_knn", params);
    if (error) throw new Error(`knn: ${error.message}`);
    const top = (rows ?? []) as Array<{
      label: string; suitability: number; votes: number;
      avg_n: number; avg_p: number; avg_k: number; avg_ph: number;
      avg_temperature: number; avg_humidity: number; avg_rainfall: number;
    }>;

    if (top.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ask Gemini to enrich each recommendation with localized why/risks/fertilizer/water/profit/rotation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let enriched: Record<string, any> = {};
    if (LOVABLE_API_KEY) {
      const langName = lang === "hi" ? "Hindi" : lang === "te" ? "Telugu" : "English";
      const sys = `You are an agronomy assistant for small-holder Indian farmers. Reply ONLY with the requested tool call, in ${langName}. Be concise and actionable. Never invent prices — give realistic ranges in INR per acre.`;
      const userPayload = {
        soil: { N: params._n, P: params._p, K: params._k, ph: params._ph },
        climate: { temperature_c: params._temperature, humidity_pct: params._humidity, rainfall_mm: params._rainfall },
        land_acres: land,
        irrigation, previous_crop: previous,
        candidates: top.map(t => ({
          crop: t.label,
          suitability: t.suitability,
          ideal: { N: Math.round(t.avg_n), P: Math.round(t.avg_p), K: Math.round(t.avg_k), ph: Number(t.avg_ph.toFixed(1)) },
        })),
      };
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: `Given this farmer's context, write a short, actionable plan for each candidate crop:\n${JSON.stringify(userPayload)}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "crop_advice",
              description: "Return per-crop concise advice.",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        crop: { type: "string" },
                        why: { type: "string", description: "1-2 sentences why this crop fits" },
                        risks: { type: "string", description: "1-2 sentences on key risks" },
                        fertilizer: { type: "string", description: "Basal + top-dress hint, NPK kg/acre" },
                        water_need: { type: "string", enum: ["low", "medium", "high"] },
                        profit_estimate_inr_per_acre: { type: "string", description: "e.g. 25,000 - 45,000" },
                        rotation_note: { type: "string", description: "Brief rotation advice given previous crop" },
                      },
                      required: ["crop", "why", "risks", "fertilizer", "water_need", "profit_estimate_inr_per_acre", "rotation_note"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "crop_advice" } },
        }),
      });
      if (aiResp.ok) {
        const j = await aiResp.json();
        const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (args) {
          try {
            const parsed = JSON.parse(args);
            for (const it of parsed.items ?? []) enriched[String(it.crop).toLowerCase()] = it;
          } catch { /* ignore */ }
        }
      } else {
        console.error("ai gateway", aiResp.status, await aiResp.text());
      }
    }

    const recommendations = top.map(t => ({
      crop: t.label,
      suitability: Number(t.suitability),
      votes: t.votes,
      ideal: { N: Math.round(t.avg_n), P: Math.round(t.avg_p), K: Math.round(t.avg_k), ph: Number(t.avg_ph.toFixed(1)) },
      ...(enriched[t.label] ?? {}),
    }));

    await logActivity(svc, uid, "recommend_crop", 200, "/recommend-crop", { land_acres: land }, ip);
    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommend-crop", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
