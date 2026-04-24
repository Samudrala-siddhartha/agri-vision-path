import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { MfaGate } from "@/components/admin/MfaGate";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Database, Users, FileText, Image as ImageIcon, ShieldAlert, Sparkles, LifeBuoy, Ban, PauseCircle, CheckCircle2, Megaphone, Rows3, Sprout, Trash2, AlertTriangle, Activity } from "lucide-react";
import { Link } from "react-router-dom";

const Admin = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [mfaPassed, setMfaPassed] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [user]);

  if (loading || isAdmin === null) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-soil">
        <AppHeader />
        <main className="container max-w-lg py-12">
          <Card className="p-6 text-center">
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <h1 className="font-display text-2xl font-bold">Access denied</h1>
            <p className="mt-2 text-sm text-muted-foreground">This area is reserved for AgriPulse administrators.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soil">
      <AppHeader />
      {!mfaPassed ? (
        <MfaGate onVerified={() => setMfaPassed(true)} />
      ) : (
        <main className="container max-w-6xl space-y-6 py-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Admin console</h1>
            <p className="text-sm text-muted-foreground">Manage RAG knowledge, references, users, scans, and audit trail.</p>
          </div>

            <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 lg:grid-cols-12">
              <TabsTrigger value="overview" className="gap-2"><Sparkles className="h-4 w-4" />Overview</TabsTrigger>
              <TabsTrigger value="suspicious" className="gap-2"><AlertTriangle className="h-4 w-4" />Suspicious</TabsTrigger>
              <TabsTrigger value="activity" className="gap-2"><Activity className="h-4 w-4" />Activity</TabsTrigger>
              <TabsTrigger value="rag" className="gap-2"><Database className="h-4 w-4" />RAG</TabsTrigger>
              <TabsTrigger value="refs" className="gap-2"><ImageIcon className="h-4 w-4" />References</TabsTrigger>
              <TabsTrigger value="scans" className="gap-2"><FileText className="h-4 w-4" />Scans</TabsTrigger>
              <TabsTrigger value="tickets" className="gap-2"><LifeBuoy className="h-4 w-4" />Tickets</TabsTrigger>
              <TabsTrigger value="announcements" className="gap-2"><Megaphone className="h-4 w-4" />Popups</TabsTrigger>
              <TabsTrigger value="methods" className="gap-2"><Rows3 className="h-4 w-4" />Methods</TabsTrigger>
              <TabsTrigger value="mixed" className="gap-2"><Sprout className="h-4 w-4" />Mixed</TabsTrigger>
              <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" />Users</TabsTrigger>
              <TabsTrigger value="audit" className="gap-2"><ShieldAlert className="h-4 w-4" />Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-4"><OverviewTab /></TabsContent>
            <TabsContent value="suspicious" className="pt-4"><SuspiciousTab /></TabsContent>
            <TabsContent value="activity" className="pt-4"><ActivityTab /></TabsContent>
            <TabsContent value="rag" className="pt-4"><RagTab /></TabsContent>
            <TabsContent value="refs" className="pt-4"><RefsTab /></TabsContent>
            <TabsContent value="scans" className="pt-4"><ScansTab /></TabsContent>
            <TabsContent value="tickets" className="pt-4"><TicketsTab /></TabsContent>
            <TabsContent value="announcements" className="pt-4"><AnnouncementsTab /></TabsContent>
            <TabsContent value="methods" className="pt-4"><MethodsAdminTab /></TabsContent>
            <TabsContent value="mixed" className="pt-4"><MixedCropAdminTab /></TabsContent>
            <TabsContent value="users" className="pt-4"><UsersTab /></TabsContent>
            <TabsContent value="audit" className="pt-4"><AuditTab /></TabsContent>
          </Tabs>
        </main>
      )}
    </div>
  );
};

