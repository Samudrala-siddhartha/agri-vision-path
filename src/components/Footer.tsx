import { Link } from "react-router-dom";
import { Mail, Github, Twitter, Download, Globe2, MapPin, Phone } from "lucide-react";
import { useLang } from "@/i18n/LanguageProvider";
import appLogo from "@/assets/app-logo.png";

export function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t bg-card/50 backdrop-blur">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <img src={appLogo} alt="AgriPulse logo" className="h-10 w-10 rounded-2xl object-cover shadow-soft" />
            <span className="font-display text-lg font-bold">{t("app_name")}</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">{t("hero_subtitle")}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border bg-background/60 px-2 py-1"><Globe2 className="h-3 w-3" /> EN · हिन्दी · తెలుగు</span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background/60 px-2 py-1"><Download className="h-3 w-3" /> PWA · Offline</span>
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("product")}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/dashboard" className="story-link text-foreground/80 hover:text-foreground">{t("dashboard")}</Link></li>
            <li><Link to="/scan/new" className="story-link text-foreground/80 hover:text-foreground">{t("scan_crop")}</Link></li>
            <li><Link to="/plan" className="story-link text-foreground/80 hover:text-foreground">{t("plan_crop")}</Link></li>
            <li><Link to="/mixed-crops" className="story-link text-foreground/80 hover:text-foreground">{t("mixed_crop_planning")}</Link></li>
            <li><Link to="/methods" className="story-link text-foreground/80 hover:text-foreground">{t("farming_methods")}</Link></li>
            <li><Link to="/spray" className="story-link text-foreground/80 hover:text-foreground">{t("spray_calc")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("support")}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/tickets" className="story-link text-foreground/80 hover:text-foreground">{t("my_tickets")}</Link></li>
            <li><Link to="/tickets/new" className="story-link text-foreground/80 hover:text-foreground">{t("raise_ticket")}</Link></li>
            <li><Link to="/about" className="story-link text-foreground/80 hover:text-foreground">{t("about")}</Link></li>
            <li>
              <a href="mailto:siddu.dude.dev@gmail.com" className="story-link inline-flex items-center gap-1 text-foreground/80 hover:text-foreground">
                <Mail className="h-3 w-3" /> {t("contact")}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("legal")}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/privacy" className="story-link text-foreground/80 hover:text-foreground">{t("privacy")}</Link></li>
            <li><Link to="/terms" className="story-link text-foreground/80 hover:text-foreground">{t("terms")}</Link></li>
            <li className="flex items-center gap-1 text-foreground/80"><MapPin className="h-3 w-3" /> Hyderabad, India</li>
            <li><a href="mailto:siddu.dude.dev@gmail.com" className="inline-flex items-center gap-1 text-foreground/80 hover:text-foreground"><Phone className="h-3 w-3" /> Helpline via email</a></li>
          </ul>
          <div className="mt-4 flex gap-3 text-muted-foreground">
            <a href="https://github.com/siddu-dude-dev" target="_blank" rel="noreferrer" aria-label="GitHub" className="hover-scale"><Github className="h-4 w-4" /></a>
            <a href="https://twitter.com/intent/follow?screen_name=agripulse" target="_blank" rel="noreferrer" aria-label="Twitter" className="hover-scale"><Twitter className="h-4 w-4" /></a>
            <a href="mailto:siddu.dude.dev@gmail.com" aria-label="Email" className="hover-scale"><Mail className="h-4 w-4" /></a>
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-4 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} {t("app_name")}. {t("rights")}</p>
          <p className="font-mono">v1.1 · Built for farmers 🌱 · siddu.dude.dev@gmail.com</p>
        </div>
      </div>
    </footer>
  );
}
