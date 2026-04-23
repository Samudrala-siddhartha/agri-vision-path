import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr, type Lang } from "@/i18n/translations";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "agripulse_install_dismissed_at";

export function InstallPrompt() {
  const lang = ((typeof localStorage !== "undefined" && localStorage.getItem("agripulse_lang")) || "en") as Lang;
  const t = (key: Parameters<typeof tr>[0]) => tr(key, lang);
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Dismiss memory: snooze for 7 days
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const snoozed = Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;

    // Detect already installed
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore - iOS Safari
      window.navigator.standalone === true;
    if (standalone || snoozed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS doesn't fire beforeinstallprompt — show a manual hint
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    if (isIOS && isSafari) {
      setIosHint(true);
      setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") setShow(false);
    else dismiss();
  };

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border bg-card/95 p-3 shadow-elevated backdrop-blur">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{t("install_title")}</p>
          <p className="truncate text-xs text-muted-foreground">
            {iosHint ? t("install_ios_hint") : t("install_subtitle")}
          </p>
        </div>
        {!iosHint && (
          <Button size="sm" onClick={install} className="gap-1 rounded-full">
            <Download className="h-4 w-4" />
            {t("install")}
          </Button>
        )}
        <button onClick={dismiss} aria-label="Dismiss" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
