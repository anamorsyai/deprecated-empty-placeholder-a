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
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">بحث</h1>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="دوّر بالعنوان، النوع، أو المصدر... (مثال: IDOR, HackerOne, SSRF)"
        className="mb-6 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
      />

      {!index && <p className="text-muted">جاري تحميل الفهرس...</p>}

      <ul className="flex flex-col gap-2">
        {results.map((r) => (
          <li key={r.id}>
            <Link
              href={`/writeup/${r.id}`}
              className="card-hover block rounded-lg border border-border bg-surface p-3 text-sm hover:text-primary"
            >
              <span className="font-bold" dir="ltr">
                {r.title}
              </span>
              <span className="ms-2 text-xs text-muted">{r.source}</span>
            </Link>
          </li>
        ))}
      </ul>

      {index && results.length === 0 && <p className="text-muted">مفيش نتايج مطابقة.</p>}
    </div>
  );
}
