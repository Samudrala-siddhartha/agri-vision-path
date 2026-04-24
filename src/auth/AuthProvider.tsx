import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIdleLogout } from "./useIdleLogout";

type Ctx = {
  user: User | null;
  session: Session | null;
  accountStatus: "active" | "suspended" | "banned" | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [accountStatus, setAccountStatus] = useState<"active" | "suspended" | "banned" | null>(null);
  const [loading, setLoading] = useState(true);

  const syncProfileStatus = async (uid?: string) => {
    if (!uid) { setAccountStatus(null); return; }
    const { data } = await (supabase.from("profiles") as any)
      .select("account_status")
      .eq("user_id", uid)
      .maybeSingle();
    setAccountStatus(data?.account_status ?? "active");
  };

  useEffect(() => {
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setTimeout(() => syncProfileStatus(s?.user?.id), 0);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      syncProfileStatus(s?.user?.id).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };
  const signOutEverywhere = async () => { await supabase.auth.signOut({ scope: "global" }); };

  // Auto sign-out after 30 minutes of inactivity (only when signed in)
  useIdleLogout(Boolean(user));

  return (
    <AuthContext.Provider value={{ user, session, accountStatus, loading, signOut, signOutEverywhere }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
