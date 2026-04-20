import { useState } from "react";
import { motion } from "framer-motion";
import { Sprout, Loader2, Droplets, Coins, AlertTriangle, ChevronRight, ChevronLeft, FlaskConical, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { ChatbotFAB } from "@/components/ChatbotFAB";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LanguageProvider";
import { toast } from "@/hooks/use-toast";

type Rec = {
  crop: string;
  suitability: number;
  votes: number;
  ideal: { N: number; P: number; K: number; ph: number };
  why?: string;
  risks?: string;
  fertilizer?: string;
  water_need?: "low" | "medium" | "high";
  profit_estimate_inr_per_acre?: string;
  rotation_note?: string;
};

const PREV_CROPS = ["rice", "wheat", "maize", "cotton", "sugarcane", "pulses", "vegetables", "fallow", "unknown"];

const CropPlan = () => {
  const { t, lang } = useLang();
  const [step, setStep] = useState(0);
  const [prev, setPrev] = useState("unknown");
  const [land, setLand] = useState(1);
  const [irrigation, setIrrigation] = useState("rainfed");
  const [n, setN] = useState(50);
  const [p, setP] = useState(50);
  const [k, setK] = useState(50);
  const [ph, setPh] = useState(6.5);
  const [temperature, setTemperature] = useState(25);
  const [humidity, setHumidity] = useState(60);
  const [rainfall, setRainfall] = useState(120);
  const [busy, setBusy] = useState(false);
  const [recs, setRecs] = useState<Rec[] | null>(null);

  const submit = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("recommend-crop", {
        body: { n, p, k, temperature, humidity, ph, rainfall, land_acres: land, irrigation, previous_crop: prev, language: lang },
      });
      if (error) throw error;
      setRecs(((data as any)?.recommendations ?? []) as Rec[]);
      setStep(3);
    } catch (e: any) {
      toast({ title: e?.message ?? "Failed", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const reset = () => { setRecs(null); setStep(0); };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container max-w-3xl flex-1 space-y-6 py-6">
        <BackButton to="/dashboard" />
        <div>
          <h1 className="font-display text-3xl font-extrabold">{t("crop_planning")}</h1>
          <Progress value={((step + 1) / 4) * 100} className="mt-3 h-2" />
        </div>

        {step === 0 && (
          <Card className="rounded-3xl p-6 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-bold">{t("prev_crop")}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PREV_CROPS.map(c => (
                <button
                  key={c}
                  onClick={() => setPrev(c)}
                  className={`rounded-2xl border-2 p-4 text-sm font-semibold capitalize transition ${prev === c ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}
                >
                  {c === "unknown" ? t("not_sure") : c}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button size="lg" onClick={() => setStep(1)} className="gap-2 rounded-full">{t("next")} <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="rounded-3xl p-6 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-bold">{t("land_size")} & {t("irrigation")}</h2>
            <div className="space-y-6">
              <div>
                <Label className="mb-2 block">{t("land_size")}: <span className="text-primary">{land.toFixed(1)}</span></Label>
                <Slider value={[land]} onValueChange={(v) => setLand(v[0])} min={0.25} max={20} step={0.25} />
              </div>
              <div>
                <Label className="mb-2 block">{t("irrigation")}</Label>
                <Select value={irrigation} onValueChange={setIrrigation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rainfed">{t("irr_rainfed")}</SelectItem>
                    <SelectItem value="canal">{t("irr_canal")}</SelectItem>
                    <SelectItem value="borewell">{t("irr_borewell")}</SelectItem>
                    <SelectItem value="drip">{t("irr_drip")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)} className="gap-2"><ChevronLeft className="h-4 w-4" /> {t("back")}</Button>
              <Button size="lg" onClick={() => setStep(2)} className="gap-2 rounded-full">{t("next")} <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="rounded-3xl p-6 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-bold">{t("soil_inputs")}</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <SliderRow label={`${t("nitrogen")}: ${n}`} value={n} setValue={setN} min={0} max={140} step={1} />
              <SliderRow label={`${t("phosphorus")}: ${p}`} value={p} setValue={setP} min={5} max={145} step={1} />
              <SliderRow label={`${t("potassium")}: ${k}`} value={k} setValue={setK} min={5} max={205} step={1} />
              <SliderRow label={`${t("ph_label")}: ${ph.toFixed(1)}`} value={ph} setValue={setPh} min={3.5} max={9.5} step={0.1} />
              <SliderRow label={`${t("temperature_label")}: ${temperature.toFixed(1)}`} value={temperature} setValue={setTemperature} min={5} max={45} step={0.5} />
              <SliderRow label={`${t("humidity_label")}: ${humidity}`} value={humidity} setValue={setHumidity} min={10} max={100} step={1} />
              <div className="sm:col-span-2">
                <SliderRow label={`${t("rainfall_label")}: ${rainfall}`} value={rainfall} setValue={setRainfall} min={20} max={300} step={5} />
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-2"><ChevronLeft className="h-4 w-4" /> {t("back")}</Button>
              <Button size="lg" onClick={submit} disabled={busy} className="gap-2 rounded-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}
                {t("recommend")}
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && recs && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">{t("recommendations")}</h2>
              <Button variant="outline" onClick={reset} className="rounded-full">Reset</Button>
            </div>
            {recs.length === 0 && <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">No matches.</Card>}
            {recs.map((r, idx) => (
              <motion.div key={r.crop} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
                <Card className="rounded-3xl p-5 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                        <Sprout className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-bold capitalize">{r.crop}</h3>
                        <p className="text-xs text-muted-foreground">{t("suitability")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl font-extrabold text-primary">{r.suitability}%</p>
                      <Progress value={r.suitability} className="mt-1 h-2 w-32" />
                    </div>
                  </div>
                  {r.why && <p className="mt-4 text-sm">{r.why}</p>}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {r.fertilizer && <InfoCell icon={FlaskConical} title={t("fertilizer")} body={r.fertilizer} />}
                    {r.water_need && <InfoCell icon={Droplets} title={t("water_need")} body={t(r.water_need as any)} />}
                    {r.profit_estimate_inr_per_acre && <InfoCell icon={Coins} title={t("profit_estimate")} body={`₹ ${r.profit_estimate_inr_per_acre}`} />}
                    {r.risks && <InfoCell icon={AlertTriangle} title={t("risks")} body={r.risks} tone="warn" />}
                    {r.rotation_note && <div className="sm:col-span-2"><InfoCell icon={RotateCw} title={t("rotation_warning")} body={r.rotation_note} /></div>}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <Footer />
      <ChatbotFAB />
    </div>
  );
};

function SliderRow({ label, value, setValue, min, max, step }: { label: string; value: number; setValue: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Slider value={[value]} onValueChange={(v) => setValue(v[0])} min={min} max={max} step={step} />
    </div>
  );
}

function InfoCell({ icon: Icon, title, body, tone }: { icon: any; title: string; body: string; tone?: "warn" }) {
  return (
    <div className={`flex gap-3 rounded-2xl border p-3 ${tone === "warn" ? "border-warning/40 bg-warning/5" : "bg-muted/40"}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 ${tone === "warn" ? "text-warning" : "text-primary"}`} />
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="text-sm">{body}</p>
      </div>
    </div>
  );
}

export default CropPlan;
