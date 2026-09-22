"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Fuse from "fuse.js";

interface IndexEntry {
  id: string;
  title: string;
  summary: string;
  categories: string[];
  platform: string;
  source: string;
  published_at: string;
}

export default function SearchPage() {
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${base}/search-index.json`)
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex([]));
  }, []);

  const fuse = useMemo(() => {
    if (!index) return null;
    return new Fuse(index, {
      keys: ["title", "summary", "categories", "source"],
      threshold: 0.35,
    });
  }, [index]);

  const results = useMemo(() => {
    if (!fuse) return [];
    if (!q.trim()) return index?.slice(0, 20) || [];
    return fuse.search(q).map((r) => r.item);
  }, [fuse, q, index]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">بحث</h1>
      <p className="mb-5 text-sm text-muted">بحث فوري في العنوان، الملخص، والمصدر — من غير سيرفر.</p>

      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="دوّر بالعنوان، النوع، أو المصدر... (مثال: IDOR, HackerOne, SSRF)"
        className="mb-6 w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {!index && <p className="text-muted">جاري تحميل الفهرس...</p>}

      <ul className="flex flex-col gap-2">
        {results.map((r) => (
          <li key={r.id}>
            <Link
              href={`/writeup/${r.id}`}
              className="card-hover flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-sm hover:text-primary"
            >
              <span className="min-w-0 flex-1 truncate font-bold" dir="ltr">
                {r.title}
              </span>
              <span className="shrink-0 text-xs text-muted">{r.source}</span>
            </Link>
          </li>
        ))}
      </ul>

      {index && results.length === 0 && <p className="text-muted">مفيش نتايج مطابقة.</p>}
    </div>
  );
}
