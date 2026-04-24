import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const IDLE_MS = 30 * 60 * 1000; // 30 minutes
const EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;

/**
 * Auto sign-out after IDLE_MS of inactivity.
 * Mounted once at the app level when a user session exists.
 */
export function useIdleLogout(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let timer: number | null = null;

    const reset = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        try {
          await supabase.auth.signOut();
          toast({ title: "Signed out", description: "You were signed out due to inactivity." });
        } catch {/* ignore */}
      }, IDLE_MS);
    };

    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (timer) window.clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled]);
}
