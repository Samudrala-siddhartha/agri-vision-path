import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Volume2, VolumeX, Beaker, Leaf, AlertTriangle, BookOpen, Images, LifeBuoy, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { SeverityBadge } from "@/components/SeverityBadge";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LanguageProvider";
import { Lang } from "@/i18n/translations";
import { useLocalizedDiagnosis } from "@/hooks/useTranslateDiagnosis";
import { useSpeak } from "@/hooks/useSpeak";
import { Link } from "react-router-dom";

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
  const { t, lang } = useLang();
  const [scan, setScan] = useState<any>(null);
  const [signed, setSigned] = useState<string[]>([]);
  const { speak, stop, speaking } = useSpeak();

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

  const source: Diagnosis | null = scan?.diagnosis ?? null;
  const { data: d, loading: translating } = useLocalizedDiagnosis(id, source as any, lang);

  const onSpeak = () => {
    if (!d) return;
    if (speaking) { stop(); return; }
    const parts: string[] = [];
    parts.push(`${t("diagnosis")}: ${d.disease_name}.`);
    if (d.summary) parts.push(d.summary);
    parts.push(`${t("severity")}: ${t((d.severity?.toLowerCase() ?? "low") as any)}.`);
    if (d.remedies?.chemical?.length) {
      parts.push(`${t("chemical")}: ${d.remedies.chemical.slice(0, 3).join(". ")}.`);
    }
    if (d.remedies?.organic?.length) {
      parts.push(`${t("organic")}: ${d.remedies.organic.slice(0, 2).join(". ")}.`);
    }
    if (d.warnings?.length) {
      parts.push(`${t("warnings")}: ${d.warnings.slice(0, 2).join(". ")}.`);
    }
    speak(parts.join(" "), lang);
  };

  if (!scan) return (
    <div className="flex min-h-screen flex-col bg-soil"><AppHeader /><div className="container flex-1 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div><Footer /></div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-soil">
      <AppHeader />
      <main className="container max-w-3xl flex-1 space-y-6 py-8">
        <div className="flex items-center justify-between gap-2">
          <BackButton />
          <Link to={`/tickets/new`}>
            <Button variant="outline" size="sm" className="gap-2">
              <LifeBuoy className="h-4 w-4" /> {t("raise_ticket")}
            </Button>
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden shadow-elevated">
            <div className="bg-hero p-6 text-primary-foreground">
              <p className="text-sm uppercase tracking-wide opacity-90">{t("diagnosis")}</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold">
                {d?.disease_name ?? "—"}
                {translating && <Loader2 className="ml-2 inline h-4 w-4 animate-spin opacity-70" />}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <SeverityBadge severity={d?.severity} />
                {typeof d?.confidence === "number" && (
                  <span className="rounded-full bg-background/20 px-3 py-1 text-xs font-semibold">
                    {t("confidence")}: {Math.round(d.confidence * 100)}%
                  </span>
                )}
                <Button size="sm" variant="secondary" className="gap-2" onClick={onSpeak}>
                  {speaking ? <><VolumeX className="h-4 w-4" />{t("stop_reading")}</> : <><Volume2 className="h-4 w-4" />{t("read_aloud")}</>}
                </Button>
              </div>
            </div>

            {signed.length > 0 && (
              <div className="grid grid-cols-2 gap-2 border-b bg-muted/30 p-3 sm:grid-cols-3">
                {signed.map((u, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="aspect-square overflow-hidden rounded-xl border bg-background"
                  >
                    <img src={u} alt={`scan-${i}`} className="h-full w-full object-cover" />
                  </motion.div>
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

              {(source?.sources?.length || source?.similar_images?.length) ? (
                <Accordion type="single" collapsible className="mt-6">
                  {source?.sources?.length ? (
                    <AccordionItem value="sources">
                      <AccordionTrigger className="gap-2"><BookOpen className="h-4 w-4" />Knowledge sources ({source.sources.length})</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {source.sources.map((s, i) => (
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
                  {source?.similar_images?.length ? (
                    <AccordionItem value="similar">
                      <AccordionTrigger className="gap-2"><Images className="h-4 w-4" />Similar reference images</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {source.similar_images.map((s, i) => (
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
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default ScanResult;
