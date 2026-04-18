import { useEffect, useRef, useState } from "react";
import { Camera, X, RotateCcw, Check, FlipHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang } from "@/i18n/LanguageProvider";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCapture: (file: File) => void;
};

export function CameraCapture({ open, onOpenChange, onCapture }: Props) {
  const { t } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [starting, setStarting] = useState(false);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async (mode: "environment" | "user") => {
    setStarting(true);
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      toast({ title: "Camera unavailable", description: err?.message ?? "Permission denied", variant: "destructive" });
      onOpenChange(false);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (open) {
      setPreview(null); setPreviewBlob(null);
      start(facing);
    } else {
      stop();
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null); setPreviewBlob(null);
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && !preview) start(facing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const snap = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setPreviewBlob(blob);
      setPreview(URL.createObjectURL(blob));
      stop();
    }, "image/jpeg", 0.92);
  };

  const accept = () => {
    if (!previewBlob) return;
    const file = new File([previewBlob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture(file);
    onOpenChange(false);
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null); setPreviewBlob(null);
    start(facing);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2"><Camera className="h-4 w-4 text-primary" />{t("open_camera")}</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-[3/4] bg-black">
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.img
                key="preview"
                src={preview}
                alt="capture preview"
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <motion.video
                key="video"
                ref={videoRef}
                playsInline
                muted
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </AnimatePresence>
          {starting && !preview && (
            <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">…</div>
          )}
          {/* leaf framing guide */}
          {!preview && (
            <div className="pointer-events-none absolute inset-6 rounded-3xl border-2 border-white/40" />
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t bg-background p-3">
          {preview ? (
            <>
              <Button variant="outline" onClick={retake} className="gap-2"><RotateCcw className="h-4 w-4" />{t("retake")}</Button>
              <Button onClick={accept} className="gap-2"><Check className="h-4 w-4" />{t("use_photo")}</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label={t("close")}>
                <X className="h-5 w-5" />
              </Button>
              <Button onClick={snap} size="lg" className="gap-2 rounded-full px-6 shadow-elevated">
                <Camera className="h-5 w-5" />{t("capture")}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))} aria-label={t("switch_camera")}>
                <FlipHorizontal className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
