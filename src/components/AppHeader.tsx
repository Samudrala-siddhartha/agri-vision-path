import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell, Camera, HelpCircle, Home, Languages, LayoutDashboard, LifeBuoy, LogOut, Megaphone,
  Menu, MessageCircle, Moon, RotateCcw, ShieldCheck, Sprout, Sun, User, Wheat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLang } from "@/i18n/LanguageProvider";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import accountHero from "@/assets/account-hero.jpg";

export function AppHeader() {
  const { t } = useLang();
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  const [notify, setNotify] = useState(true);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("agripulse_theme", dark ? "dark" : "light");
  }, [dark]);

  const initial = (user?.email ?? "?").charAt(0).toUpperCase();
  const closeGo = (to: string) => nav(to);
  const active = (paths: string[]) => paths.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));
  const logout = async () => {
    if (!window.confirm("Sign out of AgriPulse?")) return;
    await signOut();
    nav("/");
  };

  const mainItems = [
    { icon: Home, label: t("dashboard"), to: "/dashboard", paths: ["/dashboard"] },
    { icon: Camera, label: t("scan_crop"), to: "/scan/new", paths: ["/scan"] },
    { icon: Wheat, label: t("plan_crop"), to: "/plan", paths: ["/plan"] },
    { icon: LayoutDashboard, label: t("my_farm"), to: "/dashboard", paths: ["/field"] },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          {user && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl" aria-label={t("menu")}>
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-0 sm:max-w-sm">
                <SheetHeader className="sr-only">
                  <SheetTitle>{t("menu")}</SheetTitle>
                  <SheetDescription>{t("profile")}</SheetDescription>
                </SheetHeader>
                <div className="relative h-40 overflow-hidden">
                  <img src={accountHero} alt="AgriPulse farm" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-foreground/45" />
                  <div className="absolute bottom-4 left-4 right-12 flex items-center gap-3 text-primary-foreground">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background/20 text-lg font-extrabold backdrop-blur">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-lg font-bold">{user.email?.split("@")[0] ?? t("profile")}</p>
                      <p className="truncate text-sm opacity-85">{user.email}</p>
                    </div>
                  </div>
                </div>

                <nav className="space-y-5 p-4">
                  <MenuSection title="Main">
                    {mainItems.map((item) => (
                      <SheetClose asChild key={`${item.label}-${item.to}`}>
                        <button onClick={() => closeGo(item.to)} className={`menu-row ${active(item.paths) ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                          <item.icon className="h-5 w-5" /> <span>{item.label}</span>
                        </button>
                      </SheetClose>
                    ))}
                  </MenuSection>

                  <MenuSection title="Settings">
                    <div className="menu-row justify-between">
                      <span className="flex items-center gap-3"><Languages className="h-5 w-5" />{t("language")}</span>
                      <LanguageSwitcher />
                    </div>
                    <div className="menu-row justify-between">
                      <span className="flex items-center gap-3">{dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}{t("theme")}</span>
                      <Switch checked={dark} onCheckedChange={setDark} aria-label={t("theme")} />
                    </div>
                    <div className="menu-row justify-between">
                      <span className="flex items-center gap-3"><Bell className="h-5 w-5" />{t("notifications")}</span>
                      <Switch checked={notify} onCheckedChange={setNotify} aria-label={t("notifications")} />
                    </div>
                  </MenuSection>

                  <MenuSection title="Account">
                    <DrawerItem icon={User} label={t("account_info")} to="/dashboard" onGo={closeGo} />
                    <DrawerItem icon={RotateCcw} label={t("reset_password")} to="/reset-password" onGo={closeGo} />
                    <SheetClose asChild>
                      <a href="https://chat.whatsapp.com/CtKA7DPgIhm6vfroyNil9l?mode=gi_t" target="_blank" rel="noreferrer" className="menu-row bg-primary text-primary-foreground shadow-soft hover:bg-primary/90">
                        <MessageCircle className="h-5 w-5" /> <span>{t("whatsapp_community")}</span>
                      </a>
                    </SheetClose>
                  </MenuSection>

                  <MenuSection title="Support">
                    <DrawerItem icon={LifeBuoy} label={t("my_tickets")} to="/tickets" onGo={closeGo} active={active(["/tickets"])} />
                    <DrawerItem icon={HelpCircle} label={t("help_support")} to="/tickets/new" onGo={closeGo} />
                  </MenuSection>

                  <MenuSection title="System">
                    <DrawerItem icon={Megaphone} label={t("announcements")} to="/dashboard" onGo={closeGo} />
                    {isAdmin && <DrawerItem icon={ShieldCheck} label="Admin" to="/admin" onGo={closeGo} active={active(["/admin"])} />}
                    <SheetClose asChild>
                      <button onClick={logout} className="menu-row text-destructive hover:bg-destructive/10">
                        <LogOut className="h-5 w-5" /> <span>{t("sign_out")}</span>
                      </button>
                    </SheetClose>
                  </MenuSection>
                </nav>
              </SheetContent>
            </Sheet>
          )}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-hero shadow-soft">
            <Sprout className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">{t("app_name")}</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block"><LanguageSwitcher /></div>
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
                <DropdownMenuItem onClick={logout} className="gap-2 text-destructive focus:text-destructive">
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

function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="px-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function DrawerItem({ icon: Icon, label, to, onGo, active }: { icon: LucideIcon; label: string; to: string; onGo: (to: string) => void; active?: boolean }) {
  return (
    <SheetClose asChild>
      <button onClick={() => onGo(to)} className={`menu-row ${active ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
        <Icon className="h-5 w-5" /> <span>{label}</span>
      </button>
    </SheetClose>
  );
}
