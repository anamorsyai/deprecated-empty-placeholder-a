import Link from "next/link";
import type { Writeup } from "@/lib/types";
import { getCategory, getPlatform } from "@/lib/data";
import { SeverityBadge, Tag } from "@/components/Badge";
import { timeAgoAr } from "@/lib/format";

export default function WriteupCard({ writeup, compact = false }: { writeup: Writeup; compact?: boolean }) {
  const platform = getPlatform(writeup.platform_slug);
  const summary = writeup.summary_ar || writeup.summary_en || writeup.excerpt;

  return (
    <article className="card-hover flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span>{writeup.source.name}</span>
        <span aria-hidden>·</span>
        <span>{timeAgoAr(writeup.published_at)}</span>
        {writeup.bounty_raw && (
          <>
            <span aria-hidden>·</span>
            <span className="font-semibold text-primary">${writeup.bounty_raw}</span>
          </>
        )}
        <SeverityBadge severity={writeup.severity} />
      </div>

      <Link href={`/writeup/${writeup.id}`} className="text-base font-bold leading-snug text-[#e6edf3] hover:text-primary" dir="ltr">
        <span className="block text-right" dir="rtl">
          {writeup.title}
        </span>
      </Link>

      {!compact && summary && (
        <p className="line-clamp-2 text-sm text-muted" dir={writeup.summary_ar ? "rtl" : "ltr"}>
          {summary}
        </p>
      )}

      <div className="mt-1 flex flex-wrap gap-1.5">
        {platform && <Tag href={`/platform/${platform.slug}`}>{platform.label}</Tag>}
        {writeup.categories.map((slug) => {
          const cat = getCategory(slug);
          if (!cat) return null;
          return (
            <Tag key={slug} href={`/category/${slug}`}>
              {cat.label_ar}
            </Tag>
          );
        })}
      </div>

      <a
        href={writeup.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 w-fit text-xs font-semibold text-primary hover:underline"
      >
        اقرأ الـ writeup الأصلي ↗
      </a>
    </article>
  );
}
