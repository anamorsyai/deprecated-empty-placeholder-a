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
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">Search</h1>
      <p className="mb-5 text-sm text-muted">Instant search across titles, summaries, and sources — no server needed.</p>

      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by title, type, or source... (e.g. IDOR, HackerOne, SSRF)"
        inputMode="search"
        className="mb-6 w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
      />

      {!index && <p className="text-muted">Loading index…</p>}

      <ul className="flex flex-col gap-2">
        {results.map((r) => (
          <li key={r.id}>
            <Link
              href={`/writeup/${r.id}`}
              className="card-hover flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-sm hover:text-primary"
            >
              <span className="min-w-0 flex-1 truncate font-bold" dir="auto">
                {r.title}
              </span>
              <span className="hidden shrink-0 text-xs text-muted min-[420px]:block">{r.source}</span>
            </Link>
          </li>
        ))}
      </ul>

      {index && results.length === 0 && <p className="text-muted">No matching results.</p>}
    </div>
  );
}
