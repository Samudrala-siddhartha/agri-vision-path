import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_NAMES: Record<string, string> = { en: "English", hi: "Hindi (हिन्दी)", te: "Telugu (తెలుగు)" };
const EMBED_MODEL = "google/text-embedding-004";

async function embed(text: string, key: string): Promise<number[] | null> {
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.data[0].embedding;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Rate limit best-effort by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await sb.rpc("check_rate_limit", { _key: `diagnose:${ip}`, _max: 20, _window_seconds: 60 });

    const { crop, interview, language = "en", images } = await req.json();
    if (!crop || !images?.length) {
      return new Response(JSON.stringify({ error: "crop and images required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: refs } = await sb
      .from("disease_reference")
      .select("disease_key,name_en,name_hi,name_te,description,visual_signs,typical_severity")
      .eq("crop", crop);

    const taxonomy = (refs ?? []).map((r) =>
      `- ${r.disease_key}: ${r.name_en} (HI: ${r.name_hi ?? "-"}, TE: ${r.name_te ?? "-"}). Signs: ${r.visual_signs}. Typical severity: ${r.typical_severity}.`
    ).join("\n");

    // ---------- RAG retrieval ----------
    const interviewText = typeof interview === "object" ? JSON.stringify(interview) : String(interview ?? "");
    const queryText = `Crop ${crop}. Symptoms and context: ${interviewText}`;
    const qEmb = await embed(queryText, LOVABLE_API_KEY);

    let ragText: any[] = [];
    let ragImages: any[] = [];
    if (qEmb) {
      const [{ data: txt }, { data: img }] = await Promise.all([
        sb.rpc("match_rag_documents", { query_embedding: qEmb as any, match_crop: crop, match_count: 5 }),
        sb.rpc("match_rag_images", { query_embedding: qEmb as any, match_crop: crop, match_count: 4 }),
      ]);
      ragText = txt ?? [];
      ragImages = img ?? [];
    }

    const ragContext = ragText.length
      ? ragText.map((d: any, i: number) => `[${i + 1}] (${d.disease_key ?? "general"}) ${d.title ?? ""}\n${d.chunk}\nSource: ${d.source_url ?? "internal"}`).join("\n\n")
      : "(no retrieved passages)";

    const systemPrompt = `You are AgriPulse, an expert plant pathologist for Indian smallholder farmers.
You diagnose crop diseases from leaf/plant photos. You ALWAYS respond by calling the report_diagnosis tool.

Crop being analyzed: ${crop}
Farmer interview: ${interviewText}
Output language: ${LANG_NAMES[language] || "English"} for all human-readable text fields. Disease name should be canonical English PLUS localized in disease_name_localized.

Reference taxonomy:
${taxonomy || "(no taxonomy)"}

Retrieved knowledge passages (cite indexes [1], [2] in summary when used):
${ragContext}

Rules:
- Be concise, practical, farmer-friendly. Use simple words.
- Provide specific dosages where safe.
- 2-3 chemical, 2-3 organic remedies when applicable.
- severity: none|low|medium|high. confidence: 0..1.
- Healthy leaf -> severity "none", remedies empty.
- Populate sources_used with the indexes you actually relied on.`;

    const tools = [{
      type: "function",
      function: {
        name: "report_diagnosis",
        description: "Return the structured crop diagnosis.",
        parameters: {
          type: "object",
          properties: {
            disease_name: { type: "string" },
            disease_name_localized: {
              type: "object",
              properties: { en: { type: "string" }, hi: { type: "string" }, te: { type: "string" } },
              required: ["en", "hi", "te"], additionalProperties: false,
            },
            confidence: { type: "number" },
            severity: { type: "string", enum: ["none", "low", "medium", "high"] },
            summary: { type: "string" },
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
            sources_used: { type: "array", items: { type: "integer" } },
          },
          required: ["disease_name", "disease_name_localized", "confidence", "severity", "summary", "affected_regions", "remedies", "warnings", "sources_used"],
          additionalProperties: false,
        },
      },
    }];

    const userContent: any[] = [
      { type: "text", text: `Diagnose this ${crop} from photo(s) and context. Use retrieved passages where helpful. Respond by calling report_diagnosis.` },
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
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await aiResp.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      console.error("No tool call", JSON.stringify(json).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI did not return structured diagnosis" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const args = JSON.parse(call.function.arguments);

    // Attach sources for UI display
    const usedIdx: number[] = Array.isArray(args.sources_used) ? args.sources_used : [];
    const sources = usedIdx
      .map((i) => ragText[i - 1])
      .filter(Boolean)
      .map((d: any) => ({ title: d.title, source_url: d.source_url, disease_key: d.disease_key, snippet: String(d.chunk).slice(0, 240) }));
    args.sources = sources;
    args.similar_images = ragImages.slice(0, 4).map((i: any) => ({ image_url: i.image_url, disease_key: i.disease_key, similarity: i.similarity }));

    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("diagnose-crop error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
