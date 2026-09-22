// Runs before `next build` (see package.json "build" script) and generates
// static files served straight from /public, no server needed:
//   - public/rss.xml            an RSS 2.0 feed of the latest writeups
//   - public/search-index.json  a lightweight index for the client-side Fuse.js search
//   - public/feed.json          card-level fields for every writeup (no `lesson`
//                                text), consumed by the client-side infinite
//                                scroll feed so the archive can grow without
//                                bloating what the browser has to hold
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SITE_URL = process.env.SITE_URL || "https://example.github.io/bugbounty-writeups-hub";

async function main() {
  const writeups = JSON.parse(await readFile(path.join(ROOT, "data", "writeups.json"), "utf8"));
  await mkdir(path.join(ROOT, "public"), { recursive: true });

  await writeFile(path.join(ROOT, "public", "rss.xml"), buildRss(writeups));
  await writeFile(path.join(ROOT, "public", "search-index.json"), JSON.stringify(buildSearchIndex(writeups)));
  await writeFile(path.join(ROOT, "public", "feed.json"), JSON.stringify(buildFeed(writeups)));

  console.log(`buildStaticExtras: wrote rss.xml + search-index.json + feed.json (${writeups.length} items)`);
}

function buildRss(writeups) {
  const items = writeups
    .slice(0, 60)
    .map(
      (w) => `  <item>
    <title>${escapeXml(w.title)}</title>
    <link>${escapeXml(w.url)}</link>
    <guid isPermaLink="false">${w.id}</guid>
    <pubDate>${new Date(w.published_at).toUTCString()}</pubDate>
    <description>${escapeXml(w.summary_en || w.excerpt || "")}</description>
  </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Bug Bounty Radar</title>
  <link>${SITE_URL}</link>
  <description>تجميعة يومية لأحدث writeups الـ bug bounty، مصنّفة تلقائيًا</description>
  <language>ar</language>
${items}
</channel>
</rss>
`;
}

function buildSearchIndex(writeups) {
  return writeups.map((w) => ({
    id: w.id,
    title: w.title,
    summary: w.summary_ar || w.summary_en || "",
    categories: w.categories,
    platform: w.platform_slug,
    source: w.source.name,
    published_at: w.published_at,
  }));
}

// Everything WriteupCard needs to render, already sorted newest-first (same
// order as data/writeups.json) — but never the `lesson` fields, which are
// only fetched when a visitor actually opens a writeup's own page.
function buildFeed(writeups) {
  return writeups.map((w) => ({
    id: w.id,
    title: w.title,
    url: w.url,
    source: w.source,
    program: w.program,
    platform_slug: w.platform_slug,
    bounty_raw: w.bounty_raw,
    published_at: w.published_at,
    categories: w.categories,
    severity: w.severity,
    summary_en: w.summary_en,
    summary_ar: w.summary_ar,
    excerpt: w.excerpt,
    score: w.score,
  }));
}

function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
