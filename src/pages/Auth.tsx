import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { useLang } from "@/i18n/LanguageProvider";
import { Eye, EyeOff } from "lucide-react";
import appLogo from "@/assets/app-logo.png";
import { signInSchema, signUpSchema } from "@/lib/validation";

const trackAttempt = (email: string, success: boolean) => {
  // Best-effort: failures must not block UX
  supabase.functions.invoke("track-auth-attempt", { body: { email, success } }).catch(() => {});
};

const Auth = () => {
  const nav = useNavigate();
  const { t } = useLang();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [resetEmail, setResetEmail] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Invalid input";
      return toast({ title: first, variant: "destructive" });
    }
    const { fullName: cleanName, email: cleanEmail, password: cleanPw } = parsed.data;
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPw,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: cleanName, full_name: cleanName },
      },
    });
    setBusy(false);
    if (error) return toast({ title: error.message, variant: "destructive" });
    if (data.user) {
      await (supabase.from("profiles") as any)
        .update({ display_name: cleanName, last_login_at: new Date().toISOString() })
        .eq("user_id", data.user.id);
    }
    toast({ title: "Account created — you're in!" });
    nav("/dashboard");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Invalid input";
      return toast({ title: first, variant: "destructive" });
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    trackAttempt(parsed.data.email, !error);
    if (error) return toast({ title: error.message, variant: "destructive" });
    if (data.user) {
      (supabase as any).rpc("touch_last_login", { _user_id: data.user.id }).then(() => {});
    }
    nav("/dashboard");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: "Check your email for the reset link" });
    setMode("signin");
  };

  const pwToggle = (
    <button
      type="button"
      onClick={() => setShowPw((v) => !v)}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      aria-label={showPw ? "Hide password" : "Show password"}
    >
      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-soil">
      <AppHeader />
      <main className="container flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md space-y-3">
          <BackButton to="/" />
          <Card className="w-full p-8 shadow-elevated">
            <div className="mb-6 flex flex-col items-center text-center">
            <img src={appLogo} alt="AgriPulse logo" className="mb-3 h-14 w-14 rounded-2xl object-cover shadow-soft" />
            <h1 className="font-display text-2xl font-bold">{t("app_name")}</h1>
            <p className="text-sm text-muted-foreground">{t("app_tagline")}</p>
          </div>

          {mode === "forgot" ? (
            <form onSubmit={handleForgot} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="fp-email">{t("email")}</Label>
                <Input id="fp-email" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                <p className="text-xs text-muted-foreground">We'll email you a secure link to reset your password.</p>
              </div>
              <Button type="submit" disabled={busy} className="w-full">Send reset link</Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("signin")}>
                Back to sign in
              </Button>
            </form>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t("sign_in")}</TabsTrigger>
                <TabsTrigger value="signup">{t("sign_up")}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">{t("email")}</Label>
                    <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="si-pw">{t("password")}</Label>
                      <button
                        type="button"
                        onClick={() => { setResetEmail(email); setMode("forgot"); }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input id="si-pw" type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                      {pwToggle}
                    </div>
                  </div>
                  <Button type="submit" disabled={busy} className="w-full">{t("sign_in")}</Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Full name</Label>
                    <Input id="su-name" type="text" required minLength={2} maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">{t("email")}</Label>
                    <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pw">{t("password")}</Label>
                    <div className="relative">
                      <Input id="su-pw" type={showPw ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                      {pwToggle}
                    </div>
                  </div>
                  <Button type="submit" disabled={busy} className="w-full">{t("sign_up")}</Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
