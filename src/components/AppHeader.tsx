import { Link, useNavigate } from "react-router-dom";
import { Sprout, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLang } from "@/i18n/LanguageProvider";
import { useAuth } from "@/auth/AuthProvider";

export function AppHeader() {
  const { t } = useLang();
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-hero shadow-soft">
            <Sprout className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">{t("app_name")}</span>
        </Link>
        <div className="flex items-center gap-1">
          {user && (
            <Button variant="ghost" size="sm" onClick={() => nav("/dashboard")} className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">{t("dashboard")}</span>
            </Button>
          )}
          <LanguageSwitcher />
          {user ? (
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); nav("/"); }} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("sign_out")}</span>
            </Button>
          ) : (
            <Button size="sm" onClick={() => nav("/auth")}>{t("sign_in")}</Button>
          )}
        </div>
      </div>
    </header>
  );
}
