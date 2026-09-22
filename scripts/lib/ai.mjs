import taxonomy from "../../taxonomy.json" with { type: "json" };

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
// AI_PROVIDER can force one of "gemini" | "groq" | "openrouter" | "custom" | "none".
// With no key configured at all, classifyAndSummarize() falls back to a
// deterministic keyword heuristic so the pipeline still runs end-to-end for free.

const PROVIDER = resolveProvider();

function resolveProvider() {
  const forced = process.env.AI_PROVIDER;
  if (forced) return forced;
  // Checked first: setting a base URL is a deliberate, specific choice, so it
  // wins over a merely-present key for one of the built-in providers.
  if (process.env.CUSTOM_API_BASE) return "custom";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return "none";
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
- The four lesson_*_ar fields are the full teaching content shown on the writeup's own page — write them as a real teacher would, in Arabic, technical terms in Latin script, concrete and specific to THIS writeup (never generic filler that could apply to any writeup of the same vuln class):
  - lesson_cause_ar (3-5 sentences): الـ root cause — إزاي الثغرة دي حصلت أصلاً في تصميم أو تنفيذ النظام؟ ما الافتراض الخاطئ أو الفجوة في الـ logic اللي فتحت الباب؟
  - lesson_walkthrough_ar (THE MAIN EVENT — write this as an actual story, 8-14 sentences, not a dry list): احكي قصة اكتشاف واستغلال الثغرة بالترتيب الزمني بالظبط زي ما حصلت مع الباحث، بصوت راوي، وليس تعريف نظري. غطّي:
      1) السياق: إيه اللي كان الباحث بيعمله وقت ما لاحظ حاجة غريبة (أي جزء من التطبيق كان بيفحص، وليه).
      2) الملاحظة الأولى: إيه بالظبط اللي لفت نظره (سلوك غير متوقع، رسالة خطأ، فرق في الـ response، endpoint غريب).
      3) التجربة: إيه اللي جرّبه بعد كده خطوة بخطوة — واقتبس كل تفصيلة حرفية موجودة في المقال (اسم الـ endpoint/الـ parameter، الـ payload أو الكود بالظبط، أي طلب/استجابة HTTP مذكورة، أي رسالة خطأ أو رقم status code).
      4) النتيجة: الـ payload أو التقنية النهائية اللي أثبتت الثغرة، ونص إثبات الأثر (إيه اللي قدر يوصله/يشوفه/يعمله).
      إذا المقال فيه مثال تقني محدد (URL، snippet كود، JSON، header)، لازم يتذكر حرفيًا جوه القصة مش يتلخّص لعبارة عامة — ده اللي بيفرق بين شرح حقيقي وملخص فاضي.
  - lesson_takeaway_ar (3-5 sentences): الدرس العملي لصياد ثغرات بيقرا الكتابة دي — إمتى يدور على النمط ده تاني، وإيه العلامات (signals) اللي تدله إن نفس الفئة من الثغرات ممكن تكون موجودة في هدف تاني.
  - lesson_fix_ar (3-5 sentences): إزاي المطور كان/لازم يصلح المشكلة دي بشكل صحيح (مش بس "أصلحوها" — التفاصيل التقنية للحل الصح).
- If the extracted content is too thin to teach any of the four lesson fields honestly, write "" for that field rather than inventing detail not supported by the source. This applies especially to lesson_walkthrough_ar: a short, honest walkthrough using only what's really in the article beats a long one padded with invented specifics.`;

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
            : PROVIDER === "custom"
              ? await callOpenAiCompatible(userPrompt, {
                  base: (process.env.CUSTOM_API_BASE || "").replace(/\/+$/, ""),
                  key: process.env.CUSTOM_API_KEY,
                  model: process.env.CUSTOM_MODEL,
                  extraHeaders: parseCustomHeaders(),
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
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${PROMPT_INSTRUCTIONS}\n\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 3072 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

async function callOpenAiCompatible(userPrompt, { base, key, model, extraHeaders }) {
  if (!base) throw new Error("no base URL configured for this provider");
  if (!model) throw new Error("no model id configured for this provider");

  const headers = { "content-type": "application/json", ...extraHeaders };
  // Optional: a self-hosted/local endpoint may need no auth at all — only
  // send Authorization when a key was actually given.
  if (key) headers.authorization = `Bearer ${key}`;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 3072,
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
