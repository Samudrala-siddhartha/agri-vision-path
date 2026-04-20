import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, Sprout, BarChart3, Beaker, AlertTriangle, Plus, MapPin, Leaf } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SeverityBadge } from "@/components/SeverityBadge";
import { ChatbotFAB } from "@/components/ChatbotFAB";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { toast } from "@/hooks/use-toast";

type Field = { id: string; name: string; crop: string; location: string | null };
type Scan = { id: string; crop: string; disease_name: string | null; severity: string | null; created_at: string; field_id: string | null; image_urls: string[] };

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [crop, setCrop] = useState("paddy");
  const [location, setLocation] = useState("");

  const load = async () => {
    if (!user) return;
    const [{ data: f }, { data: s }] = await Promise.all([
      supabase.from("fields").select("*").order("created_at", { ascending: false }),
      supabase.from("scans").select("id,crop,disease_name,severity,created_at,field_id,image_urls").order("created_at", { ascending: false }).limit(8),
    ]);
    setFields((f as Field[]) ?? []);
    setScans((s as Scan[]) ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const addField = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("fields").insert({ name, crop, location, user_id: user!.id });
    if (error) return toast({ title: error.message, variant: "destructive" });
    setOpen(false); setName(""); setLocation(""); load();
  };

  const alerts = useMemo(() => {
    return scans
      .filter(s => s.severity === "high" || s.severity === "medium")
      .slice(0, 3)
      .map(s => ({
        id: s.id,
        title: `${s.disease_name ?? "Issue"} on ${s.crop}`,
        severity: s.severity!,
        date: new Date(s.created_at).toLocaleDateString(),
      }));
  }, [scans]);

  const quickActions = [
    { icon: Camera, label: t("scan_crop"), to: "/scan/new", tone: "bg-primary text-primary-foreground" },
    { icon: Sprout, label: t("plan_crop"), to: "/plan", tone: "bg-secondary text-secondary-foreground" },
    { icon: BarChart3, label: t("my_farm"), to: "/dashboard#farm", tone: "bg-accent text-accent-foreground" },
    { icon: Beaker, label: t("spray_calc"), to: "/spray", tone: "bg-card border-2 border-primary/20 text-foreground" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container flex-1 space-y-8 py-6">
        <div>
          <p className="text-sm text-muted-foreground">{t("hello")}</p>
          <h1 className="font-display text-3xl font-extrabold">{t("dashboard")}</h1>
        </div>

        {/* Quick actions */}
        <section>
          <h2 className="sr-only">{t("quick_actions")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickActions.map((a, i) => (
              <motion.div
                key={a.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <button
                  onClick={() => nav(a.to)}
                  className={`flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-3xl shadow-soft transition hover:shadow-elevated ${a.tone}`}
                >
                  <a.icon className="h-9 w-9" />
                  <span className="text-sm font-bold">{a.label}</span>
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Alerts */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
            <AlertTriangle className="h-5 w-5 text-destructive" /> {t("alerts")}
          </h2>
          {alerts.length === 0 ? (
            <Card className="rounded-2xl p-4 text-sm text-muted-foreground">{t("no_alerts")}</Card>
          ) : (
            <div className="space-y-2">
              {alerts.map(a => (
                <Link key={a.id} to={`/scan/${a.id}`}>
                  <Card className={`flex items-center justify-between rounded-2xl border-l-4 p-4 shadow-soft transition hover:shadow-elevated ${a.severity === "high" ? "border-destructive bg-destructive/5" : "border-warning bg-warning/5"}`}>
                    <div>
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.date}</p>
                    </div>
                    <SeverityBadge severity={a.severity} />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent scans */}
        <section id="farm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{t("recent_scans")}</h2>
            <Button variant="outline" size="sm" onClick={() => nav("/scan/new")} className="rounded-full">
              <Camera className="mr-1 h-4 w-4" /> {t("new_scan")}
            </Button>
          </div>
          {scans.length === 0 ? (
            <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">{t("no_scans_yet")}</Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {scans.map(s => (
                <Link key={s.id} to={`/scan/${s.id}`}>
                  <Card className="overflow-hidden rounded-2xl shadow-soft transition hover:shadow-elevated">
                    <div className="flex gap-3 p-3">
                      {s.image_urls?.[0] ? (
                        <img src={s.image_urls[0]} alt={s.disease_name ?? "scan"} loading="lazy"
                             className="h-20 w-20 flex-shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Leaf className="h-7 w-7" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.disease_name ?? "Pending"}</p>
                        <p className="text-xs text-muted-foreground">{t(s.crop as any)} · {new Date(s.created_at).toLocaleDateString()}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <SeverityBadge severity={s.severity} />
                          <span className="text-xs font-medium text-primary">{t("view_details")} →</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Fields */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{t("my_fields")}</h2>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-full"><Plus className="h-4 w-4" /> {t("add_field")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("add_field")}</DialogTitle></DialogHeader>
                <form onSubmit={addField} className="space-y-4">
                  <div className="space-y-2"><Label>{t("field_name")}</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="space-y-2">
                    <Label>{t("crop")}</Label>
                    <Select value={crop} onValueChange={setCrop}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paddy">{t("paddy")}</SelectItem>
                        <SelectItem value="chili">{t("chili")}</SelectItem>
                        <SelectItem value="wheat">{t("wheat")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Village, District" /></div>
                  <Button type="submit" className="w-full rounded-full">{t("add_field")}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {fields.length === 0 ? (
            <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">{t("no_fields_yet")}</Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((f) => (
                <Link key={f.id} to={`/field/${f.id}`}>
                  <Card className="rounded-2xl p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated">
                    <div className="mb-2 flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t(f.crop as any)}</span>
                    </div>
                    <h3 className="font-display text-base font-bold">{f.name}</h3>
                    {f.location && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{f.location}</p>}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
      <ChatbotFAB />
    </div>
  );
};

export default Dashboard;
