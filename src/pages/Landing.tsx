import { Link } from "react-router-dom";
import { Camera, Languages, History, ShieldCheck, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";
import { AppHeader } from "@/components/AppHeader";
import { LANGS } from "@/i18n/translations";

const Landing = () => {
  const { t, lang, setLang } = useLang();
  return (
    <div className="min-h-screen bg-soil">
      <AppHeader />
      <main>
        {/* Hero */}
        <section className="container relative overflow-hidden py-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div className="animate-fade-in space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <Sprout className="h-3.5 w-3.5 text-primary" />
                AI Crop Doctor · Paddy · Chili · Wheat
              </div>
              <h1 className="font-display text-4xl font-extrabold leading-tight text-foreground md:text-6xl">
                {t("app_tagline")}
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Snap a leaf, get an instant diagnosis with chemical and organic remedies — in your language.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full px-7">
                  <Link to="/auth">{t("get_started")}</Link>
                </Button>
                <div className="flex items-center gap-1 rounded-full border bg-card/60 p-1 backdrop-blur">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${lang === l.code ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {l.native}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-hero opacity-20 blur-2xl" />
              <div className="relative rounded-[2rem] border bg-card p-6 shadow-elevated">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-hero">
                    <Camera className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Paddy · 42 days · Vegetative</p>
                    <p className="text-xs text-muted-foreground">Sample diagnosis</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3">
                    <span className="font-medium">Paddy Blast</span>
                    <span className="rounded-full bg-danger/15 px-3 py-1 text-xs font-bold text-danger">HIGH</span>
                  </div>
                  <div className="rounded-xl border p-3 text-sm">
                    <p className="font-semibold text-primary">Spray Tricyclazole 75% WP</p>
                    <p className="text-muted-foreground">0.6 g per litre · Avoid spraying before rain.</p>
                  </div>
                  <div className="rounded-xl border p-3 text-sm">
                    <p className="font-semibold text-primary">Organic alternative</p>
                    <p className="text-muted-foreground">Pseudomonas fluorescens 10 g/L; spray early morning.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container grid gap-6 pb-20 md:grid-cols-4">
          {[
            { icon: Camera, title: "Multimodal scan", body: "Photos analyzed by Gemini 2.5 Pro." },
            { icon: Languages, title: "Native languages", body: "English, Hindi, Telugu — voice readout." },
            { icon: History, title: "Field journey", body: "Track every scan, see trends over time." },
            { icon: ShieldCheck, title: "Grounded by data", body: "Reference taxonomy from real crop datasets." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-5 shadow-soft transition hover:shadow-elevated">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1 font-display text-lg font-bold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Landing;
