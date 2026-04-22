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

const Auth = () => {
  const nav = useNavigate();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [resetEmail, setResetEmail] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setBusy(false);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: "Account created — you're in!" });
    nav("/dashboard");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast({ title: error.message, variant: "destructive" });
    nav("/dashboard");
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast({ title: error.message, variant: "destructive" });
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

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full gap-2" onClick={handleGoogle}>
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A11.01 11.01 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            {t("continue_with_google")}
          </Button>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
