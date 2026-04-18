// Translate arbitrary text into a target language using Lovable AI Gateway.
// Used by the client to localize already-generated diagnoses on language switch.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANG_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const target = String(body?.target ?? "en");
    const items = Array.isArray(body?.items) ? body.items : null;
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "items[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LANG_NAMES[target]) {
      return new Response(JSON.stringify({ error: "unsupported target" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cleanItems = items
      .map((s: unknown) => (typeof s === "string" ? s.slice(0, 4000) : ""))
      .filter((s: string) => s.length > 0)
      .slice(0, 30);
    if (cleanItems.length === 0) {
      return new Response(JSON.stringify({ translations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const sys = `You are a professional agriculture translator. Translate each input string into ${LANG_NAMES[target]} (script: native). Preserve numbers, units, chemical names, dosages and Latin scientific names verbatim. Keep tone simple for farmers. Return STRICT JSON: { "translations": string[] } in the SAME order and length as inputs. No commentary.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify({ inputs: cleanItems }) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: txt }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await res.json();
    const raw = j?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { translations?: string[] } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const out = Array.isArray(parsed.translations) ? parsed.translations : [];
    // pad to original length with originals as fallback
    const padded = cleanItems.map((s: string, i: number) => (typeof out[i] === "string" && out[i].trim() ? out[i] : s));
    return new Response(JSON.stringify({ translations: padded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
