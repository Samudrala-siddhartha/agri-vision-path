import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Announcement = {
  id: string;
  title: string;
  message: string;
  show_as_popup: boolean;
};

export function AnnouncementPopup() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("announcements")
        .select("id,title,message,show_as_popup")
        .eq("active", true)
        .eq("show_as_popup", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;
      const dismissed = localStorage.getItem(`announcement:${data.id}:dismissed`);
      if (!dismissed) {
        setAnnouncement(data);
        setOpen(true);
      }
    })();
  }, []);

  const close = () => {
    if (announcement) localStorage.setItem(`announcement:${announcement.id}:dismissed`, "true");
    setOpen(false);
  };

  if (!announcement) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-w-md rounded-3xl border bg-card p-0 shadow-elevated">
        <div className="bg-hero px-6 py-5 text-primary-foreground">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-background/20 backdrop-blur">
            <Megaphone className="h-6 w-6" />
          </div>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">{announcement.title}</DialogTitle>
            <DialogDescription className="text-primary-foreground/85">AgriPulse announcement</DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-5 p-6">
          <p className="whitespace-pre-line text-sm leading-6 text-card-foreground">{announcement.message}</p>
          <Button onClick={close} className="w-full rounded-full">Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}