import { notFound } from "next/navigation";
import { getAllWriteups, getCategory, getPlatform, getWriteup } from "@/lib/data";
import { SeverityBadge, Tag } from "@/components/Badge";
import { timeAgoAr } from "@/lib/format";

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

  return (
    <article className="mx-auto max-w-2xl">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{w.source.name}</span>
        <span aria-hidden>·</span>
        <span>{timeAgoAr(w.published_at)}</span>
        <span aria-hidden>·</span>
        <span>{new Date(w.published_at).toLocaleDateString("ar-EG", { dateStyle: "long" })}</span>
        <SeverityBadge severity={w.severity} />
      </div>

      <h1 className="mb-4 text-2xl font-extrabold leading-snug" dir="ltr">
        <span className="block text-right" dir="rtl">
          {w.title}
        </span>
      </h1>

      {w.authors.length > 0 && <p className="mb-4 text-sm text-muted">بواسطة: {w.authors.join(", ")}</p>}

      {w.program && <p className="mb-4 text-sm text-muted">الهدف/البرنامج: {w.program}</p>}

      {w.bounty_raw && (
        <p className="mb-4 inline-block rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
          المكافأة المُعلنة: ${w.bounty_raw}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {platform && <Tag href={`/platform/${platform.slug}`}>{platform.label}</Tag>}
        {w.categories.map((slug) => {
          const cat = getCategory(slug);
          if (!cat) return null;
          return (
            <Tag key={slug} href={`/category/${slug}`}>
              {cat.label_ar}
            </Tag>
          );
        })}
      </div>

      {(w.summary_ar || w.summary_en) && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-bold text-primary">ملخص سريع</h2>
          {w.summary_ar && <p className="mb-2 leading-relaxed">{w.summary_ar}</p>}
          {w.summary_en && (
            <p className="text-sm leading-relaxed text-muted" dir="ltr">
              {w.summary_en}
            </p>
          )}
          {!w.ai_generated && (
            <p className="mt-2 text-[11px] text-muted/70">
              ملخص تلقائي بسيط (heuristic) — الموقع لسه من غير مفتاح AI مفعّل، فالملخصات الدقيقة والترجمة العربية هتتفعّل
              تلقائيًا لما يتضاف مفتاح مجاني (Gemini/Groq).
            </p>
          )}
        </div>
      )}

      <a
        href={w.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-lg bg-primary px-5 py-2.5 font-bold text-bg transition hover:opacity-90"
      >
        اقرأ الـ writeup كاملاً في المصدر الأصلي ↗
      </a>
    </article>
  );
}
