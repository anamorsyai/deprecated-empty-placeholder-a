// Uses Jina AI's free Reader API (r.jina.ai) to fetch a clean, readable version of
// a page: accurate <title>, and markdown body with boilerplate/nav stripped out.
// No API key required for reasonable volumes; pass JINA_API_KEY if the caller has
// one, since it raises the rate limit.
const JINA_BASE = "https://r.jina.ai/";

export async function extractContent(url, { retries = 1 } = {}) {
  const headers = {
    "user-agent": "bugbounty-writeups-hub/1.0 (+https://github.com)",
    "x-return-format": "markdown",
  };
  if (process.env.JINA_API_KEY) {
    headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(JINA_BASE + url, { headers, signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`Jina Reader HTTP ${res.status}`);
      const text = await res.text();
      return parseJinaResponse(text);
    } catch (err) {
      if (attempt === retries) {
        console.warn(`  extractContent failed for ${url}: ${err.message}`);
        return null;
      }
      await sleep(1500 * (attempt + 1));
    }
  }
  return null;
}

function parseJinaResponse(text) {
  const titleMatch = text.match(/^Title:\s*(.+)$/m);
  const contentIdx = text.indexOf("Markdown Content:");
  const rawBody = contentIdx >= 0 ? text.slice(contentIdx + "Markdown Content:".length).trim() : text.trim();
  const body = stripLeadingHeading(stripBoilerplate(rawBody));

  return {
    cleanTitle: pickBestTitle(titleMatch ? titleMatch[1].trim() : null, rawBody),
    excerpt: body.replace(/\s+/g, " ").slice(0, 600).trim(),
    fullTextForClassification: body.slice(0, 6000),
  };
}

// The page <title> is often just site branding on advisory/bulletin pages
// ("26-718 - Zero Day Initiative (ZDI)"), while the real, specific title sits
// in the article's own H1. Prefer whichever is more descriptive.
function pickBestTitle(pageTitle, rawBody) {
  // Some sites wrap a logo image in their first "# [![...]](...)" heading —
  // skip any H1 that's mostly markdown image/link syntax rather than text.
  const h1Candidates = [...rawBody.matchAll(/^#\s+(.+)$/gm)].map((m) => m[1].trim());
  let h1 = h1Candidates.find((c) => !/!\[|^\[/.test(c)) || null;
  if (h1) {
    // Advisory H1s often trail off into metadata ("... Vulnerability September
    // 18th, 2026 ZDI-26-718 ZDI-CAN-31322 CVE ID ...") — cut that off.
    h1 = h1.split(/\s+(?:ZDI-\d|CVE ID|CVE-\d{4}-\d{4,7})/)[0].trim();
  }

  // A page <title> that's much shorter than the article's own H1 is usually
  // sitewide branding/an ID rather than a real description of the content.
  const looksGeneric = !pageTitle || pageTitle.length < 25 || (h1 && h1.length >= Math.max(40, pageTitle.length * 1.3));
  if (looksGeneric && h1 && h1.length >= 25) return h1;
  return pageTitle || h1 || null;
}

// Drops a leading Markdown H1 line from the (already boilerplate-stripped)
// body — it duplicates the title, and on advisory pages trails straight into
// ID/date/CVE metadata that would otherwise pollute the excerpt.
function stripLeadingHeading(body) {
  return body.replace(/^#\s+.+\n*/, "");
}

// Cookie banners, "skip to content" nav, image-heavy headers/logos, newsletter
// prompts etc. often survive as the first "paragraph(s)" of a Reader response
// and would otherwise become the summary. Walk blocks until one looks like
// actual article prose, and start the excerpt there.
const BOILERPLATE_RE =
  /\b(cookies?|consent|subscribe to (our )?newsletter|skip to content|accept all|manage preferences|manage cookie|sign in|log in|privacy preference|necessary cookies)\b/i;

function isProseBlock(block) {
  const clean = block.trim();
  if (clean.length < 120) return false;
  if (BOILERPLATE_RE.test(clean)) return false;

  const imageOrLinkHits = (clean.match(/!\[|\]\(https?:\/\//g) || []).length;
  if (imageOrLinkHits > 2) return false;

  const words = clean.split(/\s+/);
  const wordish = words.filter((w) => /^[A-Za-z؀-ۿ][A-Za-z؀-ۿ'-]{2,}$/.test(w));
  return wordish.length / words.length >= 0.5;
}

function stripBoilerplate(body) {
  const blocks = body.split(/\n{2,}/);
  const startIdx = blocks.findIndex(isProseBlock);
  return startIdx > 0 ? blocks.slice(startIdx).join("\n\n") : body;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
