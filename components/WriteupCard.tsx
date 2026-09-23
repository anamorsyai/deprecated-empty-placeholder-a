import Link from "next/link";
import type { WriteupCardData } from "@/lib/types";
import { getCategory, getPlatform } from "@/lib/data";
import { SEVERITY_BORDER, SeverityBadge, Tag } from "@/components/Badge";
import { timeAgoEn } from "@/lib/format";

export default function WriteupCard({ writeup, compact = false }: { writeup: WriteupCardData; compact?: boolean }) {
  const platform = getPlatform(writeup.platform_slug);
  const summary = writeup.summary_en || writeup.summary_ar || writeup.excerpt;
  const borderColor = writeup.severity ? SEVERITY_BORDER[writeup.severity] : "border-s-border";

  return (
    <article className={`card-hover flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-surface p-4 border-s-4 sm:p-5 ${borderColor}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
        <span className="truncate">{writeup.source.name}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{timeAgoEn(writeup.published_at)}</span>
        {typeof writeup.readingMinutes === "number" && writeup.readingMinutes > 0 && (
          <>
            <span aria-hidden>·</span>
            <span className="shrink-0">{writeup.readingMinutes} min read</span>
          </>
        )}
        {writeup.bounty_raw && (
          <>
            <span aria-hidden>·</span>
            <span className="shrink-0 font-semibold text-primary">${writeup.bounty_raw}</span>
          </>
        )}
        <SeverityBadge severity={writeup.severity} />
      </div>

      <Link
        href={`/writeup/${writeup.id}`}
        className="break-words text-[15px] font-bold leading-snug text-ink hover:text-primary sm:text-base"
        dir="auto"
      >
        {writeup.title}
      </Link>

      {!compact && summary && (
        <p className="line-clamp-2 break-words text-sm leading-relaxed text-muted" dir="auto">
          {summary}
        </p>
      )}

      <div className="mt-0.5 flex flex-wrap gap-1.5">
        {platform && <Tag href={`/platform/${platform.slug}`}>{platform.label}</Tag>}
        {writeup.categories.map((slug) => {
          const cat = getCategory(slug);
          if (!cat) return null;
          return (
            <Tag key={slug} href={`/category/${slug}`}>
              {cat.label_en}
            </Tag>
          );
        })}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href={`/writeup/${writeup.id}`}
          className="inline-flex min-h-[44px] items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20"
        >
          Read full breakdown
        </Link>
        <a
          href={writeup.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center text-xs font-semibold text-muted transition hover:text-primary"
        >
          Original source ↗
        </a>
      </div>
    </article>
  );
}
