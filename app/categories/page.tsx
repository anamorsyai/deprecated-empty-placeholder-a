import Link from "next/link";
import { categories, categoryCount } from "@/lib/data";

export const metadata = { title: "التصنيفات" };

export default function CategoriesPage() {
  const sorted = [...categories].sort((a, b) => categoryCount(b.slug) - categoryCount(a.slug));
  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold">التصنيفات</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="card-hover flex items-center justify-between rounded-xl border border-border bg-surface p-4"
          >
            <div>
              <div className="font-bold">{c.label_ar}</div>
              <div className="font-mono text-xs text-muted">{c.label_en}</div>
            </div>
            <span className="rounded-full bg-bg px-2 py-1 text-xs text-primary">{categoryCount(c.slug)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
