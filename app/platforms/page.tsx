import Link from "next/link";
import { platformCount, platforms } from "@/lib/data";

export const metadata = { title: "المنصات" };

export default function PlatformsPage() {
  const sorted = [...platforms].sort((a, b) => platformCount(b.slug) - platformCount(a.slug));
  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold">المنصات</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((p) => (
          <Link
            key={p.slug}
            href={`/platform/${p.slug}`}
            className="card-hover flex items-center justify-between rounded-xl border border-border bg-surface p-4"
          >
            <div className="font-bold">{p.label}</div>
            <span className="rounded-full bg-bg px-2 py-1 text-xs text-primary">{platformCount(p.slug)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
