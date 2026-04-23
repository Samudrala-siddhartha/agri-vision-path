import { Link } from "react-router-dom";
import { Camera, Languages, History, ShieldCheck, Sprout, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { TiltCard } from "@/components/TiltCard";
import { LANGS } from "@/i18n/translations";
import landingHero from "@/assets/agritech-hero.jpg";

const Landing = () => {
  const { t, lang, setLang } = useLang();
  return (
    <div className="flex min-h-screen flex-col bg-soil">
      <AppHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
          <img src={landingHero} alt="Smart crop monitoring in a green field" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-foreground/65" />
          <div className="container relative flex min-h-[calc(100vh-4rem)] items-center py-16 md:py-20">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-background/15 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
                <Sprout className="h-3.5 w-3.5 text-primary-foreground" />
                AI Crop Doctor · Paddy · Chili · Wheat
              </div>
              <h1 className="font-display text-5xl font-extrabold leading-tight text-primary-foreground md:text-7xl">
                {t("app_name")}
              </h1>
              <p className="max-w-xl font-display text-2xl font-bold leading-snug text-primary-foreground md:text-4xl">{t("app_tagline")}</p>
              <p className="max-w-xl text-lg text-primary-foreground/85">{t("hero_subtitle")}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full px-7 hover-scale">
                  <Link to="/auth" className="gap-2">{t("get_started")} <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center gap-1 rounded-full border border-primary-foreground/25 bg-background/15 p-1 backdrop-blur">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${lang === l.code ? "bg-primary text-primary-foreground shadow-soft" : "text-primary-foreground/80 hover:text-primary-foreground"}`}
                    >
                      {l.native}
                    </button>
                  ))}
                </div>
              </div>
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
