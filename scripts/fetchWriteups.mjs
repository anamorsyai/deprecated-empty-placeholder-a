import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sources from "./sources.json" with { type: "json" };
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

const MAX_NEW_PER_RUN = Number(process.env.MAX_NEW_PER_RUN || 40);
const MAX_PER_SOURCE_PER_RUN = Number(process.env.MAX_PER_SOURCE_PER_RUN || 10);
const MAX_TOTAL_ITEMS = Number(process.env.MAX_TOTAL_ITEMS || 2000);
const PER_ITEM_DELAY_MS = 700;

async function main() {
  console.log(`AI provider: ${activeProvider}`);
  await mkdir(DATA_DIR, { recursive: true });

  const existing = await loadExisting();
  const seenUrls = new Set(existing.map((w) => w.url));

  const candidates = await collectCandidates();
  const relevant = candidates.filter((c) => isLikelyBugBounty(c, SOURCE_BY_SLUG.get(c.sourceSlug)));
  const fresh = selectBalanced(dedupeNew(relevant, seenUrls), MAX_NEW_PER_RUN, MAX_PER_SOURCE_PER_RUN);

  console.log(
    `Found ${candidates.length} candidates, ${relevant.length} passed the bug-bounty relevance filter (${candidates.length - relevant.length} dropped as noise), ${fresh.length} new (processing up to ${MAX_NEW_PER_RUN}).`
  );

  const processed = [];
  for (const [i, candidate] of fresh.entries()) {
    process.stdout.write(`  [${i + 1}/${fresh.length}] ${candidate.url}\n`);
    try {
      const record = await processCandidate(candidate);
      processed.push(record);
    } catch (err) {
      console.warn(`    skipped (${err.message})`);
    }
    await sleep(PER_ITEM_DELAY_MS);
  }

  const merged = mergeAndRescore(existing, processed).slice(0, MAX_TOTAL_ITEMS);
  await writeFile(WRITEUPS_PATH, JSON.stringify(merged, null, 2));

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

function dedupeNew(candidates, seenUrls) {
  const byUrl = new Map();
  for (const c of candidates) {
    const norm = normalizeUrl(c.url);
    if (seenUrls.has(norm) || byUrl.has(norm)) continue;
    byUrl.set(norm, c);
  }
  return [...byUrl.values()].sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
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
    excerpt: enriched.excerpt,
    ai_generated: ai.aiGenerated,
    engagement: candidate.engagement || null,
  };
  record.score = computeScore(record);
  return record;
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
