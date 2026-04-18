import { useCallback, useEffect, useState } from "react";
import type { Lang } from "@/i18n/translations";

const localeFor = (lang: Lang) => (lang === "hi" ? "hi-IN" : lang === "te" ? "te-IN" : "en-IN");

export function useSpeak() {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const onEnd = () => setSpeaking(false);
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
      onEnd();
    };
  }, []);

  const stop = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch {}
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, lang: Lang) => {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try { window.speechSynthesis.cancel(); } catch {}
    // Chunk to avoid mobile cutoff at ~200 chars
    const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let buf = "";
    for (const s of sentences) {
      if ((buf + " " + s).length > 180) { if (buf) chunks.push(buf); buf = s; }
      else buf = buf ? `${buf} ${s}` : s;
    }
    if (buf) chunks.push(buf);

    const voices = window.speechSynthesis.getVoices();
    const target = localeFor(lang);
    const voice = voices.find((v) => v.lang?.toLowerCase().startsWith(target.toLowerCase()))
      || voices.find((v) => v.lang?.toLowerCase().startsWith(lang));

    setSpeaking(true);
    chunks.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      u.lang = target;
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.pitch = 1;
      if (i === chunks.length - 1) u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    });
  }, []);

  return { speak, stop, speaking };
}
