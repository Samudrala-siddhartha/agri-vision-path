import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Subscribes to profiles table for real-time notifications when a user
 * gets flagged as suspicious. Mounted inside the admin console only.
 */
export function useAdminAlerts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("admin-alerts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const newRow = payload.new as { suspicious?: boolean; display_name?: string; suspicious_reason?: string };
          const oldRow = payload.old as { suspicious?: boolean };
          if (newRow?.suspicious && !oldRow?.suspicious) {
            toast({
              title: "🚨 Suspicious user flagged",
              description: `${newRow.display_name ?? "User"} — ${newRow.suspicious_reason ?? "abnormal activity"}`,
              variant: "destructive",
            });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled]);
}
