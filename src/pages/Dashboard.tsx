import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Camera, MapPin, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SeverityBadge } from "@/components/SeverityBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { toast } from "@/hooks/use-toast";

type Field = { id: string; name: string; crop: string; location: string | null };
type Scan = { id: string; crop: string; disease_name: string | null; severity: string | null; created_at: string; field_id: string | null };

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
      supabase.from("scans").select("id,crop,disease_name,severity,created_at,field_id").order("created_at", { ascending: false }).limit(10),
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

  return (
    <div className="flex min-h-screen flex-col bg-soil">
      <AppHeader />
      <main className="container flex-1 space-y-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("hello")}</p>
            <h1 className="font-display text-3xl font-extrabold">{t("dashboard")}</h1>
          </div>
          <Button size="lg" onClick={() => nav("/scan/new")} className="gap-2 rounded-full px-6 shadow-soft">
            <Camera className="h-5 w-5" /> {t("new_scan")}
          </Button>
        </div>

        {/* Fields */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">{t("my_fields")}</h2>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> {t("add_field")}</Button>
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
                  <Button type="submit" className="w-full">{t("add_field")}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {fields.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">{t("no_fields_yet")}</Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((f) => (
                <Link key={f.id} to={`/field/${f.id}`}>
                  <Card className="group p-5 shadow-soft transition hover:shadow-elevated hover:-translate-y-0.5">
                    <div className="mb-2 flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t(f.crop as any)}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold">{f.name}</h3>
                    {f.location && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{f.location}</p>}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent scans */}
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">{t("recent_scans")}</h2>
          {scans.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">{t("no_scans_yet")}</Card>
          ) : (
            <div className="space-y-3">
              {scans.map((s) => (
                <Link key={s.id} to={`/scan/${s.id}`}>
                  <Card className="flex items-center gap-4 p-4 shadow-soft transition hover:shadow-elevated">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Leaf className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{s.disease_name ?? "Pending"}</p>
                      <p className="text-xs text-muted-foreground">{t(s.crop as any)} · {new Date(s.created_at).toLocaleString()}</p>
                    </div>
                    <SeverityBadge severity={s.severity} />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
