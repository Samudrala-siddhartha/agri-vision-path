import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_NAMES: Record<string, string> = { en: "English", hi: "Hindi (हिन्दी)", te: "Telugu (తెలుగు)" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { crop, interview, language = "en", images } = await req.json();
    if (!crop || !images?.length) {
      return new Response(JSON.stringify({ error: "crop and images required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull reference taxonomy for this crop
    const { data: refs } = await sb
      .from("disease_reference")
      .select("disease_key,name_en,name_hi,name_te,description,visual_signs,typical_severity")
      .eq("crop", crop);

    const taxonomy = (refs ?? []).map((r) =>
      `- ${r.disease_key}: ${r.name_en} (HI: ${r.name_hi ?? "-"}, TE: ${r.name_te ?? "-"}). Signs: ${r.visual_signs}. Typical severity: ${r.typical_severity}.`
    ).join("\n");

    const systemPrompt = `You are AgriPulse, an expert plant pathologist for Indian smallholder farmers.
You diagnose crop diseases from leaf/plant photos. You ALWAYS respond by calling the report_diagnosis tool.

Crop being analyzed: ${crop}
Farmer interview: ${JSON.stringify(interview)}
Output language: ${LANG_NAMES[language] || "English"} for all human-readable text fields (summary, remedies, warnings, affected_regions). Disease name should be the canonical English name PLUS a localized version in disease_name_localized.

Reference taxonomy (use these canonical names when matching):
${taxonomy || "(no taxonomy available)"}

Rules:
- Be concise, practical, farmer-friendly. Use simple words.
- Provide specific dosages where safe (e.g., "Tricyclazole 75% WP @ 0.6 g/L water").
- Include 2-3 chemical and 2-3 organic remedies when applicable.
- Severity is one of: none, low, medium, high.
- Confidence is 0..1.
- If the photo clearly shows a healthy leaf, set severity "none" and remedies empty.`;

    const tools = [{
      type: "function",
      function: {
        name: "report_diagnosis",
        description: "Return the structured crop diagnosis.",
        parameters: {
          type: "object",
          properties: {
            disease_name: { type: "string", description: "Canonical English disease name." },
            disease_name_localized: {
              type: "object",
              properties: { en: { type: "string" }, hi: { type: "string" }, te: { type: "string" } },
              required: ["en", "hi", "te"], additionalProperties: false,
            },
            confidence: { type: "number" },
            severity: { type: "string", enum: ["none", "low", "medium", "high"] },
            summary: { type: "string", description: "1-2 sentence summary in target language." },
            affected_regions: { type: "array", items: { type: "string" } },
            remedies: {
              type: "object",
              properties: {
                chemical: { type: "array", items: { type: "string" } },
                organic: { type: "array", items: { type: "string" } },
              },
              required: ["chemical", "organic"], additionalProperties: false,
            },
            warnings: { type: "array", items: { type: "string" } },
          },
          required: ["disease_name", "disease_name_localized", "confidence", "severity", "summary", "affected_regions", "remedies", "warnings"],
          additionalProperties: false,
        },
      },
    }];

    const userContent: any[] = [
      { type: "text", text: `Diagnose this ${crop} based on the photo(s) and interview context. Respond by calling report_diagnosis.` },
      ...images.map((img: any) => ({ type: "image_url", image_url: { url: `data:${img.mime_type};base64,${img.data}` } })),
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
        tools, tool_choice: { type: "function", function: { name: "report_diagnosis" } },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI gateway error", aiResp.status, text);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Please try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await aiResp.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      console.error("No tool call in response", JSON.stringify(json).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI did not return structured diagnosis" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const args = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("diagnose-crop error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
