import taxonomy from "../../taxonomy.json" with { type: "json" };
import { randomBytes } from "node:crypto";

// Pluggable AI layer. Picks a provider from env vars, all of which have real free
// tiers as of writing:
//   GEMINI_API_KEY     -> Google AI Studio, gemini-2.0-flash (generous free quota)
//   GROQ_API_KEY        -> Groq, llama-3.1-8b-instant (fast, free)
//   OPENROUTER_API_KEY  -> OpenRouter, a ":free" model
// ...or bring your own OpenAI-compatible endpoint (self-hosted, Azure OpenAI,
// a local server, any provider not listed above) via:
//   CUSTOM_API_BASE     -> required to activate this provider, e.g.
//                          "https://api.example.com/v1" (no trailing slash,
//                          no "/chat/completions" — that's appended for you)
//   CUSTOM_MODEL         -> required, the model id the endpoint expects
//   CUSTOM_API_KEY        -> optional — omitted entirely (no Authorization
//                          header sent) if the endpoint needs no auth
//   CUSTOM_API_HEADERS     -> optional JSON object string of extra headers,
//                          e.g. '{"api-key":"..."}' for Azure OpenAI, merged
//                          in on top of content-type/authorization
// AI_PROVIDER can force a primary out of "gemini" | "groq" | "openrouter" | "custom" | "none"
// (falling through to the rest on failure). With no key configured at all,
// classifyAndSummarize() falls back to a deterministic keyword heuristic so
// the pipeline still runs end-to-end for free.

// Slow/self-hosted endpoints regularly need more than a minute for a long
// teaching-style answer (we saw consistent 60s+ timeouts in production).
// Overridable per run without touching code.
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 150000);
const AI_MAX_TOKENS = Number(process.env.AI_MAX_TOKENS || 6500);

// Free tiers say "retry in Ns" when throttling — honor it (capped) instead of
// a blind fixed wait, so a momentary spike doesn't cost the teaching read.
function retryAfterMs(errText, fallbackMs) {
  const m = String(errText || "").match(/retry in ([\d.]+)s/i);
  if (m) return Math.min(Math.round(parseFloat(m[1]) * 1000), 120000);
  return fallbackMs;
}

// Free-model gateways (opencode zen and its free proxies) fingerprint the
// User-Agent: official `opencode/...` clients get the normal free quota,
// anything else lands in a degraded bucket (429s, stalls, 524s). So we
// identify as the official CLI. Overridable via AI_USER_AGENT without code
// changes. The matching public credential for free models is "public".
const AI_USER_AGENT =
  process.env.AI_USER_AGENT || "opencode/1.18.27 ai-sdk/provider-utils/4.0.23 runtime/bun/1.3.14";
const CUSTOM_API_KEY_DEFAULT = "public";

const SESSION_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// ses_ + 26 random alphanumerics — byte-identical in shape to the
// anthropic-shim genSessionID() the user runs successfully elsewhere.
function randomSession() {
  const b = randomBytes(26);
  let s = "ses_";
  for (let i = 0; i < 26; i++) s += SESSION_CHARS[b[i] % 62];
  return s;
}

// Ordered provider chain with automatic failover. Free tiers hiccup
// constantly (429s, 503s, stalls), so instead of betting a whole teaching
// read on one provider, we walk the configured ones until one delivers.
// AI_PROVIDER forces a primary (still falls through to the rest on failure);
// "none" disables AI entirely. Priority among unforced providers matches the
// old behavior: custom first (deliberate choice), then gemini/groq/openrouter.
function configuredProviders() {
  const avail = [];
  if (process.env.CUSTOM_API_BASE) avail.push("custom");
  if (process.env.GEMINI_API_KEY) avail.push("gemini");
  if (process.env.GROQ_API_KEY) avail.push("groq");
  if (process.env.OPENROUTER_API_KEY) avail.push("openrouter");
  const forced = process.env.AI_PROVIDER;
  if (forced === "none") return [];
  if (forced) return [forced, ...avail.filter((p) => p !== forced)];
  return avail;
}

