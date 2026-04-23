import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/i18n/translations";

const cache = new Map<string, string[]>();

export function useLocalizedStrings(items: string[], lang: Lang, cacheKey: string) {
  const normalized = useMemo(() => items.map((item) => item ?? ""), [items]);
  const [translated, setTranslated] = useState<string[]>(normalized);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lang === "en") {
      setTranslated(normalized);
      return;
    }

    const key = `${cacheKey}:${lang}:${JSON.stringify(normalized)}`;
    if (cache.has(key)) {
      setTranslated(cache.get(key)!);
      return;
    }

    const indexed = normalized
      .map((text, index) => ({ text, index }))
      .filter((item) => item.text.trim().length > 0)
      .slice(0, 30);

    if (!indexed.length) {
      setTranslated(normalized);
      return;
    }

    let cancelled = false;
    setLoading(true);
    supabase.functions.invoke("translate-text", { body: { target: lang, items: indexed.map((item) => item.text) } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !Array.isArray(data?.translations)) {
          setTranslated(normalized);
          return;
        }
        const next = [...normalized];
        indexed.forEach((item, i) => {
          next[item.index] = data.translations[i] || item.text;
        });
        cache.set(key, next);
        setTranslated(next);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [cacheKey, lang, normalized]);

  return { items: translated, loading };
}
