import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { Eye, EyeOff } from "lucide-react";
import appLogo from "@/assets/app-logo.png";

const ResetPassword = () => {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses recovery hash automatically and emits a session
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast({ title: "Password must be at least 6 characters", variant: "destructive" });
    if (password !== confirm) return toast({ title: "Passwords do not match", variant: "destructive" });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: "Password updated" });
    nav("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col bg-soil">
      <AppHeader />
      <main className="container flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md space-y-3">
        <BackButton />
        <Card className="w-full p-8 shadow-elevated">
          <div className="mb-6 flex flex-col items-center text-center">
            <img src={appLogo} alt="AgriPulse logo" className="mb-3 h-14 w-14 rounded-2xl object-cover shadow-soft" />
            <h1 className="font-display text-2xl font-bold">Reset password</h1>
            <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
          </div>

          {!ready ? (
            <p className="text-center text-sm text-muted-foreground">
              Open this page from the reset link in your email.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="np">New password</Label>
                <div className="relative">
                  <Input id="np" type={show ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide" : "Show"}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp">Confirm password</Label>
                <Input id="cp" type={show ? "text" : "password"} required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="w-full">Update password</Button>
            </form>
          )}
        </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
