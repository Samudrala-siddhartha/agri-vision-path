import { useLang } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  none: "bg-success/15 text-success border-success/30",
  low: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-warning/20 text-warning border-warning/40",
  high: "bg-danger/15 text-danger border-danger/30",
};

export function SeverityBadge({ severity }: { severity?: string | null }) {
  const { t } = useLang();
  const key = (severity ?? "none").toLowerCase();
  const labelKey = (["none", "low", "medium", "high"].includes(key) ? key : "none") as "none" | "low" | "medium" | "high";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide", styles[labelKey])}>
      {t(labelKey)}
    </span>
  );
}
