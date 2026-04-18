import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Volume2, Beaker, Leaf, AlertTriangle, BookOpen, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AppHeader } from "@/components/AppHeader";
import { SeverityBadge } from "@/components/SeverityBadge";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LanguageProvider";
import { Lang } from "@/i18n/translations";

type Source = { title?: string; source_url?: string; disease_key?: string; snippet?: string };
type SimilarImg = { image_url: string; disease_key?: string; similarity?: number };

type Diagnosis = {
  disease_name: string;
  disease_name_localized?: Partial<Record<Lang, string>>;
  confidence: number;
  severity: string;
  summary: string;
  affected_regions: string[];
  remedies: { chemical: string[]; organic: string[] };
  warnings: string[];
  sources?: Source[];
  similar_images?: SimilarImg[];
};

const ScanResult = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, lang } = useLang();
  const [scan, setScan] = useState<any>(null);
  const [signed, setSigned] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("scans").select("*").eq("id", id).single();
      setScan(data);
      if (data?.image_urls?.length) {
        const out: string[] = [];
        for (const p of data.image_urls) {
          const { data: s } = await supabase.storage.from("scan-images").createSignedUrl(p, 3600);
          if (s?.signedUrl) out.push(s.signedUrl);
        }
        setSigned(out);
      }
    })();
  }, [id]);

  const d: Diagnosis | null = scan?.diagnosis ?? null;
  const localized = d?.disease_name_localized?.[lang] || d?.disease_name;

  const speak = () => {
    if (!d) return;
    const text = `${localized}. ${d.summary}. ${t("severity")}: ${d.severity}. ${d.remedies.chemical.join(". ")}`;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "hi" ? "hi-IN" : lang === "te" ? "te-IN" : "en-IN";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };

  if (!scan) return <div className="min-h-screen bg-soil"><AppHeader /><div className="container py-12 text-muted-foreground">…</div></div>;

  return (
    <div className="min-h-screen bg-soil">
      <AppHeader />
      <main className="container max-w-3xl space-y-6 py-8">
        <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="gap-2"><ArrowLeft className="h-4 w-4" />{t("back")}</Button>

        <Card className="overflow-hidden shadow-elevated">
          <div className="bg-hero p-6 text-primary-foreground">
            <p className="text-sm uppercase tracking-wide opacity-90">{t("diagnosis")}</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold">{localized}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <SeverityBadge severity={d?.severity} />
              {typeof d?.confidence === "number" && (
                <span className="rounded-full bg-background/20 px-3 py-1 text-xs font-semibold">
                  {t("confidence")}: {Math.round(d.confidence * 100)}%
                </span>
              )}
              <Button size="sm" variant="secondary" className="gap-2" onClick={speak}>
                <Volume2 className="h-4 w-4" />{t("read_aloud")}
              </Button>
            </div>
          </div>

          {signed.length > 0 && (
            <div className="grid grid-cols-2 gap-2 border-b bg-muted/30 p-3 sm:grid-cols-3">
              {signed.map((u, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-xl border bg-background">
                  <img src={u} alt={`scan-${i}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="p-6">
            <p className="mb-4 text-foreground/80">{d?.summary}</p>

            {d?.affected_regions?.length ? (
              <div className="mb-4 rounded-xl border bg-muted/30 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("affected_areas")}</p>
                <ul className="list-inside list-disc text-sm">
                  {d.affected_regions.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            ) : null}

            <Tabs defaultValue="chemical">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chemical" className="gap-2"><Beaker className="h-4 w-4" />{t("chemical")}</TabsTrigger>
                <TabsTrigger value="organic" className="gap-2"><Leaf className="h-4 w-4" />{t("organic")}</TabsTrigger>
                <TabsTrigger value="warnings" className="gap-2"><AlertTriangle className="h-4 w-4" />{t("warnings")}</TabsTrigger>
              </TabsList>
              <TabsContent value="chemical" className="space-y-2 pt-4">
                {d?.remedies?.chemical?.length ? d.remedies.chemical.map((r, i) => (
                  <div key={i} className="rounded-xl border bg-card p-3 text-sm">{r}</div>
                )) : <p className="text-sm text-muted-foreground">—</p>}
              </TabsContent>
              <TabsContent value="organic" className="space-y-2 pt-4">
                {d?.remedies?.organic?.length ? d.remedies.organic.map((r, i) => (
                  <div key={i} className="rounded-xl border bg-card p-3 text-sm">{r}</div>
                )) : <p className="text-sm text-muted-foreground">—</p>}
              </TabsContent>
              <TabsContent value="warnings" className="space-y-2 pt-4">
                {d?.warnings?.length ? d.warnings.map((r, i) => (
                  <div key={i} className="flex gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />{r}
                  </div>
                )) : <p className="text-sm text-muted-foreground">—</p>}
              </TabsContent>
            </Tabs>

            {(d?.sources?.length || d?.similar_images?.length) ? (
              <Accordion type="single" collapsible className="mt-6">
                {d?.sources?.length ? (
                  <AccordionItem value="sources">
                    <AccordionTrigger className="gap-2"><BookOpen className="h-4 w-4" />Knowledge sources ({d.sources.length})</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {d.sources.map((s, i) => (
                          <div key={i} className="rounded-xl border bg-muted/30 p-3 text-sm">
                            <p className="font-semibold">[{i + 1}] {s.title || s.disease_key || "Reference"}</p>
                            {s.snippet && <p className="mt-1 text-muted-foreground">{s.snippet}…</p>}
                            {s.source_url && (
                              <a href={s.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary underline">{s.source_url}</a>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ) : null}
                {d?.similar_images?.length ? (
                  <AccordionItem value="similar">
                    <AccordionTrigger className="gap-2"><Images className="h-4 w-4" />Similar reference images</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {d.similar_images.map((s, i) => (
                          <div key={i} className="overflow-hidden rounded-xl border bg-background">
                            <div className="aspect-square">
                              <img src={s.image_url} alt={s.disease_key ?? `ref-${i}`} loading="lazy" className="h-full w-full object-cover" />
                            </div>
                            <p className="px-2 py-1 text-[11px] text-muted-foreground">{s.disease_key} {typeof s.similarity === "number" ? `· ${Math.round(s.similarity * 100)}%` : ""}</p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ) : null}
              </Accordion>
            ) : null}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ScanResult;
