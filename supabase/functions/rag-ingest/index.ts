import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBED_MODEL = "google/text-embedding-004"; // 768-dim

async function embed(text: string, key: string): Promise<number[]> {
  const r = await fetch(EMBED_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  });
  if (!r.ok) throw new Error(`embed failed ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.data[0].embedding;
}

function chunk(text: string, size = 900, overlap = 150): string[] {
  const out: string[] = [];
  const clean = text.replace(/\s+/g, " ").trim();
  for (let i = 0; i < clean.length; i += size - overlap) {
    out.push(clean.slice(i, i + size));
    if (i + size >= clean.length) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const mode = body.mode as "text" | "image" | "seed_blb";
    let inserted = 0;

    if (mode === "text") {
      const { crop, disease_key, lang = "en", source_url, title, content } = body;
      if (!crop || !content) throw new Error("crop and content required");
      const chunks = chunk(content);
      for (const c of chunks) {
        const emb = await embed(c, LOVABLE_API_KEY);
        await admin.from("rag_documents").insert({
          crop, disease_key, lang, source_url, title, chunk: c, embedding: emb as any,
        });
        inserted++;
      }
    } else if (mode === "image") {
      const { crop, disease_key, image_url } = body;
      if (!crop || !disease_key || !image_url) throw new Error("crop, disease_key, image_url required");
      // Embed by describing image features via the disease_key+crop text proxy
      const text = `${crop} ${disease_key} reference leaf image showing characteristic disease symptoms`;
      const emb = await embed(text, LOVABLE_API_KEY);
      await admin.from("rag_image_embeddings").insert({ crop, disease_key, image_url, embedding: emb as any });
      inserted++;
    } else if (mode === "seed_blb") {
      // Bulk-embed all existing BLB reference images
      const { data: imgs } = await admin.from("disease_reference_images").select("image_url,crop,disease_key").eq("disease_key", "bacterial_leaf_blight");
      for (const i of imgs ?? []) {
        const text = `${i.crop} bacterial leaf blight reference leaf image with water-soaked yellow lesions and wavy margins`;
        const emb = await embed(text, LOVABLE_API_KEY);
        await admin.from("rag_image_embeddings").insert({ crop: i.crop, disease_key: i.disease_key, image_url: i.image_url, embedding: emb as any });
        inserted++;
      }
    } else {
      throw new Error("invalid mode");
    }

    await admin.from("audit_log").insert({
      actor_id: userData.user.id, action: "rag_ingest", target: mode, meta: { inserted },
    });

    return new Response(JSON.stringify({ ok: true, inserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("rag-ingest error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
