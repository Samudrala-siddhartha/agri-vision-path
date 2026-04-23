import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Images, Leaf, Loader2, Sprout, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BackButton } from "@/components/BackButton";
import { ChatbotFAB } from "@/components/ChatbotFAB";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LanguageProvider";
import landingHero from "@/assets/landing-hero.jpg";

type Method = {
  id: string;
  category: string;
  title: string;
  slug: string;
  description: string;
  benefits: string[];
  example_crops: string[];
  use_cases: string[];
  cover_image_url: string | null;
};
type MethodImage = { id: string; method_id: string; image_url: string; caption: string | null; sort_order: number };

export default function FarmingMethods() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { t } = useLang();
  const [methods, setMethods] = useState<Method[]>([]);
  const [images, setImages] = useState<MethodImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: imgs }] = await Promise.all([
        (supabase as any).from("farming_methods").select("id,category,title,slug,description,benefits,example_crops,use_cases,cover_image_url").order("category"),
        (supabase as any).from("farming_method_images").select("id,method_id,image_url,caption,sort_order").order("sort_order"),
      ]);
      setMethods(m ?? []);
      setImages(imgs ?? []);
      setLoading(false);
    })();
  }, []);

  const selected = useMemo(() => methods.find((m) => m.slug === slug), [methods, slug]);
  const selectedImages = selected ? images.filter((img) => img.method_id === selected.id) : [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container flex-1 space-y-6 py-6">
        <BackButton to="/dashboard" />
        {!selected ? (
          <>
            <section className="relative min-h-[280px] overflow-hidden rounded-3xl bg-card shadow-soft">
              <img src={landingHero} alt="Farming field" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-foreground/50" />
              <div className="relative flex min-h-[280px] max-w-2xl flex-col justify-end p-6 text-primary-foreground sm:p-8">
                <p className="text-sm font-bold uppercase tracking-wide opacity-85">{t("farming_methods")}</p>
                <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Real farming systems, practical field use</h1>
                <p className="mt-3 text-sm opacity-90">Explore integrated farming, intercropping, organic systems, and agroforestry with visual examples and benefits.</p>
              </div>
            </section>
            {loading ? <Card className="p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></Card> : (
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {methods.map((m) => <MethodCard key={m.id} method={m} image={images.find((img) => img.method_id === m.id)?.image_url} onOpen={() => nav(`/methods/${m.slug}`)} />)}
              </section>
            )}
          </>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="space-y-5">
              <div className="overflow-hidden rounded-3xl shadow-soft">
                <img src={selectedImages[0]?.image_url ?? selected.cover_image_url ?? landingHero} alt={selected.title} loading="lazy" className="h-72 w-full object-cover" />
              </div>
              <div><Badge>{selected.category}</Badge><h1 className="mt-3 font-display text-4xl font-extrabold">{selected.title}</h1><p className="mt-3 text-muted-foreground">{selected.description}</p></div>
              <InfoGrid method={selected} />
            </div>
            <Card className="h-fit rounded-3xl p-5 shadow-soft">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold"><Images className="h-5 w-5 text-primary" /> Field gallery</h2>
              <div className="grid gap-3">
                {(selectedImages.length ? selectedImages : [{ id: "fallback", image_url: landingHero, caption: selected.title } as MethodImage]).map((img) => (
                  <figure key={img.id} className="overflow-hidden rounded-2xl border bg-card"><img src={img.image_url} alt={img.caption ?? selected.title} loading="lazy" className="h-40 w-full object-cover" />{img.caption && <figcaption className="p-3 text-xs text-muted-foreground">{img.caption}</figcaption>}</figure>
                ))}
              </div>
            </Card>
          </section>
        )}
      </main>
      <Footer />
      <ChatbotFAB />
    </div>
  );
}

function MethodCard({ method, image, onOpen }: { method: Method; image?: string; onOpen: () => void }) {
  return <Card className="overflow-hidden rounded-3xl shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated"><img src={image ?? method.cover_image_url ?? landingHero} alt={method.title} loading="lazy" className="h-44 w-full object-cover" /><div className="space-y-3 p-4"><Badge variant="secondary">{method.category}</Badge><h2 className="font-display text-xl font-bold">{method.title}</h2><p className="line-clamp-3 text-sm text-muted-foreground">{method.description}</p><Button onClick={onOpen} className="w-full rounded-full">Open <ArrowRight className="ml-2 h-4 w-4" /></Button></div></Card>;
}

function InfoGrid({ method }: { method: Method }) {
  const groups = [
    { icon: TrendingUp, title: "Benefits", values: method.benefits },
    { icon: Sprout, title: "Example crops", values: method.example_crops },
    { icon: Leaf, title: "Real use cases", values: method.use_cases },
  ];
  return <div className="grid gap-4 md:grid-cols-3">{groups.map((g) => <Card key={g.title} className="rounded-3xl p-4"><g.icon className="mb-3 h-6 w-6 text-primary" /><h3 className="font-display font-bold">{g.title}</h3><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{g.values.map((v) => <li key={v}>• {v}</li>)}</ul></Card>)}</div>;
}
