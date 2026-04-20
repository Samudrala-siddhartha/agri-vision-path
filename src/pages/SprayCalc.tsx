import { useMemo, useState } from "react";
import { Beaker, Droplets } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { ChatbotFAB } from "@/components/ChatbotFAB";
import { useLang } from "@/i18n/LanguageProvider";

const SprayCalc = () => {
  const { t } = useLang();
  const [chemical, setChemical] = useState("Mancozeb 75% WP");
  const [dose, setDose] = useState(2.0); // g or ml per litre
  const [waterPerAcre, setWaterPerAcre] = useState(200);
  const [land, setLand] = useState(1);

  const totals = useMemo(() => {
    const totalWater = land * waterPerAcre;
    const totalChem = totalWater * dose; // dose per litre
    return { totalWater, totalChem };
  }, [land, waterPerAcre, dose]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container max-w-2xl flex-1 space-y-6 py-6">
        <BackButton to="/dashboard" />
        <div>
          <h1 className="font-display text-3xl font-extrabold">{t("spray_calculator")}</h1>
          <p className="text-sm text-muted-foreground">Quick mix calculator for foliar sprays.</p>
        </div>

        <Card className="rounded-3xl p-6 shadow-soft">
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block">{t("chemical_label")}</Label>
              <Input value={chemical} onChange={(e) => setChemical(e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label className="mb-2 block">{t("land_size")}: <span className="text-primary">{land.toFixed(2)}</span></Label>
              <Slider value={[land]} onValueChange={(v) => setLand(v[0])} min={0.25} max={20} step={0.25} />
            </div>
            <div>
              <Label className="mb-2 block">{t("dose_per_acre")}: <span className="text-primary">{dose.toFixed(2)} g/ml per L</span></Label>
              <Slider value={[dose]} onValueChange={(v) => setDose(v[0])} min={0.25} max={10} step={0.25} />
            </div>
            <div>
              <Label className="mb-2 block">{t("water_per_acre")}: <span className="text-primary">{waterPerAcre} L</span></Label>
              <Slider value={[waterPerAcre]} onValueChange={(v) => setWaterPerAcre(v[0])} min={50} max={500} step={10} />
            </div>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="rounded-3xl border-primary/30 bg-primary/5 p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <Beaker className="h-7 w-7 text-primary" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("total_chemical")}</p>
                <p className="font-display text-2xl font-extrabold">{totals.totalChem.toFixed(0)} <span className="text-sm font-normal">g/ml</span></p>
                <p className="text-xs text-muted-foreground">{chemical}</p>
              </div>
            </div>
          </Card>
          <Card className="rounded-3xl border-secondary/60 bg-secondary/30 p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <Droplets className="h-7 w-7 text-primary" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("total_water")}</p>
                <p className="font-display text-2xl font-extrabold">{totals.totalWater.toFixed(0)} <span className="text-sm font-normal">L</span></p>
                <p className="text-xs text-muted-foreground">{land.toFixed(2)} ac × {waterPerAcre} L</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="rounded-2xl border-warning/40 bg-warning/5 p-4 text-xs text-foreground/80">
          ⚠️ Always read the chemical label. Wear gloves & mask. Avoid spraying in wind or hot midday sun. Keep away from children & water sources.
        </Card>
      </main>
      <Footer />
      <ChatbotFAB />
    </div>
  );
};

export default SprayCalc;
