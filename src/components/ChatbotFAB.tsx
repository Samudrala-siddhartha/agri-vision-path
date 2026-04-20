import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X, Send, Camera, Sprout, History as HistoryIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/i18n/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatbotFAB() {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setBusy(true);
    let acc = "";
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agri-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
        body: JSON.stringify({ messages: [...msgs, userMsg], language: lang }),
      });
      if (resp.status === 429) { toast({ title: "Rate limit, please retry.", variant: "destructive" }); throw new Error("rate"); }
      if (resp.status === 402) { toast({ title: "AI credits exhausted.", variant: "destructive" }); throw new Error("credits"); }
      if (!resp.ok || !resp.body) throw new Error("Failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      setMsgs(prev => [...prev, { role: "assistant", content: "" }]);
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setMsgs(prev => prev.map((m, i) => (i === prev.length - 1 && m.role === "assistant" ? { ...m, content: acc } : m)));
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e) {
      // already toasted
    } finally { setBusy(false); }
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated"
        aria-label={t("chatbot")}
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 sm:items-center sm:p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="flex h-[90vh] w-full flex-col rounded-t-3xl bg-card shadow-elevated sm:h-[600px] sm:max-w-md sm:rounded-3xl"
            >
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-lg font-bold">{t("chatbot")}</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-5 w-5" /></Button>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {msgs.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{t("ask_anything")}</p>
                    <div className="grid grid-cols-1 gap-2">
                      <QuickAction icon={Camera} label={t("scan_crop")} onClick={() => { setOpen(false); nav("/scan/new"); }} />
                      <QuickAction icon={Sprout} label={t("plan_crop")} onClick={() => { setOpen(false); nav("/plan"); }} />
                      <QuickAction icon={HistoryIcon} label={t("view_history")} onClick={() => { setOpen(false); nav("/dashboard"); }} />
                    </div>
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      {m.content || (busy && i === msgs.length - 1 ? "…" : "")}
                    </div>
                  </div>
                ))}
                {busy && msgs[msgs.length - 1]?.role !== "assistant" && (
                  <div className="flex"><div className="rounded-2xl bg-muted px-4 py-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /></div></div>
                )}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t p-3">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("ask_anything")} disabled={busy} className="rounded-full" />
                <Button type="submit" size="icon" disabled={busy || !input.trim()} className="h-10 w-10 rounded-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-2xl border bg-background p-3 text-left text-sm font-semibold transition hover:border-primary/50 hover:bg-primary/5">
      <Icon className="h-5 w-5 text-primary" /> {label}
    </button>
  );
}
