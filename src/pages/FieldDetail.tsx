import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft, MapPin, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppHeader } from "@/components/AppHeader";
import { SeverityBadge } from "@/components/SeverityBadge";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LanguageProvider";

const sevToNum: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3 };

const FieldDetail = () => {
  const { id } = useParams();
  const { t } = useLang();
  const [field, setField] = useState<any>(null);
  const [scans, setScans] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: s }] = await Promise.all([
        supabase.from("fields").select("*").eq("id", id).single(),
        supabase.from("scans").select("*").eq("field_id", id).order("created_at", { ascending: true }),
      ]);
      setField(f); setScans(s ?? []);
    })();
  }, [id]);

  const chart = scans.map((s) => ({
    date: new Date(s.created_at).toLocaleDateString(),
    severity: sevToNum[(s.severity ?? "none").toLowerCase()] ?? 0,
  }));

  return (
    <div className="min-h-screen bg-soil">
      <AppHeader />
      <main className="container max-w-3xl space-y-6 py-8">
        <Link to="/dashboard"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />{t("dashboard")}</Button></Link>

        {field && (
          <Card className="p-6 shadow-soft">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t(field.crop)}</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold">{field.name}</h1>
            {field.location && <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{field.location}</p>}
            <Link to="/scan/new"><Button className="mt-4 gap-2"><Camera className="h-4 w-4" />{t("new_scan")}</Button></Link>
          </Card>
        )}

        {chart.length > 1 && (
          <Card className="p-6 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-bold">Severity over time</h2>
            <div className="h-48">
              <ResponsiveContainer>
                <LineChart data={chart}>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="severity" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <section>
          <h2 className="mb-3 font-display text-xl font-bold">{t("view_history")}</h2>
          {scans.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">{t("no_scans_yet")}</Card>
          ) : (
            <div className="space-y-3 border-l-2 border-primary/20 pl-4">
              {scans.slice().reverse().map((s) => (
                <Link key={s.id} to={`/scan/${s.id}`}>
                  <Card className="relative p-4 shadow-soft transition hover:shadow-elevated">
                    <div className="absolute -left-[22px] top-5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{s.disease_name ?? "Pending"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                      </div>
                      <SeverityBadge severity={s.severity} />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default FieldDetail;
