// Runs before `next build` (see package.json "build" script) and generates two
// static files served straight from /public, no server needed:
//   - public/rss.xml            an RSS 2.0 feed of the latest writeups
//   - public/search-index.json  a lightweight index for the client-side Fuse.js search
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

  console.log(`buildStaticExtras: wrote rss.xml + search-index.json (${writeups.length} items)`);
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

function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
