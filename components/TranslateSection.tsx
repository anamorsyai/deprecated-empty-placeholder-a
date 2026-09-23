"use client";

import { useState } from "react";

interface Props {
  /** Stable id used for the translation cache (the writeup id is perfect). */
  cacheId: string;
  /** English text. Null when this side was never produced. */
  en: string | null;
  /** Arabic text (legacy archive, or previously translated). Null when absent. */
  ar: string | null;
  className?: string;
}

// Bilingual reader: shows English by default (Arabic when that's all there
// is), with a one-press translation via the free MyMemory service — no AI,
// no key. Translations are cached in localStorage so each paragraph is
// translated once per browser, and long texts are chunked because the free
// endpoint caps a single request at ~500 chars.
export default function TranslateSection({ cacheId, en, ar, className }: Props) {
  const initialLang = en ? "en" : "ar";
  const [lang, setLang] = useState<"en" | "ar">(initialLang);
  const [live, setLive] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const shown = lang === "en" ? en || live["en"] : ar || live["ar"];

  async function toggle() {
    const target = lang === "en" ? "ar" : "en";
    const haveStored = target === "en" ? en : ar;
    if (haveStored || live[target]) {
      setLang(target);
      setFailed(false);
      return;
    }
    const source = target === "ar" ? en : ar;
    if (!source) return;
    setBusy(true);
    setFailed(false);
    try {
      const text = await translateService(source, target, `${cacheId}`);
      setLive((m) => ({ ...m, [target]: text }));
      setLang(target);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  // The button shows whenever there is text on screen: the other side is
  // either stored already or can be translated live from what is shown.
  const canToggle = Boolean(shown);
  if (!shown) return null;

  return (
    <div>
      {shown && (
        <p dir="auto" className={className || "whitespace-pre-line break-words text-[15px] leading-[1.9] sm:text-base"}>
          {shown}
        </p>
      )}
      {canToggle && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className="inline-flex min-h-[36px] items-center rounded-lg border border-border bg-surface2/60 px-3 text-xs font-bold text-muted transition hover:border-primary/60 hover:text-primary disabled:opacity-60"
          >
            {busy ? "Translating…" : lang === "en" ? "🌐 عربي" : "🌐 English"}
          </button>
          {failed && <span className="text-xs text-muted">Translation unavailable right now — try again later.</span>}
        </div>
      )}
    </div>
  );
}

function chunkKey(text: string, target: string) {
  let h = 0;
  const s = `${target}:${text}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `bbr-tr-${(h >>> 0).toString(36)}`;
}

function splitChunks(text: string, max = 450): string[] {
  const parts = text.split(/(?<=[.!?؟…])\s+/);
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + " " + p).trim().length > max && cur) {
      out.push(cur.trim());
      cur = p;
    } else {
      cur = (cur + " " + p).trim();
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.length ? out : [text];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function translateService(text: string, target: "ar" | "en", cacheId: string): Promise<string> {
  const pair = target === "ar" ? "en|ar" : "ar|en";
  const out: string[] = [];
  for (const chunk of splitChunks(text)) {
    const key = `${cacheId}:${chunkKey(chunk, target)}`;
    try {
      const hit = localStorage.getItem(key);
      if (hit) {
        out.push(hit);
        continue;
      }
    } catch {
      /* storage unavailable — just translate */
    }
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${pair}`
    );
    if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
    const data = await res.json();
    const t = data?.responseData?.translatedText;
    if (!t || /MYMEMORY WARNING|INVALID/i.test(t)) throw new Error("translate rejected");
    try {
      localStorage.setItem(key, t);
    } catch {
      /* ignore quota errors */
    }
    out.push(t);
    await sleep(300);
  }
  return out.join(" ");
}