function OverviewTab() {
  const [stats, setStats] = useState<any>({});
  useEffect(() => {
    (async () => {
      const [scans, users, refs, docs, imgs] = await Promise.all([
        supabase.from("scans").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("disease_reference_images").select("*", { count: "exact", head: true }),
        supabase.from("rag_documents").select("*", { count: "exact", head: true }),
        supabase.from("rag_image_embeddings").select("*", { count: "exact", head: true }),
      ]);
      setStats({ scans: scans.count, users: users.count, refs: refs.count, docs: docs.count, imgs: imgs.count });
    })();
  }, []);
  const items = [
    { label: "Total scans", value: stats.scans },
    { label: "Users", value: stats.users },
    { label: "Reference images", value: stats.refs },
    { label: "RAG passages", value: stats.docs },
    { label: "RAG image embeddings", value: stats.imgs },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((i) => (
        <Card key={i.label} className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{i.label}</p>
          <p className="mt-1 font-display text-3xl font-bold">{i.value ?? "—"}</p>
        </Card>
      ))}
    </div>
  );
}

function RagTab() {
  const [crop, setCrop] = useState("paddy");
  const [diseaseKey, setDiseaseKey] = useState("bacterial_leaf_blight");
  const [lang, setLang] = useState("en");
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const ingest = async (mode: "text" | "seed_blb") => {
    setBusy(true);
    try {
      const body: any = { mode };
      if (mode === "text") Object.assign(body, { crop, disease_key: diseaseKey, lang, source_url: sourceUrl, title, content });
      const { data, error } = await supabase.functions.invoke("rag-ingest", { body });
      if (error) throw error;
      toast({ title: "Ingested", description: `${data?.inserted ?? 0} chunks added.` });
      if (mode === "text") setContent("");
    } catch (e: any) {
      toast({ title: "Ingest failed", description: e?.message ?? "Error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-3 font-display text-lg font-bold">Add knowledge passage</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Crop</Label><Input value={crop} onChange={(e) => setCrop(e.target.value)} /></div>
          <div><Label>Disease key</Label><Input value={diseaseKey} onChange={(e) => setDiseaseKey(e.target.value)} /></div>
          <div><Label>Language</Label><Input value={lang} onChange={(e) => setLang(e.target.value)} /></div>
          <div><Label>Source URL</Label><Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://icar.org.in/..." /></div>
        </div>
        <div className="mt-3"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="mt-3"><Label>Content (will be chunked & embedded)</Label>
          <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste agronomy content from ICAR / IRRI / TNAU..." />
        </div>
        <Button className="mt-4 w-full" onClick={() => ingest("text")} disabled={busy || !content}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Embed & store"}
        </Button>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-display text-lg font-bold">Image RAG seeding</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Embed all uploaded BLB reference images into the image-RAG index. Run once after adding new references.
        </p>
        <Button onClick={() => ingest("seed_blb")} disabled={busy} variant="secondary" className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Seed BLB image embeddings"}
        </Button>
      </Card>
    </div>
  );
}

function RefsTab() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("disease_reference_images").select("*").order("created_at", { ascending: false }).limit(60);
      setItems(data ?? []);
    })();
  }, []);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((i) => (
        <Card key={i.id} className="overflow-hidden">
          <div className="aspect-square bg-muted">
            <img src={i.image_url} alt={i.disease_key} loading="lazy" className="h-full w-full object-cover" />
          </div>
          <div className="p-2">
            <p className="truncate text-[11px] font-semibold">{i.disease_key}</p>
            <p className="text-[10px] text-muted-foreground">{i.crop}</p>
          </div>
        </Card>
      ))}
      {!items.length && <p className="text-sm text-muted-foreground">No reference images yet.</p>}
    </div>
  );
}

function ScansTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("scans").select("id,created_at,crop,disease_name,severity,confidence,user_id").order("created_at", { ascending: false }).limit(50);
      setRows(data ?? []);
    })();
  }, []);
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-6 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Date</span><span>Crop</span><span className="col-span-2">Disease</span><span>Severity</span><span>Conf.</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-6 gap-2 border-b px-4 py-2 text-sm">
          <span>{new Date(r.created_at).toLocaleDateString()}</span>
          <span>{r.crop}</span>
          <span className="col-span-2 truncate">{r.disease_name ?? "—"}</span>
          <span><Badge variant="outline">{r.severity ?? "—"}</Badge></span>
          <span>{r.confidence ? `${Math.round(r.confidence * 100)}%` : "—"}</span>
        </div>
      ))}
      {!rows.length && <p className="p-4 text-sm text-muted-foreground">No scans.</p>}
    </Card>
  );
}

function TicketsTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id,subject,category,priority,status,created_at,user_id")
        .order("created_at", { ascending: false })
        .limit(100);
      const list = tickets ?? [];
      const ids = Array.from(new Set(list.map((t) => t.user_id)));
      const profMap = new Map<string, any>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id,display_name,preferred_language,created_at")
          .in("user_id", ids);
        (profs ?? []).forEach((p) => profMap.set(p.user_id, p));
      }
      setRows(list.map((t) => ({ ...t, profile: profMap.get(t.user_id) })));
    })();
  }, []);
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="col-span-2">Date</span>
        <span className="col-span-3">Subject</span>
        <span className="col-span-3">Account holder</span>
        <span className="col-span-1">Lang</span>
        <span className="col-span-1">Cat.</span>
        <span className="col-span-1">Prio</span>
        <span className="col-span-1">Status</span>
      </div>
      {rows.map((r) => (
        <Link key={r.id} to={`/tickets/${r.id}`} className="grid grid-cols-12 items-center gap-2 border-b px-4 py-3 text-sm hover:bg-muted/40">
          <span className="col-span-2 text-xs">{new Date(r.created_at).toLocaleString()}</span>
          <span className="col-span-3 truncate font-medium">{r.subject}</span>
          <span className="col-span-3 min-w-0">
            <p className="truncate font-medium">{r.profile?.display_name ?? "—"}</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">{r.user_id}</p>
          </span>
          <span className="col-span-1 text-xs uppercase">{r.profile?.preferred_language ?? "—"}</span>
          <span className="col-span-1"><Badge variant="outline" className="text-[10px]">{r.category}</Badge></span>
          <span className="col-span-1"><Badge variant="secondary" className="text-[10px]">{r.priority}</Badge></span>
          <span className="col-span-1"><Badge className="text-[10px]">{r.status}</Badge></span>
        </Link>
      ))}
      {!rows.length && <p className="p-4 text-sm text-muted-foreground">No tickets yet.</p>}
    </Card>
  );
}

function AnnouncementsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(true);
  const [showAsPopup, setShowAsPopup] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadAnnouncements = async () => {
    const { data } = await (supabase as any)
      .from("announcements")
      .select("id,title,message,audience,show_as_popup,active,expires_at,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setRows(data ?? []);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const createAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setBusy(true);
    const { error } = await (supabase as any).from("announcements").insert({
      title: title.trim(),
      message: message.trim(),
      audience: "all",
      active,
      show_as_popup: showAsPopup,
    });
    setBusy(false);
    if (error) return toast({ title: "Announcement failed", description: error.message, variant: "destructive" });
    toast({ title: "Announcement published", description: showAsPopup ? "Users will see it as a popup." : "Saved as an announcement." });
    setTitle("");
    setMessage("");
    setActive(true);
    setShowAsPopup(true);
    loadAnnouncements();
  };

  const toggleActive = async (id: string, next: boolean) => {
    const { error } = await (supabase as any).from("announcements").update({ active: next }).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    loadAnnouncements();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-5">
        <h3 className="mb-3 font-display text-lg font-bold">Create popup announcement</h3>
        <form onSubmit={createAnnouncement} className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Important crop alert" /></div>
          <div><Label>Message</Label><Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write the announcement users should see..." /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="menu-row justify-between border"><span>Show as popup</span><Switch checked={showAsPopup} onCheckedChange={setShowAsPopup} /></label>
            <label className="menu-row justify-between border"><span>Active now</span><Switch checked={active} onCheckedChange={setActive} /></label>
          </div>
          <Button type="submit" disabled={busy || !title.trim() || !message.trim()} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish announcement"}
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="col-span-5">Announcement</span><span className="col-span-2">Type</span><span className="col-span-2">Status</span><span className="col-span-3">Control</span>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-12 items-center gap-2 border-b px-4 py-3 text-sm">
            <span className="col-span-5 min-w-0"><p className="truncate font-medium">{r.title}</p><p className="truncate text-xs text-muted-foreground">{r.message}</p></span>
            <span className="col-span-2"><Badge variant="outline">{r.show_as_popup ? "Popup" : "Notice"}</Badge></span>
            <span className="col-span-2"><Badge variant={r.active ? "secondary" : "outline"}>{r.active ? "Active" : "Hidden"}</Badge></span>
            <span className="col-span-3"><Switch checked={r.active} onCheckedChange={(next) => toggleActive(r.id, next)} aria-label="Toggle announcement" /></span>
          </div>
        ))}
        {!rows.length && <p className="p-4 text-sm text-muted-foreground">No announcements yet.</p>}
      </Card>
    </div>
  );
}

function MethodsAdminTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Intercropping");
  const [description, setDescription] = useState("");
  const [benefits, setBenefits] = useState("Yield, Soil health, Income");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const { data } = await (supabase as any).from("farming_methods").select("id,title,category,description,active,slug,benefits").order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const create = async (e: FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || !description.trim()) return;
    setBusy(true);
    const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { error } = await (supabase as any).from("farming_methods").insert({
      title: cleanTitle, category: category.trim(), slug, description: description.trim(),
      benefits: benefits.split(",").map((x) => x.trim()).filter(Boolean), active: true,
    });
    setBusy(false);
    if (error) return toast({ title: "Method failed", description: error.message, variant: "destructive" });
    toast({ title: "Farming method added" });
    setTitle(""); setDescription(""); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this farming method?")) return;
    const { error } = await (supabase as any).from("farming_methods").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  };
  return <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]"><Card className="p-5"><h3 className="mb-3 font-display text-lg font-bold">Add farming method</h3><form onSubmit={create} className="space-y-3"><div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hydroponics" /></div><div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div><div><Label>Description</Label><Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} /></div><div><Label>Benefits, comma separated</Label><Input value={benefits} onChange={(e) => setBenefits(e.target.value)} /></div><Button className="w-full" disabled={busy || !title.trim() || !description.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save method"}</Button></form></Card><Card className="overflow-hidden"><div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span className="col-span-4">Method</span><span className="col-span-3">Category</span><span className="col-span-3">Status</span><span className="col-span-2">Action</span></div>{rows.map((r) => <div key={r.id} className="grid grid-cols-12 items-center gap-2 border-b px-4 py-3 text-sm"><span className="col-span-4 min-w-0"><p className="truncate font-medium">{r.title}</p><p className="truncate text-xs text-muted-foreground">{r.slug}</p></span><span className="col-span-3">{r.category}</span><span className="col-span-3"><Badge variant={r.active ? "secondary" : "outline"}>{r.active ? "Active" : "Hidden"}</Badge></span><span className="col-span-2"><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></span></div>)}</Card></div>;
}

function MixedCropAdminTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [primary, setPrimary] = useState("");
  const [companion, setCompanion] = useState("");
  const [score, setScore] = useState("85");
  const [benefits, setBenefits] = useState("Nitrogen fixing, Pest reduction, Dual income");
  const [notes, setNotes] = useState("");
  const load = async () => {
    const { data } = await (supabase as any).from("mixed_crop_rules").select("id,primary_crop,companion_crop,compatibility_score,benefits,active,source").order("compatibility_score", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!primary.trim() || !companion.trim()) return;
    const { error } = await (supabase as any).from("mixed_crop_rules").insert({ primary_crop: primary.trim(), companion_crop: companion.trim(), compatibility_score: Number(score) || 80, benefits: benefits.split(",").map((x) => x.trim()).filter(Boolean), principles: ["Tall + short crops", "Deep + shallow roots", "Always include legumes"], notes: notes.trim(), source: "admin/manual", active: true });
    if (error) return toast({ title: "Rule failed", description: error.message, variant: "destructive" });
    toast({ title: "Mixed crop rule added" });
    setPrimary(""); setCompanion(""); setNotes(""); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this crop combination?")) return;
    const { error } = await (supabase as any).from("mixed_crop_rules").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  };
  return <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]"><Card className="p-5"><h3 className="mb-3 font-display text-lg font-bold">Add mixed crop combination</h3><form onSubmit={create} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><div><Label>Main crop</Label><Input value={primary} onChange={(e) => setPrimary(e.target.value)} /></div><div><Label>Companion crop</Label><Input value={companion} onChange={(e) => setCompanion(e.target.value)} /></div></div><div><Label>Compatibility score</Label><Input inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value)} /></div><div><Label>Benefits</Label><Input value={benefits} onChange={(e) => setBenefits(e.target.value)} /></div><div><Label>Notes</Label><Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></div><Button className="w-full">Save combination</Button></form></Card><Card className="overflow-hidden"><div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span className="col-span-5">Pair</span><span className="col-span-2">Score</span><span className="col-span-3">Source</span><span className="col-span-2">Action</span></div>{rows.map((r) => <div key={r.id} className="grid grid-cols-12 items-center gap-2 border-b px-4 py-3 text-sm"><span className="col-span-5 font-medium">{r.primary_crop} + {r.companion_crop}</span><span className="col-span-2">{r.compatibility_score}%</span><span className="col-span-3"><Badge variant="outline">{r.source}</Badge></span><span className="col-span-2"><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></span></div>)}</Card></div>;
}

function UsersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const loadUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id,display_name,preferred_language,created_at,account_status,moderation_reason,moderated_at")
      .order("created_at", { ascending: false })
      .limit(100);
    const { data: roles } = await supabase.from("user_roles").select("user_id,role");
    const map = new Map<string, string[]>();
    (roles ?? []).forEach((r) => map.set(r.user_id, [...(map.get(r.user_id) ?? []), r.role]));
    setRows((profiles ?? []).map((p) => ({ ...p, roles: map.get(p.user_id) ?? [] })));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const setStatus = async (userId: string, account_status: "active" | "suspended" | "banned") => {
    const reason = account_status === "active" ? null : window.prompt(`Reason for ${account_status}?`, account_status === "banned" ? "Policy violation" : "Temporary account review");
    if (account_status !== "active" && !reason) return;
    setBusyUser(userId);
    const { error } = await (supabase.from("profiles") as any)
      .update({ account_status, moderation_reason: reason, moderated_at: account_status === "active" ? null : new Date().toISOString() })
      .eq("user_id", userId);
    setBusyUser(null);
    if (error) {
      toast({ title: "Moderation failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Account updated", description: `User is now ${account_status}.` });
    loadUsers();
  };

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="col-span-3">User</span><span>Lang</span><span className="col-span-2">Roles</span><span className="col-span-2">Status</span><span className="col-span-4">Controls</span>
      </div>
      {rows.map((r) => (
        <div key={r.user_id} className="grid grid-cols-12 items-center gap-2 border-b px-4 py-3 text-sm">
          <span className="col-span-3 min-w-0">
            <p className="truncate font-medium">{r.display_name ?? r.user_id.slice(0, 8)}</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">{r.user_id}</p>
          </span>
          <span>{r.preferred_language}</span>
          <span className="col-span-2 flex flex-wrap gap-1">{r.roles.map((x: string) => <Badge key={x} variant={x === "admin" ? "default" : "secondary"}>{x}</Badge>)}</span>
          <span className="col-span-2">
            <Badge variant={r.account_status === "active" ? "secondary" : "destructive"}>{r.account_status ?? "active"}</Badge>
            {r.moderation_reason && <p className="mt-1 truncate text-[10px] text-muted-foreground">{r.moderation_reason}</p>}
          </span>
          <span className="col-span-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1" disabled={busyUser === r.user_id || r.account_status === "active"} onClick={() => setStatus(r.user_id, "active")}><CheckCircle2 className="h-3.5 w-3.5" />Active</Button>
            <Button size="sm" variant="secondary" className="h-8 gap-1" disabled={busyUser === r.user_id || r.account_status === "suspended"} onClick={() => setStatus(r.user_id, "suspended")}><PauseCircle className="h-3.5 w-3.5" />Suspend</Button>
            <Button size="sm" variant="destructive" className="h-8 gap-1" disabled={busyUser === r.user_id || r.account_status === "banned"} onClick={() => setStatus(r.user_id, "banned")}><Ban className="h-3.5 w-3.5" />Ban</Button>
          </span>
        </div>
      ))}
    </Card>
  );
}

function AuditTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100);
      setRows(data ?? []);
    })();
  }, []);
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-5 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>When</span><span>Actor</span><span>Action</span><span>Target</span><span>Meta</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-5 gap-2 border-b px-4 py-2 text-xs">
          <span>{new Date(r.created_at).toLocaleString()}</span>
          <span className="truncate">{r.actor_id?.slice(0, 8) ?? "system"}</span>
          <span className="font-semibold">{r.action}</span>
          <span className="truncate">{r.target ?? "—"}</span>
          <span className="truncate font-mono text-[10px]">{JSON.stringify(r.meta)}</span>
        </div>
      ))}
      {!rows.length && <p className="p-4 text-sm text-muted-foreground">No audit entries yet.</p>}
    </Card>
  );
}

export default Admin;
