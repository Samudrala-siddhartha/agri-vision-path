import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Send, ShieldCheck, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { toast } from "@/hooks/use-toast";

const TicketDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!id) return;
    const { data: tk } = await supabase.from("tickets").select("*").eq("id", id).single();
    setTicket(tk);
    const { data: ms } = await supabase.from("ticket_messages").select("*").eq("ticket_id", id).order("created_at", { ascending: true });
    setMessages(ms ?? []);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
    load();
    // realtime
    const channel = supabase.channel(`ticket-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tickets", filter: `id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const send = async () => {
    if (!user || !id || !body.trim()) return;
    setSending(true);
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: id, author_id: user.id, is_admin: isAdmin, body: body.trim().slice(0, 4000),
    });
    setSending(false);
    if (error) return toast({ title: error.message, variant: "destructive" });
    setBody("");
  };

  const setStatus = async (status: string) => {
    if (!id) return;
    const { error } = await supabase.from("tickets").update({ status }).eq("id", id);
    if (error) toast({ title: error.message, variant: "destructive" });
  };

  if (!ticket) return (
    <div className="flex min-h-screen flex-col bg-soil"><AppHeader /><main className="container flex-1 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></main><Footer /></div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-soil">
      <AppHeader />
      <main className="container max-w-3xl flex-1 space-y-6 py-8">
        <BackButton to={isAdmin ? "/admin" : "/tickets"} />
        <Card className="overflow-hidden shadow-elevated">
          <div className="bg-hero p-6 text-primary-foreground">
            <p className="text-xs uppercase tracking-wide opacity-90">{t("ticket_subject")}</p>
            <h1 className="mt-1 font-display text-2xl font-extrabold">{ticket.subject}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{t(`cat_${ticket.category}` as any)}</Badge>
              <Badge variant="secondary">{t(`prio_${ticket.priority}` as any)}</Badge>
              <Badge variant="secondary">{t(`status_${ticket.status}` as any)}</Badge>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <p className="whitespace-pre-wrap text-sm text-foreground/80">{ticket.description}</p>
            {ticket.screenshot_url && (
              <a href={ticket.screenshot_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border">
                <img src={ticket.screenshot_url} alt="screenshot" className="max-h-80 w-full object-contain bg-muted" />
              </a>
            )}
            {isAdmin && (
              <div className="flex flex-wrap gap-2 rounded-xl border bg-muted/30 p-3">
                {(["open", "in_progress", "resolved", "closed"] as const).map((s) => (
                  <Button key={s} size="sm" variant={ticket.status === s ? "default" : "outline"} onClick={() => setStatus(s)}>
                    {t(`status_${s}` as any)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg font-bold">{t("conversation")}</h2>
          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
            {messages.map((m) => {
              const mine = m.author_id === user?.id;
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine && (
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${m.is_admin ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {m.is_admin ? <ShieldCheck className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : m.is_admin ? "bg-secondary" : "bg-muted"}`}>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase opacity-80">{m.is_admin ? t("admin_reply") : mine ? t("you") : t("you")}</p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          {ticket.status !== "closed" && (
            <div className="mt-4 flex gap-2">
              <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("reply_placeholder")} maxLength={4000} />
              <Button onClick={send} disabled={sending || !body.trim()} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="hidden sm:inline">{t("send")}</span>
              </Button>
            </div>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default TicketDetail;
