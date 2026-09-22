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
        </div>
      )}

      <LessonSection lesson={w.lesson} aiGenerated={w.ai_generated} />

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

const LESSON_SECTIONS: { key: keyof Lesson; icon: string; title: string }[] = [
  { key: "cause_ar", icon: "🧬", title: "السبب الجذري" },
  { key: "walkthrough_ar", icon: "🛠️", title: "خطوة بخطوة: الاكتشاف والاستغلال" },
  { key: "takeaway_ar", icon: "🎯", title: "الدرس المستفاد" },
  { key: "fix_ar", icon: "🩹", title: "الإصلاح الصحيح" },
];

function LessonSection({ lesson, aiGenerated }: { lesson: Lesson | null; aiGenerated: boolean }) {
  const sections = LESSON_SECTIONS.filter((s) => lesson?.[s.key]);

  if (sections.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-border bg-surface/50 p-4 text-sm text-muted">
        <h2 className="mb-1 text-sm font-bold">📚 الدرس الكامل</h2>
        <p>
          الشرح التفصيلي (السبب الجذري، خطوات الاستغلال، الدرس المستفاد، طريقة الإصلاح) بيتولّد بالـ AI ولسه الموقع من
          غير مفتاح مفعّل. ضيف مفتاح Gemini مجاني (شرح في README) وهيظهر تلقائيًا من غير ما تعمل حاجة تانية.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-primary/30 bg-surface p-4">
      <h2 className="mb-4 text-base font-extrabold text-primary">📚 الدرس الكامل</h2>
      <div className="flex flex-col gap-4">
        {sections.map((s) => (
          <div key={s.key}>
            <h3 className="mb-1.5 text-sm font-bold">
              {s.icon} {s.title}
            </h3>
            <p className="leading-relaxed text-[#e6edf3]">{lesson![s.key]}</p>
          </div>
        ))}
      </div>
      {!aiGenerated && (
        <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted/70">
          ده شرح تلقائي بسيط — لسه من غير مفتاح AI مفعّل.
        </p>
      )}
    </div>
  );
}
