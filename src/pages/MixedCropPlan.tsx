import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Coins, Droplets, Leaf, Loader2, ShieldCheck, Sprout } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BackButton } from "@/components/BackButton";
import { ChatbotFAB } from "@/components/ChatbotFAB";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LanguageProvider";

type Rule = {
  id: string;
  primary_crop: string;
  companion_crop: string;
  soil_types: string[];
  weather: string;
  min_land_acres: number;
  existing_crop: string | null;
  compatibility_score: number;
  benefits: string[];
  principles: string[];
  notes: string;
  source: string;
};

const soils = ["loamy", "sandy loam", "clay", "alluvial", "black soil", "red soil", "waterlogged"];
const weathers = ["any", "warm", "cool", "humid"];

export default function MixedCropPlan() {
  const { t } = useLang();
  const [rules, setRules] = useState<Rule[]>([]);
  const [soil, setSoil] = useState("loamy");
  const [weather, setWeather] = useState("warm");
  const [land, setLand] = useState("1");
  const [existing, setExisting] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("mixed_crop_rules")
        .select("id,primary_crop,companion_crop,soil_types,weather,min_land_acres,existing_crop,compatibility_score,benefits,principles,notes,source")
        .order("compatibility_score", { ascending: false });
      setRules(data ?? []);
      setLoading(false);
    })();
  }, []);

  const matches = useMemo(() => {
    const acres = Number(land) || 0;
    const crop = existing.trim().toLowerCase();
    return rules
      .map((r) => {
        let score = r.compatibility_score;
        if (r.soil_types.includes(soil)) score += 6;
        if (r.weather === weather || r.weather === "any") score += 5;
        if (acres >= Number(r.min_land_acres)) score += 4;
        if (crop && [r.primary_crop, r.companion_crop, r.existing_crop ?? ""].some((x) => x.toLowerCase().includes(crop))) score += 8;
        return { ...r, matchScore: Math.min(100, score) };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);
  }, [existing, land, rules, soil, weather]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container flex-1 space-y-6 py-6">
        <BackButton to="/dashboard" />
        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-primary">{t("mixed_crop_planning")}</p>
              <h1 className="font-display text-3xl font-extrabold">Smart crop combinations</h1>
              <p className="mt-2 text-sm text-muted-foreground">Match soil, weather, land size, and existing crop to practical mixed-cropping systems.</p>
            </div>
            <Card className="rounded-3xl p-5 shadow-soft">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Soil type</Label><Select value={soil} onValueChange={setSoil}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{soils.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Weather</Label><Select value={weather} onValueChange={setWeather}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{weathers.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Land size (acres)</Label><Input inputMode="decimal" value={land} onChange={(e) => setLand(e.target.value)} /></div>
                <div className="space-y-2"><Label>Existing crop (optional)</Label><Input value={existing} onChange={(e) => setExisting(e.target.value)} placeholder="Maize, Rice, Wheat..." /></div>
              </div>
            </Card>
          </div>

          <Card className="rounded-3xl border-primary/20 bg-primary/5 p-5">
            <h2 className="font-display text-xl font-bold">Planning principles</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Principle icon={Sprout} title="Legume support" body="Include cowpea, gram, soybean, green gram, or pigeonpea for nitrogen." />
              <Principle icon={Leaf} title="Tall + short" body="Pair different heights so crops share sunlight without heavy competition." />
              <Principle icon={Droplets} title="Root balance" body="Combine deep and shallow roots to use different soil layers." />
              <Principle icon={Coins} title="Dual income" body="Use one main crop plus one short-duration or high-value crop." />
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold">Recommended combinations</h2>
          {loading ? <Card className="p-6 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></Card> : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {matches.map((r) => <CropPairCard key={r.id} rule={r as Rule & { matchScore: number }} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
      <ChatbotFAB />
    </div>
  );
}

function CropPairCard({ rule }: { rule: Rule & { matchScore: number } }) {
  return (
    <Card className="overflow-hidden rounded-3xl shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="bg-hero p-5 text-primary-foreground">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase opacity-80">Crop pair</p><h3 className="font-display text-2xl font-extrabold">{rule.primary_crop} + {rule.companion_crop}</h3></div>
          <ShieldCheck className="h-8 w-8 shrink-0" />
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div><div className="mb-1 flex justify-between text-sm font-semibold"><span>Compatibility</span><span>{rule.matchScore}%</span></div><Progress value={rule.matchScore} className="h-2" /></div>
        <p className="text-sm text-muted-foreground">{rule.notes}</p>
        <div className="flex flex-wrap gap-2">{rule.benefits.map((b) => <span key={b} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{b}</span>)}</div>
        <div className="rounded-2xl border bg-muted/40 p-3 text-xs text-muted-foreground"><AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-warning" /> Source: {rule.source}</div>
      </div>
    </Card>
  );
}

function Principle({ icon: Icon, title, body }: { icon: typeof Sprout; title: string; body: string }) {
  return <div className="flex gap-3 rounded-2xl bg-background/80 p-3"><Icon className="h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold">{title}</p><p className="text-xs text-muted-foreground">{body}</p></div></div>;
}
