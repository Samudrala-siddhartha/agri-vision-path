import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sprout, LogOut, ShieldCheck, LifeBuoy, User, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLang } from "@/i18n/LanguageProvider";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const { t } = useLang();
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-hero shadow-soft">
            <Sprout className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">{t("app_name")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full" aria-label={t("profile")}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {initial}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav("/dashboard")} className="gap-2">
                  <LayoutDashboard className="h-4 w-4" /> {t("dashboard")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav("/tickets")} className="gap-2">
                  <LifeBuoy className="h-4 w-4" /> {t("support")}
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => nav("/admin")} className="gap-2">
                    <ShieldCheck className="h-4 w-4" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); nav("/"); }} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> {t("sign_out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={() => nav("/auth")} className="gap-2 rounded-full">
              <User className="h-4 w-4" /> {t("sign_in")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
