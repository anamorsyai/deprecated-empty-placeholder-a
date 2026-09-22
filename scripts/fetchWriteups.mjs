import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sources from "./sources.json" with { type: "json" };
import taxonomy from "../taxonomy.json" with { type: "json" };
import { fetchPentesterLand } from "./lib/sources/pentesterland.mjs";
import { fetchRss } from "./lib/sources/rss.mjs";
import { extractContent } from "./lib/extractContent.mjs";
import { classifyAndSummarize, detectPlatform, activeProvider } from "./lib/ai.mjs";
import { computeScore } from "./lib/score.mjs";
import { isLikelyBugBounty, looksLikeWriteupContent } from "./lib/relevance.mjs";

const SOURCE_BY_SLUG = new Map(
  [...sources.structured, ...sources.rss].map((s) => [s.slug, s])
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const WRITEUPS_PATH = path.join(DATA_DIR, "writeups.json");
const META_PATH = path.join(DATA_DIR, "meta.json");
const BY_CATEGORY_DIR = path.join(DATA_DIR, "by-category");

// Runs hourly now, so each run only needs to cover a small slice — lower
// per-run caps than a 6-hourly cadence would use, spread more evenly across
// the day (gentler on free-tier Jina/AI rate limits too).
const MAX_NEW_PER_RUN = Number(process.env.MAX_NEW_PER_RUN || 20);
const MAX_PER_SOURCE_PER_RUN = Number(process.env.MAX_PER_SOURCE_PER_RUN || 5);
const PER_ITEM_DELAY_MS = 700;

async function main() {
  console.log(`AI provider: ${activeProvider}`);
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(BY_CATEGORY_DIR, { recursive: true });

  const existing = await loadExisting();
  const seenUrls = new Set(existing.map((w) => w.url));
  const seenTitles = new Set(existing.map((w) => normalizeTitle(w.title)));

  const candidates = await collectCandidates();
  const relevant = candidates.filter((c) => isLikelyBugBounty(c, SOURCE_BY_SLUG.get(c.sourceSlug)));
  const fresh = selectBalanced(dedupeNew(relevant, seenUrls, seenTitles), MAX_NEW_PER_RUN, MAX_PER_SOURCE_PER_RUN);

  console.log(
    `Found ${candidates.length} candidates, ${relevant.length} passed the bug-bounty relevance filter (${candidates.length - relevant.length} dropped as noise), ${fresh.length} new (processing up to ${MAX_NEW_PER_RUN}).`
  );

  const processed = [];
  for (const [i, candidate] of fresh.entries()) {
    process.stdout.write(`  [${i + 1}/${fresh.length}] ${candidate.url}\n`);
    try {
      const record = await processCandidate(candidate);
      // Final safety net: the resolved title (Jina's cleaned-up version, which
      // can differ from the RSS title used for the earlier pre-filter) might
      // still collide with something already stored or already processed this
      // run — e.g. the same writeup picked up by two different feeds.
      const finalTitle = normalizeTitle(record.title);
      if (finalTitle && seenTitles.has(finalTitle)) {
        console.warn(`    skipped (duplicate title after extraction: "${record.title}")`);
        continue;
      }
      if (finalTitle) seenTitles.add(finalTitle);
      processed.push(record);
    } catch (err) {
      console.warn(`    skipped (${err.message})`);
    }
    await sleep(PER_ITEM_DELAY_MS);
  }

  // Permanent archive — nothing already explained is ever dropped, so the
  // repo keeps growing as the true, durable store of every writeup covered.
  const merged = mergeAndRescore(existing, processed);
  await writeFile(WRITEUPS_PATH, JSON.stringify(merged, null, 2));
  await writeByCategoryFiles(merged);

  const meta = {
    lastRun: new Date().toISOString(),
    totalItems: merged.length,
    newItemsThisRun: processed.length,
    aiProvider: activeProvider,
    bySource: countBy(merged, (w) => w.source.slug),
    byCategory: countBy(merged.flatMap((w) => w.categories), (c) => c),
  };
  await writeFile(META_PATH, JSON.stringify(meta, null, 2));

  console.log(`Done. ${processed.length} new items added, ${merged.length} total stored.`);
}

async function loadExisting() {
  try {
    return JSON.parse(await readFile(WRITEUPS_PATH, "utf8"));
  } catch {
    return [];
  }
}

async function collectCandidates() {
  const jobs = [
    ...sources.structured.filter((s) => s.enabled !== false).map((s) => ({ s, fn: fetchPentesterLand })),
    ...sources.rss.filter((s) => s.enabled !== false).map((s) => ({ s, fn: fetchRss })),
  ];

  const results = await Promise.allSettled(jobs.map((j) => j.fn(j.s)));
  const all = [];
  results.forEach((r, i) => {
    const name = jobs[i].s.name;
    if (r.status === "fulfilled") {
      console.log(`  source ok: ${name} (${r.value.length} items)`);
      all.push(...r.value);
    } else {
      console.warn(`  source FAILED: ${name}: ${r.reason?.message || r.reason}`);
    }
  });
  return all;
}

// Two-layer dedupe: exact URL (the common case — same feed re-listing an
// item, or two feeds linking the identical article) AND normalized title
// (catches the same writeup mirrored at a different URL — e.g. picked up by
// both a Medium tag feed and InfoSec Write-ups with different query strings
// that survive normalizeUrl, or a cross-post). Once a title has been stored,
// it can never be added again regardless of source or URL.
function dedupeNew(candidates, seenUrls, seenTitles) {
  const byUrl = new Map();
  const titlesThisBatch = new Set(seenTitles);
  for (const c of candidates) {
    const norm = normalizeUrl(c.url);
    if (seenUrls.has(norm) || byUrl.has(norm)) continue;
    const t = normalizeTitle(c.title);
    if (t && titlesThisBatch.has(t)) continue;
    if (t) titlesThisBatch.add(t);
    byUrl.set(norm, c);
  }
  return [...byUrl.values()].sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
}

function normalizeTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Caps how many items any single source can contribute per run, so a
// high-volume feed (e.g. an advisories archive) doesn't crowd out everything
// else in the "new items" batch.
function selectBalanced(sorted, maxTotal, maxPerSource) {
  const counts = {};
  const picked = [];
  for (const c of sorted) {
    const n = counts[c.sourceSlug] || 0;
    if (n >= maxPerSource) continue;
    counts[c.sourceSlug] = n + 1;
    picked.push(c);
    if (picked.length >= maxTotal) break;
  }
  return picked;
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "source"].forEach((p) => u.searchParams.delete(p));
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

async function processCandidate(candidate) {
  const url = normalizeUrl(candidate.url);
  const extracted = await extractContent(url);

  const enriched = {
    ...candidate,
    url,
    cleanTitle: extracted?.cleanTitle || null,
    excerpt: extracted?.excerpt || null,
    fullTextForClassification: extracted?.fullTextForClassification || null,
  };

  const source = SOURCE_BY_SLUG.get(candidate.sourceSlug);
  if (!looksLikeWriteupContent(enriched, source)) {
    throw new Error("relevance gate: reads like a meta/announcement post, not a writeup");
  }

  const ai = await classifyAndSummarize(enriched);

  if (!source?.trustedBugBounty && ai.isBugBounty === false) {
    throw new Error("AI gate: not a bug bounty writeup");
  }

  const platform_slug = detectPlatform(enriched);

  const record = {
    id: createHash("sha1").update(url).digest("hex").slice(0, 12),
    title: enriched.cleanTitle || enriched.title || "(untitled)",
    url,
    source: { slug: candidate.sourceSlug, name: candidate.sourceName },
    authors: candidate.authors || [],
    program: candidate.program,
    platform_slug,
    bounty_raw: candidate.bountyRaw,
    published_at: candidate.publishedAt || new Date().toISOString(),
    added_at: new Date().toISOString(),
    categories: ai.categories,
    severity: ai.severity,
    summary_en: ai.summary_en,
    summary_ar: ai.summary_ar,
    lesson: ai.lesson || null,
    excerpt: enriched.excerpt,
    ai_generated: ai.aiGenerated,
    engagement: candidate.engagement || null,
  };
  record.score = computeScore(record);
  return record;
}

// Permanent, human-browsable archive split by category — one JSON file per
// taxonomy category, each holding every writeup ever classified into it
// (newest first). Regenerated in full each run from the merged master list,
// so it's always consistent with data/writeups.json.
async function writeByCategoryFiles(merged) {
  const byCategory = new Map(taxonomy.categories.map((c) => [c.slug, []]));
  for (const w of merged) {
    for (const slug of w.categories) {
      if (byCategory.has(slug)) byCategory.get(slug).push(w);
    }
  }
  for (const [slug, items] of byCategory) {
    const sorted = [...items].sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""));
    await writeFile(path.join(BY_CATEGORY_DIR, `${slug}.json`), JSON.stringify(sorted, null, 2));
  }
}

function mergeAndRescore(existing, fresh) {
  const merged = [...fresh, ...existing];
  for (const w of merged) w.score = computeScore(w);
  merged.sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""));
  return merged;
}

function countBy(arr, keyFn) {
  const out = {};
  for (const x of arr) {
    const k = keyFn(x);
    if (!k) continue;
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    // rss-parser / undici can leave keep-alive sockets open, which stalls
    // process exit for minutes even after all work is done.
    process.exit(process.exitCode || 0);
  });