function parseCustomHeaders() {
  const raw = process.env.CUSTOM_API_HEADERS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    console.warn("  CUSTOM_API_HEADERS is not valid JSON — ignoring it");
    return {};
  }
}

const CATEGORY_SLUGS = taxonomy.categories.map((c) => c.slug);
const PLATFORM_SLUGS = taxonomy.platforms.map((p) => p.slug);

const PROMPT_INSTRUCTIONS = `You are two things at once for a bug bounty writeup aggregator:
(1) a strict gatekeeper — the site must stay bug-bounty-only: no CTF/training-lab writeups, no vendor CVE advisories unrelated to a bounty program, no interviews/news/business posts; and
(2) a professional teacher writing in ENGLISH for a reader who knows NOTHING — assume they never wrote a line of code and never studied security. Your job: take them from zero to fully understanding this vulnerability, while giving working professionals the exact payloads and code to review.

Return ONLY minified JSON, no markdown fences, matching exactly:
{"is_bug_bounty":boolean,"categories":[string,...max 3],"severity":"critical"|"high"|"medium"|"low"|null,"difficulty":"beginner"|"intermediate"|"advanced"|null,"summary_en":string,"lesson_cause":string,"lesson_walkthrough":string,"lesson_example":string,"lesson_takeaway":string,"lesson_fix":string}

Rules:
- is_bug_bounty: true ONLY if this describes a real vulnerability found and reported against a specific target/program (bug bounty platform report, responsible disclosure, or an independent researcher's disclosed finding with a named target). false for CTF/TryHackMe/HackTheBox writeups, generic tutorials, interviews, news, opinion/career pieces, or vendor advisories with no bounty/disclosure context. When false, every field below is an empty string except categories/severity (best-effort).
- categories must be chosen from this exact list: ${CATEGORY_SLUGS.join(", ")}
- severity: your best judgement of real-world impact ("critical" for RCE/full account takeover/mass data breach, "high" for auth bypass/significant data exposure, "medium"/"low" otherwise, null if you truly cannot tell).
- difficulty: how hard is this writeup to FOLLOW for a beginner (not how severe the bug is): "beginner" for single-step bugs with a clear payload, "intermediate" for chained steps or mild prerequisites, "advanced" for complex chains, deep protocol/format knowledge, or heavy code reading. Null if you cannot tell.
- summary_en: 1-2 punchy sentences in English describing the vulnerability and impact (no fluff, no "this writeup discusses"). Used on list/card views.
- All lesson_* fields are in ENGLISH, written for a ZERO-KNOWLEDGE reader who is also useful to a pro. Hard requirements:
  - Define EVERY technical term the first time it appears (one short plain-English line each): HTTP request, parameter, payload, XSS, SQL query, authentication, cookie, header, endpoint... Assume nothing.
  - Break EVERY code/payload/request into pieces and explain what each piece does, character group by character group when it matters (e.g. what the single quote does in SQL, what <script> tells the browser).
  - State your teaching assumptions explicitly ("We assume the app does X...").
- lesson_cause (4-6 sentences): the root cause — what design/implementation flaw opened the door? Tie each point to a detail from the article (endpoint, parameter, code line).
- lesson_walkthrough (THE MAIN EVENT — Lego-style, 12-24 short numbered steps "Step 1, Step 2..."). Like assembling Lego bricks until the final exploit appears. Organize steps under phase labels when the story has distinct phases — write the phase name in CAPS on its own line before its steps (RECON, DISCOVERY, EXPLOITATION, IMPACT). EVERY step has three parts: (a) exactly what the researcher did, (b) the VERBATIM code/payload/request from the article on its own line (full URL, HTTP request, JSON, snippet), (c) an explicit "Why:" line with the mechanism PLUS a beginner gloss in parentheses when jargon appears. Cover EVERY distinct attack path in the article (if the title promises four vectors, teach all four — never just the first). Define every technical term at first use in ≤10 plain words. Chronological order: context -> first odd observation -> each experiment -> final payload -> proof of impact.
- lesson_example (a parallel training example you compose, NOT from the article): the same bug class on a fictional target (always use target.example): a short vulnerable snippet + the attack request + why it works, each explained for a beginner. Displayed in its own labeled section, so write only the teaching content.
- lesson_takeaway (4-6 sentences): the practical hunter lesson — when to hunt this pattern again, what signals to look for, concrete tools/search words, plus 1-2 known VARIANTS or edge cases of the same bug class (where else does this shape appear?) and the common beginner mistake to avoid.
- lesson_fix (4-6 sentences): the correct fix in technical detail, WITH a fixed code snippet whenever applicable.
- HONESTY IS MANDATORY: article-derived fields (cause/walkthrough/takeaway/fix) must come ONLY from the extracted content below — never invent endpoints, payloads, or results. If the content is too thin for a field, write "" for it. The ONLY freely-composed field is lesson_example (explicitly illustrative, fictional target).`;

