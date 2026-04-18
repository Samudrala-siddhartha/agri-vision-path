import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Camera, Loader2, Upload, X, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Crop = "paddy" | "chili" | "wheat";
type Stage = "seedling" | "vegetative" | "flowering" | "maturity";

const NewScan = () => {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [crop, setCrop] = useState<Crop>("paddy");
  const [age, setAge] = useState(45);
  const [rained, setRained] = useState(false);
  const [stage, setStage] = useState<Stage>("vegetative");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).slice(0, 5);
    setFiles((prev) => [...prev, ...list].slice(0, 5));
  };

  const submit = async () => {
    if (!user) return;
    if (files.length === 0) return toast({ title: t("upload_at_least_one"), variant: "destructive" });
    setBusy(true);
    try {
      // Upload images
      const urls: string[] = [];
      const imagePayload: { mime_type: string; data: string }[] = [];
      for (const f of files) {
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${f.name}`;
        const { error: upErr } = await supabase.storage.from("scan-images").upload(path, f, { upsert: false });
        if (upErr) throw upErr;
        urls.push(path);
        const buf = await f.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        imagePayload.push({ mime_type: f.type || "image/jpeg", data: b64 });
      }

      // Diagnose
      const { data, error } = await supabase.functions.invoke("diagnose-crop", {
        body: { crop, interview: { age_days: age, rained_recently: rained, growth_stage: stage }, language: lang, images: imagePayload },
      });
      if (error) throw error;

      // Save scan
      const { data: scan, error: insErr } = await supabase
        .from("scans")
        .insert({
          user_id: user.id, crop, language: lang,
          interview: { age_days: age, rained_recently: rained, growth_stage: stage },
          image_urls: urls,
          diagnosis: data,
          disease_name: data?.disease_name ?? null,
          confidence: data?.confidence ?? null,
          severity: data?.severity ?? null,
        })
        .select("id").single();
      if (insErr) throw insErr;
      nav(`/scan/${scan.id}`);
    } catch (err: any) {
      console.error(err);
      toast({ title: err.message ?? t("scan_failed"), variant: "destructive" });
    } finally { setBusy(false); }
  };

  const cropCards: { c: Crop; emoji: string }[] = [
    { c: "paddy", emoji: "🌾" }, { c: "chili", emoji: "🌶️" }, { c: "wheat", emoji: "🌿" },
  ];
  const stages: Stage[] = ["seedling", "vegetative", "flowering", "maturity"];
  const steps = [t("step_crop"), t("step_context"), t("step_capture")];

  return (
    <div className="min-h-screen bg-soil">
      <AppHeader />
      <main className="container max-w-2xl py-8">
        <div className="mb-6">
          <Progress value={((step + 1) / 3) * 100} className="h-2" />
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Step {step + 1} of 3 · {steps[step]}</p>
        </div>

        <Card className="p-6 shadow-elevated md:p-8">
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold">{t("step_crop")}</h2>
              <div className="grid grid-cols-3 gap-3">
                {cropCards.map(({ c, emoji }) => (
                  <button key={c} onClick={() => setCrop(c)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border-2 p-5 transition",
                      crop === c ? "border-primary bg-primary/10 shadow-soft" : "border-border hover:border-primary/50"
                    )}>
                    <span className="text-4xl">{emoji}</span>
                    <span className="font-semibold">{t(c)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold">{t("step_context")}</h2>
              <div className="space-y-3">
                <Label>{t("crop_age")}: <span className="font-bold text-primary">{age}</span></Label>
                <Slider value={[age]} onValueChange={(v) => setAge(v[0])} min={1} max={180} step={1} />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-4">
                <Label htmlFor="rain" className="cursor-pointer">{t("rained_recently")}</Label>
                <Switch id="rain" checked={rained} onCheckedChange={setRained} />
              </div>
              <div className="space-y-2">
                <Label>{t("growth_stage")}</Label>
                <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => <SelectItem key={s} value={s}>{t(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold">{t("step_capture")}</h2>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-10 text-center transition hover:bg-primary/10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-hero shadow-soft">
                  <Upload className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="font-semibold">{t("upload_photos")}</span>
                <span className="text-xs text-muted-foreground">Up to 5 images · JPG/PNG</span>
                <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={onPick} />
              </label>
              {files.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {files.map((f, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border">
                      <img src={URL.createObjectURL(f)} alt="preview" className="h-full w-full object-cover" />
                      <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 transition group-hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> {t("back")}
            </Button>
            {step < 2 ? (
              <Button onClick={() => setStep((s) => s + 1)} className="gap-2">
                {t("next")} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={busy} size="lg" className="gap-2 rounded-full px-6">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{t("diagnosing")}</> : <><Camera className="h-4 w-4" />{t("diagnose")}</>}
              </Button>
            )}
          </div>
        </Card>

        {busy && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse-soft">
            <Sprout className="h-4 w-4 text-primary" />
            {t("diagnosing")}
          </div>
        )}
      </main>
    </div>
  );
};

export default NewScan;
