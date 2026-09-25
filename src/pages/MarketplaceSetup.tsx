import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, LocateFixed, MapPin, ShieldCheck, Store, UserRound } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { supabase } from "@/integrations/supabase/client";

type AccountType = "farmer" | "consumer";
type FarmerStatus = "pending" | "approved" | "rejected" | "suspended";

type FarmerForm = {
  farmer_name: string;
  locality: string;
  city: string;
  state: string;
  production_method: "organic" | "farmer_declared_organic" | "conventional";
  description: string;
  profile_image_url: string;
  farm_image_url: string;
};

const emptyFarmer: FarmerForm = {
  farmer_name: "",
  locality: "",
  city: "",
  state: "",
  production_method: "conventional",
  description: "",
  profile_image_url: "",
  farm_image_url: "",
};

export default function MarketplaceSetup() {
  const { user } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [hasAccountProfile, setHasAccountProfile] = useState(false);
  const [status, setStatus] = useState<FarmerStatus | null>(null);
  const [farmer, setFarmer] = useState<FarmerForm>(emptyFarmer);
  const [upiId, setUpiId] = useState("");
  const [payoutName, setPayoutName] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [pincode, setPincode] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: account }, { data: profile }, { data: location }, { data: payment }] = await Promise.all([
        (supabase.from("marketplace_account_profiles") as any).select("account_type").eq("user_id", user.id).maybeSingle(),
        (supabase.from("farmer_profiles") as any).select("farmer_name,locality,city,state,production_method,description,profile_image_url,farm_image_url,farmer_status").eq("user_id", user.id).maybeSingle(),
        (supabase.from("farmer_locations") as any).select("address_line,pincode,latitude,longitude").eq("user_id", user.id).maybeSingle(),
        (supabase.from("farmer_payment_profiles") as any).select("upi_id,payout_name,qr_image_url").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (account?.account_type === "farmer" || account?.account_type === "consumer") {
        setAccountType(account.account_type);
        setHasAccountProfile(true);
      }
      if (profile) {
        setStatus(profile.farmer_status);
        setFarmer({ ...emptyFarmer, ...profile });
      }
      if (location) {
        setAddressLine(location.address_line ?? "");
        setPincode(location.pincode ?? "");
        if (typeof location.latitude === "number" && typeof location.longitude === "number") {
          setCoordinates({ latitude: location.latitude, longitude: location.longitude });
        }
      }
      if (payment) {
        setUpiId(payment.upi_id ?? "");
        setPayoutName(payment.payout_name ?? "");
        setQrImageUrl(payment.qr_image_url ?? "");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const chooseType = async (next: AccountType) => {
    if (!user || hasAccountProfile) return;
    setSaving(true);
    const { error } = await (supabase.from("marketplace_account_profiles") as any).insert({ user_id: user.id, account_type: next });
    setSaving(false);
    if (error) return toast({ title: t("setup_failed"), description: error.message, variant: "destructive" });
    setAccountType(next);
    setHasAccountProfile(true);
    toast({ title: t("account_type_saved") });
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return toast({ title: t("location_unavailable"), variant: "destructive" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: Number(coords.latitude.toFixed(2)), longitude: Number(coords.longitude.toFixed(2)) });
        toast({ title: t("location_saved") });
      },
      () => toast({ title: t("location_permission_needed"), variant: "destructive" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  const saveFarmerSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (!farmer.farmer_name.trim() || !farmer.locality.trim() || !upiId.trim()) {
      return toast({ title: t("complete_required_fields"), variant: "destructive" });
    }
    setSaving(true);
    const profilePayload = {
      user_id: user.id,
      farmer_name: farmer.farmer_name.trim().slice(0, 100),
      locality: farmer.locality.trim().slice(0, 120),
      city: farmer.city.trim().slice(0, 100) || null,
      state: farmer.state.trim().slice(0, 100) || null,
      production_method: farmer.production_method,
      description: farmer.description.trim().slice(0, 1000) || null,
      profile_image_url: farmer.profile_image_url.trim().slice(0, 500) || null,
      farm_image_url: farmer.farm_image_url.trim().slice(0, 500) || null,
    };
    const { error: profileError } = await (supabase.from("farmer_profiles") as any).upsert(profilePayload, { onConflict: "user_id" });
    if (profileError) {
      setSaving(false);
      return toast({ title: t("save_failed"), description: profileError.message, variant: "destructive" });
    }
    const { error: paymentError } = await (supabase.from("farmer_payment_profiles") as any).upsert({
      user_id: user.id,
      upi_id: upiId.trim().slice(0, 120),
      payout_name: payoutName.trim().slice(0, 120) || farmer.farmer_name.trim().slice(0, 100),
      qr_image_url: qrImageUrl.trim().slice(0, 500) || null,
    }, { onConflict: "user_id" });
    if (paymentError) {
      setSaving(false);
      return toast({ title: t("save_failed"), description: paymentError.message, variant: "destructive" });
    }
    if (addressLine.trim() || pincode.trim() || coordinates) {
      const { error: locationError } = await (supabase.from("farmer_locations") as any).upsert({
        user_id: user.id,
        address_line: addressLine.trim().slice(0, 250) || null,
        pincode: pincode.trim().slice(0, 12) || null,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
      }, { onConflict: "user_id" });
      if (locationError) {
        setSaving(false);
        return toast({ title: t("save_failed"), description: locationError.message, variant: "destructive" });
      }
    }
    setSaving(false);
    setStatus(status ?? "pending");
    toast({ title: t("farmer_application_saved"), description: t("farmer_application_saved_body") });
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">…</div>;

  return (
    <div className="min-h-screen bg-soil">
      <AppHeader />
      <main className="container max-w-4xl space-y-6 py-8">
        <BackButton to="/dashboard" />
        <div>
          <p className="text-sm font-semibold text-primary">{t("marketplace")}</p>
          <h1 className="font-display text-3xl font-extrabold">{t("marketplace_setup")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("marketplace_setup_body")}</p>
        </div>

        {!accountType ? (
          <Card className="p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-3"><Store className="h-6 w-6 text-primary" /><div><h2 className="font-display text-xl font-bold">{t("choose_account_type")}</h2><p className="text-sm text-muted-foreground">{t("choose_account_type_body")}</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" disabled={saving} onClick={() => chooseType("farmer")} className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-primary/20 bg-card p-4 text-center transition hover:-translate-y-0.5 hover:border-primary hover:shadow-soft"><Store className="h-8 w-8 text-primary" /><span className="font-bold">{t("farmer_account")}</span><span className="text-xs text-muted-foreground">{t("farmer_account_body")}</span></button>
              <button type="button" disabled={saving} onClick={() => chooseType("consumer")} className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-primary/20 bg-card p-4 text-center transition hover:-translate-y-0.5 hover:border-primary hover:shadow-soft"><UserRound className="h-8 w-8 text-primary" /><span className="font-bold">{t("consumer_account")}</span><span className="text-xs text-muted-foreground">{t("consumer_account_body")}</span></button>
            </div>
          </Card>
        ) : accountType === "consumer" ? (
          <Card className="p-6 shadow-soft"><div className="flex items-start gap-4"><UserRound className="mt-1 h-7 w-7 text-primary" /><div><Badge variant="secondary">{t("consumer_account")}</Badge><h2 className="mt-3 font-display text-xl font-bold">{t("consumer_ready")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("consumer_ready_body")}</p><Button className="mt-5 rounded-full" onClick={() => nav("/dashboard")}>{t("continue_dashboard")}</Button></div></div></Card>
        ) : (
          <form onSubmit={saveFarmerSetup} className="space-y-5">
            <Card className="p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-xl font-bold">{t("farmer_profile")}</h2><p className="text-sm text-muted-foreground">{t("farmer_profile_body")}</p></div>{status && <Badge variant={status === "approved" ? "secondary" : status === "rejected" || status === "suspended" ? "destructive" : "outline"}>{t(`farmer_status_${status}` as any)}</Badge>}</div>
              {status === "approved" && <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary/40 p-3 text-sm"><Check className="h-4 w-4 text-primary" />{t("farmer_approved_body")}</div>}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="farmer-name">{t("farmer_name")} *</Label><Input id="farmer-name" value={farmer.farmer_name} onChange={(e) => setFarmer({ ...farmer, farmer_name: e.target.value })} maxLength={100} /></div>
                <div className="space-y-2"><Label htmlFor="locality">{t("locality")} *</Label><Input id="locality" value={farmer.locality} onChange={(e) => setFarmer({ ...farmer, locality: e.target.value })} maxLength={120} /></div>
                <div className="space-y-2"><Label htmlFor="city">{t("city")}</Label><Input id="city" value={farmer.city} onChange={(e) => setFarmer({ ...farmer, city: e.target.value })} maxLength={100} /></div>
                <div className="space-y-2"><Label htmlFor="state">{t("state")}</Label><Input id="state" value={farmer.state} onChange={(e) => setFarmer({ ...farmer, state: e.target.value })} maxLength={100} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>{t("production_method")}</Label><Select value={farmer.production_method} onValueChange={(value) => setFarmer({ ...farmer, production_method: value as FarmerForm["production_method"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="organic">{t("production_organic")}</SelectItem><SelectItem value="farmer_declared_organic">{t("production_farmer_declared")}</SelectItem><SelectItem value="conventional">{t("production_conventional")}</SelectItem></SelectContent></Select></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="description">{t("farm_description")}</Label><Textarea id="description" rows={4} value={farmer.description} onChange={(e) => setFarmer({ ...farmer, description: e.target.value })} maxLength={1000} /></div>
                <div className="space-y-2"><Label htmlFor="profile-image">{t("profile_image_url")}</Label><Input id="profile-image" type="url" value={farmer.profile_image_url} onChange={(e) => setFarmer({ ...farmer, profile_image_url: e.target.value })} placeholder="https://…" /></div>
                <div className="space-y-2"><Label htmlFor="farm-image">{t("farm_image_url")}</Label><Input id="farm-image" type="url" value={farmer.farm_image_url} onChange={(e) => setFarmer({ ...farmer, farm_image_url: e.target.value })} placeholder="https://…" /></div>
              </div>
            </Card>

            <Card className="p-5 shadow-soft"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 text-primary" /><div><h2 className="font-display text-xl font-bold">{t("payment_settings")}</h2><p className="text-sm text-muted-foreground">{t("payment_settings_body")}</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="upi">{t("upi_id")} *</Label><Input id="upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@bank" maxLength={120} /></div><div className="space-y-2"><Label htmlFor="payout-name">{t("payout_name")}</Label><Input id="payout-name" value={payoutName} onChange={(e) => setPayoutName(e.target.value)} maxLength={120} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="qr-url">{t("qr_image_url")}</Label><Input id="qr-url" type="url" value={qrImageUrl} onChange={(e) => setQrImageUrl(e.target.value)} placeholder="https://…" /><p className="text-xs text-muted-foreground">{t("qr_image_hint")}</p></div></div></Card>

            <Card className="p-5 shadow-soft"><div className="flex items-start gap-3"><MapPin className="mt-1 h-5 w-5 text-primary" /><div><h2 className="font-display text-xl font-bold">{t("private_location")}</h2><p className="text-sm text-muted-foreground">{t("private_location_body")}</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="address">{t("address_line")}</Label><Input id="address" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} maxLength={250} /></div><div className="space-y-2"><Label htmlFor="pincode">{t("pincode")}</Label><Input id="pincode" inputMode="numeric" value={pincode} onChange={(e) => setPincode(e.target.value)} maxLength={12} /></div><div className="flex items-end"><Button type="button" variant="outline" className="w-full gap-2" onClick={detectLocation}><LocateFixed className="h-4 w-4" />{t("use_my_location")}</Button></div></div>{coordinates && <p className="mt-3 text-xs text-muted-foreground">{t("location_approx_saved")}: {coordinates.latitude}, {coordinates.longitude}</p>}<Separator className="my-5" /><p className="text-xs text-muted-foreground">{t("location_privacy_note")}</p></Card>

            <Button type="submit" disabled={saving} className="h-12 w-full rounded-full text-base">{saving ? t("saving") : t("submit_farmer_application")}</Button>
          </form>
        )}
      </main>
    </div>
  );
}
