import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n/translations";

type Diagnosis = {
  disease_name?: string;
  disease_name_localized?: Partial<Record<Lang, string>>;
  summary?: string;
  affected_regions?: string[];
  remedies?: { chemical?: string[]; organic?: string[] };
  warnings?: string[];
  [k: string]: any;
};

const cache = new Map<string, Diagnosis>(); // key: scanId:lang

/** Returns the diagnosis localized to the active language. Auto-translates via edge function if needed. */
export function useLocalizedDiagnosis(scanId: string | undefined, source: Diagnosis | null, lang: Lang) {
  const [data, setData] = useState<Diagnosis | null>(source);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!source) { setData(null); return; }
    if (lang === "en") { setData(source); return; }

    const key = `${scanId ?? "x"}:${lang}`;
    if (cache.has(key)) { setData(cache.get(key)!); return; }

    // Build flat list of strings to translate, with stable indexing
    const items: string[] = [];
    const push = (s?: string) => { items.push(s ?? ""); };
    push(source.disease_name);
    push(source.summary);
    const affected = source.affected_regions ?? [];
    affected.forEach(push);
    const chem = source.remedies?.chemical ?? [];
    chem.forEach(push);
    const org = source.remedies?.organic ?? [];
    org.forEach(push);
    const warns = source.warnings ?? [];
    warns.forEach(push);

    let cancelled = false;
    setLoading(true);
    supabase.functions.invoke("translate-text", { body: { target: lang, items } })
      .then(({ data: res, error }) => {
        if (cancelled) return;
        if (error || !res?.translations) {
          setData(source);
          return;
        }
        const tr: string[] = res.translations;
        let i = 0;
        const localized: Diagnosis = { ...source };
        localized.disease_name = tr[i++] || source.disease_name;
        localized.summary = tr[i++] || source.summary;
        localized.affected_regions = affected.map(() => tr[i++] || "");
        localized.remedies = {
          chemical: chem.map(() => tr[i++] || ""),
          organic: org.map(() => tr[i++] || ""),
        };
        localized.warnings = warns.map(() => tr[i++] || "");
        // merge model-provided localized name if better
        const modelName = source.disease_name_localized?.[lang];
        if (modelName) localized.disease_name = modelName;
        cache.set(key, localized);
        setData(localized);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [scanId, source, lang]);

  return { data, loading };
}
