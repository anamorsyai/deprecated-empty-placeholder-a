"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WriteupCard from "@/components/WriteupCard";
import type { WriteupCardData } from "@/lib/types";

const PAGE_SIZE = 12;

interface Props {
  /** First page, already rendered server-side (fast paint, works with JS off). */
  initial: WriteupCardData[];
  /** Only feed items matching this category slug. */
  category?: string;
  /** Only feed items matching this platform slug. */
  platform?: string;
}

export default function InfiniteFeed({ initial, category, platform }: Props) {
  const [all, setAll] = useState<WriteupCardData[] | null>(null);
  const [count, setCount] = useState(initial.length);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${base}/feed.json`)
      .then((r) => r.json())
      .then((feed: WriteupCardData[]) => {
        const filtered = category
          ? feed.filter((w) => w.categories.includes(category))
          : platform
            ? feed.filter((w) => w.platform_slug === platform)
            : feed;
        setAll(filtered);
      })
      .catch(() => setAll(initial));
  }, [category, platform, initial]);

  // The build-time `initial` page and the client-fetched `all` list are both
  // sorted newest-first from the same source, so `initial` is always exactly
  // `all`'s own first N items — no id-matching needed, just keep counting
  // further into the same list once it's loaded.
  const items = useMemo(() => (all ?? initial).slice(0, count), [all, initial, count]);
  const hasMore = (all ?? initial).length > items.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((w) => (
          <WriteupCard key={w.id} writeup={w} />
        ))}
      </div>

      {hasMore ? (
        <div ref={sentinelRef} className="flex justify-center py-8 text-sm text-muted">
          <span className="animate-pulse">جاري تحميل المزيد...</span>
        </div>
      ) : (
        all !== null && (
          <p className="py-8 text-center text-sm text-muted">وصلت لآخر الأرشيف — {items.length} writeup.</p>
        )
      )}
    </div>
  );
}