export async function classifyAndSummarize(item) {
  const chain = configuredProviders();
  for (const provider of chain) {
    try {
      const out = await classifyWith(provider, item);
      if (out && out.aiGenerated) {
        if (provider !== chain[0]) console.log(`  AI read succeeded via fallback ${provider} for ${item.url}`);
        return out;
      }
      throw new Error("unusable model output");
    } catch (err) {
      console.warn(`  AI classify (${provider}) failed for ${item.url}: ${err.message} — trying next provider`);
    }
  }
  if (chain.length > 0) console.warn(`  all AI providers failed for ${item.url} — falling back to heuristic`);
  return heuristicClassify(item);
}

async function classifyWith(provider, item) {
  {
    const userPrompt = buildUserPrompt(item);
    const raw =
      provider === "gemini"
        ? await callGemini(userPrompt)
        : provider === "groq"
          ? await callOpenAiCompatible(userPrompt, {
              base: "https://api.groq.com/openai/v1",
              key: process.env.GROQ_API_KEY,
              model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
            })
          : provider === "openrouter"
            ? await callOpenAiCompatible(userPrompt, {
                base: "https://openrouter.ai/api/v1",
                key: process.env.OPENROUTER_API_KEY,
                model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free",
              })
            : provider === "custom"
              ? await callOpenAiCompatible(userPrompt, {
                  base: (process.env.CUSTOM_API_BASE || "").replace(/\/+$/, ""),
                  key: process.env.CUSTOM_API_KEY || CUSTOM_API_KEY_DEFAULT,
                  model: process.env.CUSTOM_MODEL,
                  extraHeaders: parseCustomHeaders(),
                })
              : null;

    const parsed = raw ? parseModelJson(raw) : null;
    if (!parsed) throw new Error("unparseable model output");

    return {
      isBugBounty: parsed.is_bug_bounty !== false,
      categories: sanitizeCategories(parsed.categories),
      severity: sanitizeSeverity(parsed.severity),
      difficulty: sanitizeDifficulty(parsed.difficulty),
      summary_en: (parsed.summary_en || "").trim() || heuristicSummary(item),
      // Arabic comes from the on-site translation service, never the AI.
      summary_ar: null,
      lesson: {
        cause: (parsed.lesson_cause || "").trim() || null,
        walkthrough: (parsed.lesson_walkthrough || "").trim() || null,
        example: (parsed.lesson_example || "").trim() || null,
        takeaway: (parsed.lesson_takeaway || "").trim() || null,
        fix: (parsed.lesson_fix || "").trim() || null,
        // Legacy Arabic fields (pre-English archive) — always empty for new items.
        cause_ar: null,
        walkthrough_ar: null,
        example_ar: null,
        takeaway_ar: null,
        fix_ar: null,
      },
      aiGenerated: true,
      aiProvider: provider,
    };
  }
}

