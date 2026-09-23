// One-off/ongoing backfill: give archived writeups that never got a real AI
// teaching read (ai_generated=false, or generated but with an empty
// walkthrough) a full lesson with the CURRENT prompt. Newest first, capped
// per run so slow endpoints aren't drowned (re-run until the queue empties).
//
//   BACKFILL_MAX=10 npm run backfill:lessons
//
// Only touches data/*.json. Items whose extracted content is too thin for an
// honest lesson are left untouched (and logged) — never fabricate.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import taxonomy from "../taxonomy.json" with { type: "json" };
import { extractContent } from "./lib/extractContent.mjs";
import { classifyAndSummarize, detectPlatform, activeProvider } from "./lib/ai.mjs";
import { computeScore } from "./lib/score.mjs";
import { looksLikeWriteupContent } from "./lib/relevance.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const WRITEUPS_PATH = path.join(DATA_DIR, "writeups.json");
const META_PATH = path.join(DATA_DIR, "meta.json");
const BY_CATEGORY_DIR = path.join(DATA_DIR, "by-category");

const MAX_PER_RUN = Number(process.env.BACKFILL_MAX || 10);
const PER_ITEM_DELAY_MS = 700;

async function main() {
  console.log(`Backfill AI provider: ${activeProvider} (max ${MAX_PER_RUN} items)`);
  if (activeProvider === "none") {
    console.log("No AI key configured — nothing to backfill with. Set an AI secret first.");
    return;
  }
  const writeups = JSON.parse(await readFile(WRITEUPS_PATH, "utf8"));
  const queue = writeups
    .filter((w) => !w.lesson?.walkthrough_ar)
    .sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""));
  console.log(`${queue.length} archived item(s) missing a full lesson`);

  let updated = 0;
  let skippedThin = 0;
  for (const w of queue.slice(0, MAX_PER_RUN)) {
    process.stdout.write(`  backfill ${w.id} ${w.url}\n`);
    try {
      const ok = await backfillOne(w);
      if (ok) updated++;
      else skippedThin++;
    } catch (err) {
      console.warn(`    skipped (${err.message})`);
      skippedThin++;
    }
    await sleep(PER_ITEM_DELAY_MS);
  }

  await writeFile(WRITEUPS_PATH, JSON.stringify(writeups, null, 2));
  await writeByCategoryFiles(writeups);

  const meta = JSON.parse(await readFile(META_PATH, "utf8"));
  meta.aiGeneratedTotal = writeups.filter((x) => x.ai_generated).length;
  meta.backfilledThisRun = updated;
  meta.bySource = countBy(writeups, (x) => x.source.slug);
  meta.byCategory = countBy(
    writeups.flatMap((x) => x.categories),
    (c) => c
  );
  await writeFile(META_PATH, JSON.stringify(meta, null, 2));
  console.log(`Done. ${updated} lesson(s) added, ${skippedThin} skipped (thin/failed).`);
}

async function backfillOne(w) {
  const extracted = await extractContent(w.url);
  const enriched = {
    title: w.title,
    cleanTitle: extracted?.cleanTitle || null,
    excerpt: extracted?.excerpt || w.excerpt || null,
    fullTextForClassification: extracted?.fullTextForClassification || null,
    tagHints: w.categories,
    url: w.url,
    program: w.program,
    sourceName: w.source?.name,
  };
  if (!looksLikeWriteupContent(enriched, null)) {
    throw new Error("post-extraction relevance gate rejected it");
  }
  const ai = await classifyAndSummarize(enriched);
  if (!ai.aiGenerated) return false; // AI call failed -> heuristic, don't overwrite
  if (!ai.lesson?.walkthrough_ar) {
    console.warn("    thin content — leaving heuristic version untouched");
    return false;
  }
  w.title = enriched.cleanTitle || w.title;
  w.categories = ai.categories;
  w.severity = ai.severity;
  w.summary_en = ai.summary_en || w.summary_en;
  w.summary_ar = ai.summary_ar || w.summary_ar;
  w.lesson = ai.lesson;
  w.excerpt = enriched.excerpt || w.excerpt;
  w.platform_slug = detectPlatform({ ...enriched, sourceName: w.source?.name });
  w.ai_generated = true;
  w.score = computeScore(w);
  return true;
}

async function writeByCategoryFiles(merged) {
  await mkdir(BY_CATEGORY_DIR, { recursive: true });
  const byCategory = new Map(taxonomy.categories.map((c) => [c.slug, []]));
  for (const w of merged) {
    for (const slug of w.categories || []) {
      if (byCategory.has(slug)) byCategory.get(slug).push(w);
    }
  }
  for (const [slug, items] of byCategory) {
    const sorted = [...items].sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""));
    await writeFile(path.join(BY_CATEGORY_DIR, `${slug}.json`), JSON.stringify(sorted, null, 2));
  }
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
    process.exit(process.exitCode || 0);
  });
