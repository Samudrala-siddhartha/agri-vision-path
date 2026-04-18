import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2 } from "lucide-react";

type Props = { onVerified: () => void };

/**
 * Two-phase MFA gate:
 * 1. If user has no TOTP factor -> enroll (show QR + verify code).
 * 2. If user has factor but session aal=aal1 -> challenge + verify to upgrade to aal2.
 */
export function MfaGate({ onVerified }: Props) {
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"enroll" | "challenge" | "done">("challenge");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === "aal2") {
        setPhase("done");
        setLoading(false);
        onVerified();
        return;
      }
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setPhase("challenge");
      } else {
        // Enroll a new TOTP factor
        const { data: enroll, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "AgriPulse Admin" });
        if (error) {
          toast({ title: "MFA enroll failed", description: error.message, variant: "destructive" });
        } else if (enroll) {
          setFactorId(enroll.id);
          setQr(enroll.totp.qr_code);
          setSecret(enroll.totp.secret);
          setPhase("enroll");
        }
      }
      setLoading(false);
    })();
  }, [onVerified]);

  const verify = async () => {
    if (!factorId || code.length < 6) return;
    setSubmitting(true);
    try {
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr || !ch) throw cErr ?? new Error("challenge failed");
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
      if (vErr) throw vErr;
      toast({ title: "Verified", description: "Admin access granted." });
      setPhase("done");
      onVerified();
    } catch (e: any) {
      toast({ title: "Invalid code", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (phase === "done") return null;

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 shadow-elevated">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-hero">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Admin verification</h2>
            <p className="text-xs text-muted-foreground">Two-factor authentication required</p>
          </div>
        </div>

        {phase === "enroll" && qr && (
          <div className="space-y-3">
            <p className="text-sm">Scan this QR with Google Authenticator / Authy, then enter the 6-digit code.</p>
            <div className="flex justify-center rounded-xl border bg-background p-4">
              <img src={qr} alt="TOTP QR" className="h-44 w-44" />
            </div>
            {secret && <p className="break-all text-center text-[11px] text-muted-foreground">Manual key: {secret}</p>}
          </div>
        )}

        {phase === "challenge" && (
          <p className="mb-3 text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
        )}

        <div className="mt-4 space-y-2">
          <Label htmlFor="code">Authentication code</Label>
          <Input id="code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
        </div>
        <Button onClick={verify} disabled={submitting || code.length < 6} className="mt-4 w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
        </Button>
      </Card>
    </div>
  );
}