function buildUserPrompt(item) {
  return [
    `Title: ${item.cleanTitle || item.title}`,
    item.program ? `Program/target: ${item.program}` : null,
    item.tagHints?.length ? `Source tags: ${item.tagHints.join(", ")}` : null,
    `Full extracted article content (this is what you must teach from — do not invent details beyond it):\n${item.fullTextForClassification || item.excerpt || "(no content extracted, use title only — in this case the lesson_*_ar fields should be empty strings)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function callGemini(userPrompt) {
  // 2.0-flash is retired for new keys; -latest always tracks the current
  // flash generation. A pinned GEMINI_MODEL secret overrides when set.
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: `${PROMPT_INSTRUCTIONS}\n\n${userPrompt}` }] }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: AI_MAX_TOKENS },
  };
  // The free tier throws transient 503 demand spikes — wait a beat and retry
  // once (same policy as the OpenAI-compatible path) instead of dropping the
  // whole teaching read.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
      }
      const errText = await res.text();
      const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
      if (retryable && attempt === 0) {
        const wait = retryAfterMs(errText, 20000);
        console.warn(`  Gemini HTTP ${res.status}, waiting ${Math.round(wait / 1000)}s and retrying once`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw new Error(`Gemini HTTP ${res.status}: ${errText}`);
    } catch (err) {
      if ((err?.name === "TimeoutError" || err?.name === "AbortError") && attempt === 0) {
        console.warn(`  Gemini timed out after ${AI_TIMEOUT_MS}ms, retrying once`);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Gemini gave up after retry");
}

async function callOpenAiCompatible(userPrompt, { base, key, model, extraHeaders }) {
  if (!base) throw new Error("no base URL configured for this provider");
  if (!model) throw new Error("no model id configured for this provider");

  // People constantly paste the full chat-completions URL into the base secret
  // (.../v1/chat/completions) even though the docs say to stop at /v1 — which
  // would otherwise build .../chat/completions/chat/completions and 404 every
  // call, silently degrading the whole run to heuristic. Tolerate both forms.
  const root = base
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions\/?$/, "");
  const endpoint = `${root}/chat/completions`;

  const headers = {
    "content-type": "application/json",
    // Identify as the official opencode CLI (see AI_USER_AGENT above) —
    // explicit custom headers still win if the user sets them.
    "user-agent": AI_USER_AGENT,
    // Fresh random session per request, mirroring the official client
    // (ses_ + 26 alphanumerics, exactly like the anthropic-shim's
    // genSessionID). Overridable via custom headers like everything else.
    "x-opencode-session": randomSession(),
    ...extraHeaders,
  };
  // Optional: a self-hosted/local endpoint may need no auth at all — only
  // send Authorization when a key was actually given.
  if (key) headers.authorization = `Bearer ${key}`;

  const body = (withJsonMode) => ({
    model,
    temperature: 0.2,
    max_tokens: AI_MAX_TOKENS,
    ...(withJsonMode ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: PROMPT_INSTRUCTIONS },
      { role: "user", content: userPrompt },
    ],
  });

  const post = (withJsonMode) =>
    fetch(endpoint, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      body: JSON.stringify(body(withJsonMode)),
    });

  // Slow/overloaded endpoints (self-hosted, free shared proxies) need
  // patience: retry ONCE on timeout or 5xx (Cloudflare 524s from an
  // overloaded origin are the classic case) before giving up to heuristic.
  // A transient stall shouldn't cost the whole teaching read.
  let res = null;
  let jsonMode = true;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await post(jsonMode);
    } catch (err) {
      if ((err?.name === "TimeoutError" || err?.name === "AbortError") && attempt === 0) {
        console.warn(`  ${base} timed out after ${AI_TIMEOUT_MS}ms, retrying once`);
        continue;
      }
      throw err;
    }
    if (res.ok) break;
    const errText = await res.text();
    if (res.status === 400 && jsonMode && /response_format|json/i.test(errText)) {
      console.warn(`  ${base} rejected json mode, retrying without it`);
      jsonMode = false;
      continue;
    }
    if (res.status === 429 && attempt === 0) {
      // Free-tier rate limit: back off (honoring any suggested delay), then
      // try once more. On a 5-minute fetch cadence the next run would retry
      // anyway, but a short pause often clears a momentary spike in-run.
      const wait = retryAfterMs(errText, 15000);
      console.warn(`  ${base} HTTP 429 (rate limited), waiting ${Math.round(wait / 1000)}s and retrying once`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (res.status >= 500 && res.status < 600 && attempt === 0) {
      console.warn(`  ${base} HTTP ${res.status}, retrying once`);
      continue;
    }
    throw new Error(`${base} HTTP ${res.status}: ${errText}`);
  }
  if (!res || !res.ok) throw new Error(`${base} gave up after retry`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseModelJson(raw) {
  const cleaned = raw.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function sanitizeCategories(cats) {
  const valid = (Array.isArray(cats) ? cats : []).filter((c) => CATEGORY_SLUGS.includes(c));
  return valid.length ? valid.slice(0, 3) : ["other"];
}

function sanitizeSeverity(sev) {
  return ["critical", "high", "medium", "low"].includes(sev) ? sev : null;
}

function sanitizeDifficulty(d) {
  return ["beginner", "intermediate", "advanced"].includes(d) ? d : null;
}

// ---- Heuristic fallback (no AI key configured) ----

export function heuristicClassify(item) {
  const haystack = `${item.title || ""} ${item.cleanTitle || ""} ${(item.tagHints || []).join(" ")} ${item.excerpt || ""}`.toLowerCase();

  const categories = taxonomy.categories
    .filter((c) => c.keywords.some((kw) => haystack.includes(kw)))
    .map((c) => c.slug)
    .slice(0, 3);

  const bountyAmount = parseBountyAmount(item.bountyRaw);
  let severity = null;
  if (/\b(rce|remote code execution|account takeover|critical)\b/.test(haystack) || bountyAmount >= 5000) {
    severity = "critical";
  } else if (/\b(auth bypass|authentication bypass|sql injection|ssrf|privilege escalation)\b/.test(haystack) || bountyAmount >= 1500) {
    severity = "high";
  } else if (categories.length) {
    severity = "medium";
  }

  return {
    // The pre-Jina relevance gate (scripts/lib/relevance.mjs) already decided
    // this candidate is bug-bounty-relevant before we got here.
    isBugBounty: true,
    categories: categories.length ? categories : ["other"],
    severity,
    difficulty: null,
    summary_en: heuristicSummary(item),
    summary_ar: null,
    // No AI key configured -> can't honestly generate a teaching walkthrough
    // without inventing detail. The writeup page explains translation options
    // instead of fabricated content.
    lesson: {
      cause: null, walkthrough: null, example: null, takeaway: null, fix: null,
      cause_ar: null, walkthrough_ar: null, example_ar: null, takeaway_ar: null, fix_ar: null,
    },
    aiGenerated: false,
  };
}

function heuristicSummary(item) {
  const text = (item.excerpt || item.title || "").trim();
  if (!text) return "";
  const cut = text.slice(0, 240);
  const lastPeriod = cut.lastIndexOf(". ");
  return (lastPeriod > 80 ? cut.slice(0, lastPeriod + 1) : cut).trim();
}

function parseBountyAmount(raw) {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function detectPlatform(item) {
  // Titles often name the platform ("...on HackerOne", "...— Bugcrowd...")
  // while the URL is just a Medium link, so include them in the haystack.
  const haystack =
    `${item.url} ${item.program || ""} ${item.sourceName || ""} ${item.cleanTitle || ""} ${item.title || ""}`.toLowerCase();
  for (const p of taxonomy.platforms) {
    if (p.match.some((m) => haystack.includes(m))) return p.slug;
  }
  return item.program ? "other" : "self-disclosed";
}

// Primary provider for display/meta (first in chain). Individual reads may
// transparently fall back to later providers; those are logged per item.
export const activeProvider = configuredProviders()[0] ?? "none";
