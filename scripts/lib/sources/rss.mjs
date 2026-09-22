import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  },
});

export async function fetchRss(source) {
  const feed = await parser.parseURL(source.url);
  const items = [];

  for (const item of feed.items || []) {
    const title = item.title?.trim();
    const url = item.link?.trim();
    if (!title || !url) continue;

    if (source.filterKeywords?.length) {
      const haystack = `${title} ${item.contentSnippet || ""}`.toLowerCase();
      const matches = source.filterKeywords.some((kw) => haystack.includes(kw.toLowerCase()));
      if (!matches) continue;
    }

    items.push({
      title,
      url,
      authors: item.creator || item.author ? [item.creator || item.author] : [],
      program: null,
      tagHints: (item.categories || []).filter((c) => typeof c === "string"),
      bountyRaw: null,
      publishedAt: item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : null),
      sourceSlug: source.slug,
      sourceName: source.name,
      engagement: extractRedditEngagement(item),
      contentSnippet: (item.contentSnippet || item.content || "").slice(0, 500),
    });
  }
  return items;
}

// Reddit's Atom feed embeds vote/comment counts nowhere standard; we keep the hook
// here (returns null today) so a future Reddit JSON-API source can populate it
// without changing the shared item shape.
function extractRedditEngagement() {
  return null;
}
