import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllWriteups, getCategory, getPlatform, getWriteup } from "@/lib/data";
import { SeverityBadge, Tag } from "@/components/Badge";
import TranslateSection from "@/components/TranslateSection";
import { timeAgoEn } from "@/lib/format";
import type { Lesson } from "@/lib/types";

export function generateStaticParams() {
  return getAllWriteups().map((w) => ({ id: w.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const w = getWriteup(params.id);
  return { title: w ? w.title : "Writeup" };
}

export default function WriteupPage({ params }: { params: { id: string } }) {
  const w = getWriteup(params.id);
  if (!w) notFound();
  const platform = getPlatform(w.platform_slug);
  const lesson = w.lesson as (Lesson & Record<string, string | null>) | null;
  const pick = (enKey: string, arKey: string) => ({
    en: (lesson?.[enKey] as string | null) || null,
    ar: (lesson?.[arKey] as string | null) || null,
  });
  const cause = pick("cause", "cause_ar");
  const walk = pick("walkthrough", "walkthrough_ar");
  const example = pick("example", "example_ar");
  const takeaway = pick("takeaway", "takeaway_ar");
  const fix = pick("fix", "fix_ar");
  const hasLesson = [cause, walk, example, takeaway, fix].some((s) => s.en || s.ar);
  const readingText = [walk.en || walk.ar, cause.en || cause.ar, example.en || example.ar]
    .filter(Boolean)
    .join(" ");
  const readingMins = readingText
    ? Math.max(1, Math.ceil(readingText.split(/\s+/).length / 200))
    : 0;

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/" className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-xs text-muted hover:text-primary">
        ← Home
      </Link>

      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <span>{w.source.name}</span>
        <span aria-hidden>·</span>
        <span>{new Date(w.published_at).toLocaleDateString("en-US", { dateStyle: "long" })}</span>
        <span aria-hidden>·</span>
        <span>{timeAgoEn(w.published_at)}</span>
        {readingMins > 0 && (
          <>
            <span aria-hidden>·</span>
            <span>{readingMins} min read</span>
          </>
        )}
        <SeverityBadge severity={w.severity} />
      </div>

      <h1 className="mb-4 break-words text-xl font-extrabold leading-snug sm:text-2xl" dir="auto">
        {w.title}
      </h1>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        {w.authors.length > 0 && <span>By: {w.authors.join(", ")}</span>}
        {w.program && <span>Target: {w.program}</span>}
      </div>

      {w.bounty_raw && (
        <p className="mb-4 inline-block rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
          Disclosed bounty: ${w.bounty_raw}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {platform && <Tag href={`/platform/${platform.slug}`}>{platform.label}</Tag>}
        {w.categories.map((slug) => {
          const cat = getCategory(slug);
          if (!cat) return null;
          return (
            <Tag key={slug} href={`/category/${slug}`}>
              {cat.label_en}
            </Tag>
          );
        })}
      </div>

      <a
        href={w.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-bg transition hover:opacity-90 sm:hidden"
      >
        Read the original ↗
      </a>

      {(w.summary_en || w.summary_ar || w.excerpt) && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-bold text-primary">Quick summary</h2>
          <TranslateSection
            cacheId={`${w.id}-summary`}
            en={w.summary_en}
            ar={w.summary_ar}
            className="mb-2 break-words leading-relaxed"
          />
          {!w.summary_en && !w.summary_ar && w.excerpt && (
            <p className="break-words text-sm leading-relaxed text-muted" dir="auto">
              {w.excerpt}
            </p>
          )}
        </div>
      )}

      {hasLesson ? (
        <div className="mb-6 flex flex-col gap-4">
          {(walk.en || walk.ar) && (
            <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-surface to-surface2 p-4 sm:p-6">
              <h2 className="relative mb-3 flex items-center gap-2 text-base font-extrabold text-primary sm:text-lg">
                🛠️ Discovery &amp; exploitation, step by step
              </h2>
              <TranslateSection cacheId={`${w.id}-walk`} en={walk.en} ar={walk.ar} />
            </div>
          )}

          {(example.en || example.ar) && (
            <div className="relative overflow-hidden rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 sm:p-6">
              <h2 className="relative mb-1 flex items-center gap-2 text-base font-extrabold text-primary sm:text-lg">
                🧪 Training example
              </h2>
              <p className="relative mb-3 text-xs text-muted">
                A simplified parallel example of the same bug class on a fictional target — not from the original article.
                / مثال تدريبي مبسّط لنفس فئة الثغرة — ليس من المقال الأصلي.
              </p>
              <TranslateSection cacheId={`${w.id}-example`} en={example.en} ar={example.ar} />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <SideCard icon="🧬" title="Root cause" cacheId={`${w.id}-cause`} en={cause.en} ar={cause.ar} />
            <SideCard icon="🎯" title="Takeaway" cacheId={`${w.id}-takeaway`} en={takeaway.en} ar={takeaway.ar} />
            <SideCard icon="🩹" title="Proper fix" cacheId={`${w.id}-fix`} en={fix.en} ar={fix.ar} />
          </div>

          {!w.ai_generated && (
            <p className="text-[11px] text-muted/70">Auto-generated baseline — full AI breakdown pending.</p>
          )}
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-dashed border-border bg-surface/50 p-4 text-sm leading-relaxed text-muted sm:p-5">
          <h2 className="mb-1 text-sm font-bold">📚 Full breakdown</h2>
          <p>
            The detailed explanation (root cause, step-by-step discovery story, takeaway, fix) is generated
            automatically and hasn&apos;t been produced for this writeup yet. Check back after the next
            pipeline run.
          </p>
        </div>
      )}

      <a
        href={w.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden min-h-[48px] items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-bg transition hover:opacity-90 sm:inline-flex"
      >
        Read the full writeup at the original source ↗
      </a>
    </article>
  );
}

function SideCard({
  icon,
  title,
  cacheId,
  en,
  ar,
}: {
  icon: string;
  title: string;
  cacheId: string;
  en: string | null;
  ar: string | null;
}) {
  if (!en && !ar) return null;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-1.5 text-sm font-bold">
        {icon} {title}
      </h3>
      <TranslateSection
        cacheId={cacheId}
        en={en}
        ar={ar}
        className="break-words text-sm leading-relaxed text-muted"
      />
    </div>
  );
}
