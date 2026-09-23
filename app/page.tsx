import Link from "next/link";
import WriteupCard from "@/components/WriteupCard";
import InfiniteFeed from "@/components/InfiniteFeed";
import { categories, categoryCount, getLatest, getMostImpactful, getTrending, meta, platforms, platformCount } from "@/lib/data";

export default function HomePage() {
  const latest = getLatest(12);
  const trending = getTrending(6);
  const impactful = getMostImpactful(6);
  const topCategories = [...categories]
    .filter((c) => c.slug !== "other")
    .map((c) => ({ ...c, count: categoryCount(c.slug) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface2 p-5 sm:p-8">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          Daily <span className="text-primary">Bug Bounty</span> Radar
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          A daily collection from specialized sources — every writeup with an accurate title, a summary, and a
          full step-by-step breakdown that teaches the discovery and exploitation story from zero.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs sm:text-sm">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 font-bold text-primary">
            {meta.totalItems} writeups archived
          </span>
          <span className="rounded-full border border-border bg-bg/40 px-3 py-1.5 text-muted">
            {categories.length - 1} categories
          </span>
          <span className="rounded-full border border-border bg-bg/40 px-3 py-1.5 text-muted">Updated every 5 minutes</span>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-4 text-xl font-extrabold sm:text-2xl">Latest writeups</h2>
          <InfiniteFeed initial={latest} />
        </section>

        <aside className="flex flex-col gap-8">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-primary">🔥 Trending — last 2 weeks</h2>
              <Link href="/trending" className="text-xs text-muted hover:text-primary">
                All
              </Link>
            </div>
            <ol className="flex flex-col gap-3">
              {trending.map((w, i) => (
                <li key={w.id} className="flex gap-2">
                  <span className="w-4 shrink-0 text-sm font-bold text-muted">{i + 1}</span>
                  <WriteupCard writeup={w} compact />
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-bold text-accent">⚠️ Most severe / impactful</h2>
            <ol className="flex flex-col gap-3">
              {impactful.map((w) => (
                <li key={w.id}>
                  <WriteupCard writeup={w} compact />
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-bold">Most active categories</h2>
            <div className="flex flex-wrap gap-2">
              {topCategories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted hover:border-primary hover:text-primary"
                >
                  {c.label_en} <span className="text-muted/70">({c.count})</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-bold">Platforms</h2>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <Link
                  key={p.slug}
                  href={`/platform/${p.slug}`}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted hover:border-primary hover:text-primary"
                >
                  {p.label} <span className="text-muted/70">({platformCount(p.slug)})</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
