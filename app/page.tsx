import Link from "next/link";
import WriteupCard from "@/components/WriteupCard";
import { categories, categoryCount, getLatest, getMostImpactful, getTrending, platforms, platformCount } from "@/lib/data";

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
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="mb-1 text-2xl font-extrabold">أحدث الـ Writeups</h1>
        <p className="mb-5 text-sm text-muted">
          تجميعة يومية من عدة مصادر (Pentester Land، InfoSec Write-ups، PortSwigger Research، Intigriti، ZDI وغيرها) — كل
          عنوان وملخص مُستخرج ومُصنّف تلقائيًا.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {latest.map((w) => (
            <WriteupCard key={w.id} writeup={w} />
          ))}
        </div>
      </section>

      <aside className="flex flex-col gap-8">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary">🔥 تريند آخر أسبوعين</h2>
            <Link href="/trending" className="text-xs text-muted hover:text-primary">
              الكل
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
          <h2 className="mb-3 text-sm font-bold text-accent">⚠️ الأكثر خطورة/تأثيرًا</h2>
          <ol className="flex flex-col gap-3">
            {impactful.map((w) => (
              <li key={w.id}>
                <WriteupCard writeup={w} compact />
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold">التصنيفات الأكثر نشاطًا</h2>
          <div className="flex flex-wrap gap-2">
            {topCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted hover:border-primary hover:text-primary"
              >
                {c.label_ar} <span className="text-muted/70">({c.count})</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold">المنصات</h2>
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
  );
}
