import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { Lang, tr } from "@/i18n/translations";

export function OfflineBanner() {
  const lang = (typeof localStorage !== "undefined" && localStorage.getItem("agripulse_lang")) as Lang | null;
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;
  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-warning/95 px-3 py-1.5 text-xs font-medium text-accent-foreground shadow">
      <WifiOff className="h-3.5 w-3.5" />
      {tr("offline_banner", lang ?? "en")}
    </div>
  );
}
