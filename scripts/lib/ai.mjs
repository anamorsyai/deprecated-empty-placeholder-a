import taxonomy from "../../taxonomy.json" with { type: "json" };

// Pluggable AI layer. Picks a provider from env vars, all of which have real free
// tiers as of writing:
//   GEMINI_API_KEY     -> Google AI Studio, gemini-2.0-flash (generous free quota)
//   GROQ_API_KEY        -> Groq, llama-3.1-8b-instant (fast, free)
//   OPENROUTER_API_KEY  -> OpenRouter, a ":free" model
// AI_PROVIDER can force one of "gemini" | "groq" | "openrouter" | "none".
// With no key configured at all, classifyAndSummarize() falls back to a
// deterministic keyword heuristic so the pipeline still runs end-to-end for free.

const PROVIDER = resolveProvider();

function resolveProvider() {
  const forced = process.env.AI_PROVIDER;
  if (forced) return forced;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return "none";
}

const CATEGORY_SLUGS = taxonomy.categories.map((c) => c.slug);
const PLATFORM_SLUGS = taxonomy.platforms.map((p) => p.slug);

const PROMPT_INSTRUCTIONS = `You are two things at once for a bug bounty writeup aggregator read daily by hackers:
(1) a strict gatekeeper — the site must stay bug-bounty-only, no CTF/training-lab writeups, no vendor CVE advisories unrelated to a bounty program, no interviews/news/business posts; and
(2) a hands-on mentor who has read the full writeup and now teaches it to a hunter in Arabic — not a summary, a real walkthrough that lets someone learn the technique without opening the original link.

Return ONLY minified JSON, no markdown fences, matching exactly:
{"is_bug_bounty":boolean,"categories":[string,...max 3],"severity":"critical"|"high"|"medium"|"low"|null,"summary_en":string,"summary_ar":string,"lesson_cause_ar":string,"lesson_walkthrough_ar":string,"lesson_takeaway_ar":string,"lesson_fix_ar":string}

Rules:
- is_bug_bounty: true ONLY if this describes a real vulnerability found and reported against a specific target/program (bug bounty platform report, responsible disclosure, or an independent researcher's disclosed finding with a named target). false for CTF/TryHackMe/HackTheBox writeups, generic tutorials, interviews, news, opinion/career pieces, or vendor advisories with no bounty/disclosure context. When false, every field below is an empty string except categories/severity (best-effort).
- categories must be chosen from this exact list: ${CATEGORY_SLUGS.join(", ")}
- severity: your best judgement of real-world impact ("critical" for RCE/full account takeover/mass data breach, "high" for auth bypass/significant data exposure, "medium"/"low" otherwise, null if you truly cannot tell).
- summary_en: 1-2 punchy sentences in English describing the vulnerability and impact (no fluff, no "this writeup discusses"). Used on list/card views.
- summary_ar: the same 1-2 sentences in natural Modern Standard Arabic, technical terms (XSS, IDOR, RCE...) kept in Latin script. Used on list/card views.
- The four lesson_*_ar fields are the full teaching content shown on the writeup's own page — write them as a real teacher would, in Arabic, technical terms in Latin script, each 3-6 sentences, concrete and specific to THIS writeup (never generic filler):
  - lesson_cause_ar: الـ root cause — إزاي الثغرة دي حصلت أصلاً في تصميم أو تنفيذ النظام؟ ما الافتراض الخاطئ أو الفجوة في الـ logic اللي فتحت الباب؟
  - lesson_walkthrough_ar: خطوة بخطوة إزاي الباحث اكتشف ثم استغل الثغرة — من الملاحظة الأولى (إيه اللي لفت نظره) لحد الـ payload/التقنية النهائية اللي أثبتت الثغرة، بأكبر تفاصيل تقنية متاحة من المحتوى (endpoints، parameters، الفرق بين المتوقع والفعلي).
  - lesson_takeaway_ar: الدرس العملي لصياد ثغرات بيقرا الكتابة دي — إمتى يدور على النمط ده تاني، وإيه العلامات (signals) اللي تدله إن نفس الفئة من الثغرات ممكن تكون موجودة في هدف تاني.
  - lesson_fix_ar: إزاي المطور كان/لازم يصلح المشكلة دي بشكل صحيح (مش بس "أصلحوها" — التفاصيل التقنية للحل الصح).
- If the extracted content is too thin to teach any of the four lesson fields honestly, write "" for that field rather than inventing detail not supported by the source.`;

export async function classifyAndSummarize(item) {
  if (PROVIDER === "none") return heuristicClassify(item);

  try {
    const userPrompt = buildUserPrompt(item);
    const raw =
      PROVIDER === "gemini"
        ? await callGemini(userPrompt)
        : PROVIDER === "groq"
          ? await callOpenAiCompatible(userPrompt, {
              base: "https://api.groq.com/openai/v1",
              key: process.env.GROQ_API_KEY,
              model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
            })
          : PROVIDER === "openrouter"
            ? await callOpenAiCompatible(userPrompt, {
                base: "https://openrouter.ai/api/v1",
                key: process.env.OPENROUTER_API_KEY,
                model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free",
              })
            : null;

    const parsed = raw ? parseModelJson(raw) : null;
    if (!parsed) return heuristicClassify(item);

    return {
      isBugBounty: parsed.is_bug_bounty !== false,
      categories: sanitizeCategories(parsed.categories),
      severity: sanitizeSeverity(parsed.severity),
      summary_en: (parsed.summary_en || "").trim() || heuristicSummary(item),
      summary_ar: (parsed.summary_ar || "").trim() || null,
      lesson: {
        cause_ar: (parsed.lesson_cause_ar || "").trim() || null,
        walkthrough_ar: (parsed.lesson_walkthrough_ar || "").trim() || null,
        takeaway_ar: (parsed.lesson_takeaway_ar || "").trim() || null,
        fix_ar: (parsed.lesson_fix_ar || "").trim() || null,
      },
      aiGenerated: true,
    };
  } catch (err) {
    console.warn(`  AI classify (${PROVIDER}) failed for ${item.url}: ${err.message} — falling back to heuristic`);
    return heuristicClassify(item);
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
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${PROMPT_INSTRUCTIONS}\n\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

async function callOpenAiCompatible(userPrompt, { base, key, model }) {
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT_INSTRUCTIONS },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${base} HTTP ${res.status}: ${await res.text()}`);
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
    summary_en: heuristicSummary(item),
    summary_ar: null,
    // No AI key configured -> can't honestly generate a teaching walkthrough
    // without inventing detail. The writeup page shows a "add a free key" note
    // instead of fabricated content.
    lesson: { cause_ar: null, walkthrough_ar: null, takeaway_ar: null, fix_ar: null },
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
  const haystack = `${item.url} ${item.program || ""} ${item.sourceName || ""}`.toLowerCase();
  for (const p of taxonomy.platforms) {
    if (p.match.some((m) => haystack.includes(m))) return p.slug;
  }
  return item.program ? "other" : "self-disclosed";
}

export const activeProvider = PROVIDER;
