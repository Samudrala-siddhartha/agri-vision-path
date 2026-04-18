import { Link } from "react-router-dom";
import { Camera, Languages, History, ShieldCheck, Sprout, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { TiltCard } from "@/components/TiltCard";
import { LANGS } from "@/i18n/translations";

const Landing = () => {
  const { t, lang, setLang } = useLang();
  return (
    <div className="flex min-h-screen flex-col bg-soil">
      <AppHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="container relative overflow-hidden py-16 md:py-24">
          {/* Decorative blobs */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
            animate={{ x: [0, 20, 0], y: [0, 10, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
            animate={{ x: [0, -20, 0], y: [0, -15, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <Sprout className="h-3.5 w-3.5 text-primary" />
                AI Crop Doctor · Paddy · Chili · Wheat
              </div>
              <h1 className="font-display text-4xl font-extrabold leading-tight text-foreground md:text-6xl">
                {t("app_tagline")}
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">{t("hero_subtitle")}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full px-7 hover-scale">
                  <Link to="/auth" className="gap-2">{t("get_started")} <ArrowRight className="h-4 w-4" /></Link>
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
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative perspective"
            >
              <div className="absolute -inset-6 rounded-[2rem] bg-hero opacity-20 blur-2xl" />
              <TiltCard className="relative rounded-[2rem] border bg-card p-6 shadow-elevated">
                <div className="flex items-center gap-3 border-b pb-4">
                  <motion.div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-hero"
                    animate={{ rotate: [0, -6, 0, 6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Camera className="h-5 w-5 text-primary-foreground" />
                  </motion.div>
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
              </TiltCard>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container grid gap-6 pb-20 md:grid-cols-4">
          {[
            { icon: Camera, title: t("feat_scan_title"), body: t("feat_scan_body") },
            { icon: Languages, title: t("feat_lang_title"), body: t("feat_lang_body") },
            { icon: History, title: t("feat_history_title"), body: t("feat_history_body") },
            { icon: ShieldCheck, title: t("feat_grounded_title"), body: t("feat_grounded_body") },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="perspective"
            >
              <TiltCard className="h-full rounded-2xl border bg-card p-5 shadow-soft">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1 font-display text-lg font-bold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </TiltCard>
            </motion.div>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
