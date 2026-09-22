import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllWriteups, getCategory, getPlatform, getWriteup } from "@/lib/data";
import { SeverityBadge, Tag } from "@/components/Badge";
import { timeAgoAr } from "@/lib/format";
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

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-xs text-muted hover:text-primary">
        ← الرئيسية
      </Link>

      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <span>{w.source.name}</span>
        <span aria-hidden>·</span>
        <span>{new Date(w.published_at).toLocaleDateString("ar-EG", { dateStyle: "long" })}</span>
        <span aria-hidden>·</span>
        <span>{timeAgoAr(w.published_at)}</span>
        <SeverityBadge severity={w.severity} />
      </div>

      <h1 className="mb-4 break-words text-xl font-extrabold leading-snug sm:text-2xl" dir="ltr">
        <span className="block text-right" dir="rtl">
          {w.title}
        </span>
      </h1>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        {w.authors.length > 0 && <span>بواسطة: {w.authors.join(", ")}</span>}
        {w.program && <span>الهدف: {w.program}</span>}
      </div>

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

      <a
        href={w.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-bg transition hover:opacity-90 sm:hidden"
      >
        اقرأ المصدر الأصلي ↗
      </a>

      {(w.summary_ar || w.summary_en) && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-bold text-primary">ملخص سريع</h2>
          {w.summary_ar && <p className="mb-2 leading-relaxed">{w.summary_ar}</p>}
          {w.summary_en && (
            <p className="text-sm leading-relaxed text-muted" dir="ltr">
              {w.summary_en}
            </p>
          )}
        </div>
      )}

      <LessonSection lesson={w.lesson} aiGenerated={w.ai_generated} />

      <a
        href={w.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-bg transition hover:opacity-90 sm:inline-flex"
      >
        اقرأ الـ writeup كاملاً في المصدر الأصلي ↗
      </a>
    </article>
  );
}

const SIDE_SECTIONS: { key: keyof Lesson; icon: string; title: string }[] = [
  { key: "cause_ar", icon: "🧬", title: "السبب الجذري" },
  { key: "takeaway_ar", icon: "🎯", title: "الدرس المستفاد" },
  { key: "fix_ar", icon: "🩹", title: "الإصلاح الصحيح" },
];

function LessonSection({ lesson, aiGenerated }: { lesson: Lesson | null; aiGenerated: boolean }) {
  const hasWalkthrough = Boolean(lesson?.walkthrough_ar);
  const sideSections = SIDE_SECTIONS.filter((s) => lesson?.[s.key]);

  if (!hasWalkthrough && sideSections.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-border bg-surface/50 p-4 text-sm leading-relaxed text-muted sm:p-5">
        <h2 className="mb-1 text-sm font-bold">📚 الدرس الكامل</h2>
        <p>
          الشرح التفصيلي (السبب الجذري، قصة الاكتشاف والاستغلال، الدرس المستفاد، طريقة الإصلاح) بيتولّد بالـ AI ولسه
          الموقع من غير مفتاح مفعّل. ضيف مفتاح Gemini مجاني (شرح في README) وهيظهر تلقائيًا من غير ما تعمل حاجة تانية.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-4">
      {hasWalkthrough && (
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-surface to-surface2 p-4 sm:p-6">
          <div className="pointer-events-none absolute -end-8 -top-8 text-[6rem] leading-none text-primary/10 sm:text-[8rem]">
            &rdquo;
          </div>
          <h2 className="relative mb-3 flex items-center gap-2 text-base font-extrabold text-primary sm:text-lg">
            🛠️ قصة الاكتشاف والاستغلال
          </h2>
          <p className="relative break-words text-[15px] leading-[1.9] text-ink sm:text-base">{lesson!.walkthrough_ar}</p>
        </div>
      )}

      {sideSections.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {sideSections.map((s) => (
            <div key={s.key} className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-1.5 text-sm font-bold">
                {s.icon} {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">{lesson![s.key]}</p>
            </div>
          ))}
        </div>
      )}

      {!aiGenerated && (
        <p className="text-[11px] text-muted/70">ده شرح تلقائي بسيط — لسه من غير مفتاح AI مفعّل.</p>
      )}
    </div>
  );
}
