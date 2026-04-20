import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Loader2, Send, Upload, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Schema = z.object({
  subject: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(4000),
  category: z.enum(["bug", "wrong_diagnosis", "feature", "other"]),
  priority: z.enum(["low", "normal", "high"]),
});

const NewTicket = () => {
  const { user } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"bug" | "wrong_diagnosis" | "feature" | "other">("other");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastScan, setLastScan] = useState<{ id: string; crop: string; disease_name: string | null; field?: { name: string; location: string | null } } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("scans")
        .select("id, crop, disease_name, field_id, fields:field_id(name, location)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setLastScan({ id: data.id, crop: data.crop, disease_name: data.disease_name, field: (data as any).fields ?? undefined });
    })();
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = Schema.safeParse({ subject, description, category, priority });
    if (!parsed.success) {
      const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input";
      return toast({ title: msg, variant: "destructive" });
    }
    setBusy(true);
    try {
      let screenshot_url: string | null = null;
      if (file) {
        if (file.size > 8 * 1024 * 1024) throw new Error("Screenshot must be under 8 MB");
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("ticket-screenshots").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("ticket-screenshots").getPublicUrl(path);
        screenshot_url = pub.publicUrl;
      }
      const ctx: string[] = [];
      if (lastScan) {
        ctx.push(`\n\n— Auto-attached context —`);
        ctx.push(`Last scan: ${lastScan.disease_name ?? "pending"} on ${lastScan.crop} (#${lastScan.id})`);
        if (lastScan.field) ctx.push(`Field: ${lastScan.field.name}${lastScan.field.location ? ` — ${lastScan.field.location}` : ""}`);
        ctx.push(`Time: ${new Date().toISOString()}`);
      } else {
        ctx.push(`\n\n— Auto-attached — Time: ${new Date().toISOString()}`);
      }
      const fullDescription = description + ctx.join("\n");
      const { data, error } = await supabase
        .from("tickets")
        .insert({ user_id: user.id, subject, description: fullDescription, category, priority, screenshot_url, scan_id: lastScan?.id ?? null })
        .select("id").single();
      if (error) throw error;
      toast({ title: t("ticket_created") });
      nav(`/tickets/${data.id}`);
    } catch (err: any) {
      toast({ title: err?.message ?? "Error", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen flex-col bg-soil">
      <AppHeader />
      <main className="container max-w-2xl flex-1 space-y-6 py-8">
        <BackButton to="/tickets" />
        <Card className="p-6 shadow-elevated md:p-8">
          <h1 className="font-display text-2xl font-bold">{t("raise_ticket")}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{t("hero_subtitle")}</p>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("ticket_subject")}</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("ticket_category")}</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">{t("cat_bug")}</SelectItem>
                    <SelectItem value="wrong_diagnosis">{t("cat_wrong_diagnosis")}</SelectItem>
                    <SelectItem value="feature">{t("cat_feature")}</SelectItem>
                    <SelectItem value="other">{t("cat_other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("ticket_priority")}</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("prio_low")}</SelectItem>
                    <SelectItem value="normal">{t("prio_normal")}</SelectItem>
                    <SelectItem value="high">{t("prio_high")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("ticket_description")}</Label>
              <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} required />
            </div>
            <div className="space-y-2">
              <Label>{t("ticket_screenshot")}</Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40">
                <Upload className="h-4 w-4" />
                {file ? file.name : t("upload_photos")}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <Button type="submit" disabled={busy} size="lg" className="w-full gap-2 rounded-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("submit")}
            </Button>
          </form>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default NewTicket;
