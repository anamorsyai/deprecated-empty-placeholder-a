"use client";

import { useState } from "react";

interface Props {
  title: string;
  url: string;
  excerpt: string | null;
  program: string | null;
  categories: string[];
}

interface Lesson {
  cause: string | null;
  walkthrough: string | null;
  example: string | null;
  takeaway: string | null;
  fix: string | null;
}

// Instant on-page explanation: the visitor pastes their OWN free Gemini key
// (kept in their browser only, never sent anywhere except Google), the page
// extracts the article, asks Gemini with the same teaching contract as the
// pipeline, and renders the lesson right here in seconds. The repo's own
// automation teaches the same item canonically later, so this instant read
// is a preview that converges with the stored version.
const TEACH_PROMPT = `You teach bug bounty writeups in ENGLISH to a reader who knows NOTHING — assume they never wrote code and never studied security, while still giving professionals exact payloads to review.
Return ONLY minified JSON, no markdown fences:
{"cause":string,"walkthrough":string,"example":string,"takeaway":string,"fix":string}
Rules:
- Define EVERY technical term on first use (one short plain line each). Break EVERY code/payload/request into pieces and explain what each piece does. State assumptions explicitly ("We assume...").
- walkthrough: Lego-style, 12-24 numbered steps "Step 1...". EVERY step: (a) what the researcher did, (b) VERBATIM code/payload/request on its own line, (c) "Why:" mechanism line + beginner gloss. Group under RECON/DISCOVERY/EXPLOITATION/IMPACT phases when fitting. Cover EVERY attack path in the article.
- example: a parallel training example YOU compose on fictional target.example (vulnerable snippet + attack + why). cause: 4-6 sentences on the root flaw. takeaway: hunter lesson + variants + beginner mistakes. fix: correct fix WITH fixed code snippet when possible.
- HONESTY: article fields ONLY from the content below — "" if too thin. Only "example" may be freely composed.`;

export default function InstantExplain({ title, url, excerpt, program, categories }: Props) {
  const [key, setKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem("bbr-gemini-key");
    } catch {
      return null;
    }
  });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [showKey, setShowKey] = useState(false);

  async function run() {
    const k = (key || "").trim();
    if (!k) {
      setShowKey(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const content = await extractArticle(url, excerpt);
      const userPrompt = [
        `Title: ${title}`,
        program ? `Program/target: ${program}` : null,
        `Categories: ${categories.join(", ")}`,
        `Article content (teach ONLY from this):\n${content.slice(0, 9000)}`,
      ]
        .filter(Boolean)
        .join("\n");
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(k)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${TEACH_PROMPT}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 6500 },
          }),
        }
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${t.slice(0, 160)}`);
      }
      const data = await res.json();
      const raw: string = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") || "";
      const parsed = parseJson(raw);
      if (!parsed || !parsed.walkthrough) throw new Error("Empty lesson returned — try again.");
      setLesson({
        cause: parsed.cause || null,
        walkthrough: parsed.walkthrough || null,
        example: parsed.example || null,
        takeaway: parsed.takeaway || null,
        fix: parsed.fix || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  function saveKey() {
    const k = draft.trim();
    if (!k) return;
    try {
      localStorage.setItem("bbr-gemini-key", k);
    } catch {
      /* ignore */
    }
    setKey(k);
    setShowKey(false);
  }

  function forgetKey() {
    try {
      localStorage.removeItem("bbr-gemini-key");
    } catch {
      /* ignore */
    }
    setKey(null);
    setDraft("");
  }

  return (
    <div className="mb-6 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 sm:p-5">
      <h2 className="mb-1 text-sm font-bold text-primary">⚡ Instant explanation</h2>
      {!lesson ? (
        <>
          <p className="mb-3 text-sm leading-relaxed text-muted">
            No stored breakdown yet. Generate one right now with your own free Gemini key — it renders here in
            seconds, and the repo teaches it canonically later on its own.
          </p>
          {(showKey || !key) && (
            <div className="mb-3 flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="password"
                  value={key && !showKey ? key : draft}
                  onChange={(e) => (key && !showKey ? setKey(e.target.value) : setDraft(e.target.value))}
                  placeholder="Paste Gemini API key (aistudio.google.com)"
                  className="min-h-[44px] w-full rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={saveKey}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg bg-primary/15 px-4 text-xs font-bold text-primary hover:bg-primary/25"
                >
                  Save key
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-muted">
                Free key from{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary"
                >
                  aistudio.google.com
                </a>{" "}
                (2 minutes, no card). Stored only in this browser — sent to Google alone, never to us.
              </p>
            </div>
          )}
          {key && !showKey && (
            <p className="mb-3 text-[11px] text-muted">
              Key saved in this browser.{" "}
              <button type="button" onClick={() => setShowKey(true)} className="underline hover:text-primary">
                Change
              </button>{" "}
              ·{" "}
              <button type="button" onClick={forgetKey} className="underline hover:text-primary">
                Forget
              </button>
            </p>
          )}
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Teaching… (up to a minute)" : "⚡ Explain now"}
          </button>
          {error && <p className="mt-2 text-xs text-accent">⚠ {error}</p>}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-[11px] text-muted">
            Instant preview generated with your key just now — the stored canonical version lands automatically.
          </p>
          {lesson.walkthrough && (
            <div>
              <h3 className="mb-1 text-sm font-extrabold text-primary">🛠️ Step by step</h3>
              <p dir="auto" className="whitespace-pre-line break-words text-sm leading-[1.9]">
                {lesson.walkthrough}
              </p>
            </div>
          )}
          {lesson.example && (
            <div className="rounded-lg border border-border bg-surface p-3">
              <h3 className="mb-1 text-sm font-bold">🧪 Training example</h3>
              <p dir="auto" className="whitespace-pre-line break-words text-sm leading-relaxed text-muted">
                {lesson.example}
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["🧬 Root cause", lesson.cause],
              ["🎯 Takeaway", lesson.takeaway],
              ["🩹 Fix", lesson.fix],
            ].map(([t, v]) =>
              v ? (
                <div key={t as string} className="rounded-lg border border-border bg-surface p-3">
                  <h4 className="mb-1 text-xs font-bold">{t}</h4>
                  <p dir="auto" className="whitespace-pre-line break-words text-xs leading-relaxed text-muted">
                    {v}
                  </p>
                </div>
              ) : null
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setLesson(null);
              setError(null);
            }}
            className="self-start text-xs text-muted underline hover:text-primary"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

async function extractArticle(url: string, excerpt: string | null): Promise<string> {
  // Jina reader first (full text); fall back to the stored excerpt offline.
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "x-return-format": "markdown" },
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) {
      const text = await res.text();
      const idx = text.indexOf("Markdown Content:");
      const body = (idx >= 0 ? text.slice(idx + 17) : text).replace(/\s+/g, " ").trim();
      if (body.length > 500) return body;
    }
  } catch {
    /* fall through to excerpt */
  }
  if (excerpt && excerpt.length > 100) return excerpt;
  throw new Error("Couldn't extract the article text (page blocks readers).");
}

function parseJson(raw: string): Record<string, string> | null {
  const cleaned = raw
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}
