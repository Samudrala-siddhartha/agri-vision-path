import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";

export function BackButton({ to, className }: { to?: string; className?: string }) {
  const nav = useNavigate();
  const { t } = useLang();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => (to ? nav(to) : nav(-1))}
      className={`gap-2 ${className ?? ""}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {t("back")}
    </Button>
  );
}
