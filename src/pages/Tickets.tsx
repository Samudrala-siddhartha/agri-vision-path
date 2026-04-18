import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Inbox, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { motion } from "framer-motion";

const statusVariant = (s: string) =>
  s === "open" ? "default" : s === "in_progress" ? "secondary" : s === "resolved" ? "outline" : "outline";

const Tickets = () => {
  const { user } = useAuth();
  const { t } = useLang();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id,subject,category,priority,status,created_at,updated_at")
        .order("updated_at", { ascending: false });
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col bg-soil">
      <AppHeader />
      <main className="container max-w-4xl flex-1 space-y-6 py-8">
        <BackButton to="/dashboard" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("support")}</p>
            <h1 className="font-display text-3xl font-extrabold">{t("my_tickets")}</h1>
          </div>
          <Link to="/tickets/new">
            <Button className="gap-2 rounded-full px-5 shadow-soft">
              <Plus className="h-4 w-4" />{t("new_ticket")}
            </Button>
          </Link>
        </div>

        {loading ? (
          <Card className="flex items-center justify-center p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></Card>
        ) : rows.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("no_tickets")}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/tickets/${r.id}`}>
                  <Card className="flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-elevated">
                    <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.subject}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={statusVariant(r.status) as any}>{t(`status_${r.status}` as any)}</Badge>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.priority}</span>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Tickets;
