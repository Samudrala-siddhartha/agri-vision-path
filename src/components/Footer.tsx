import { Link } from "react-router-dom";
import { Sprout, Mail, Github, Twitter } from "lucide-react";
import { useLang } from "@/i18n/LanguageProvider";

export function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t bg-card/40 backdrop-blur">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-hero shadow-soft">
              <Sprout className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">{t("app_name")}</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">{t("hero_subtitle")}</p>
        </div>

        <div>
          <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("product")}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/dashboard" className="story-link text-foreground/80 hover:text-foreground">{t("dashboard")}</Link></li>
            <li><Link to="/scan/new" className="story-link text-foreground/80 hover:text-foreground">{t("new_scan")}</Link></li>
            <li><Link to="/#features" className="story-link text-foreground/80 hover:text-foreground">{t("features")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("support")}</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/tickets" className="story-link text-foreground/80 hover:text-foreground">{t("tickets")}</Link></li>
            <li><Link to="/tickets/new" className="story-link text-foreground/80 hover:text-foreground">{t("raise_ticket")}</Link></li>
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
            <li><Link to="/about" className="story-link text-foreground/80 hover:text-foreground">{t("about")}</Link></li>
          </ul>
          <div className="mt-4 flex gap-3 text-muted-foreground">
            <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub" className="hover-scale"><Github className="h-4 w-4" /></a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="hover-scale"><Twitter className="h-4 w-4" /></a>
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-4 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} {t("app_name")}. {t("rights")}</p>
          <p className="font-mono">v1.0 · Built for farmers 🌱</p>
        </div>
      </div>
    </footer>
  );
}
