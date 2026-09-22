import { meta } from "@/lib/data";

export default function Footer() {
  const lastRun = meta.lastRun ? new Date(meta.lastRun).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) : "—";
  return (
    <footer className="mt-12 border-t border-border py-6 text-xs leading-relaxed text-muted sm:py-8">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span>آخر تحديث للبيانات: {lastRun}</span>
        <span aria-hidden className="text-border">
          ·
        </span>
        <span>{meta.totalItems} تدوينة مؤرشفة</span>
        <span aria-hidden className="text-border">
          ·
        </span>
        <span>
          محرك التصنيف: <span className="font-mono text-primary/80">{meta.aiProvider}</span>
        </span>
        {typeof meta.aiGeneratedTotal === "number" && (
          <>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>{meta.aiGeneratedTotal} بمعالجة AI</span>
          </>
        )}
        {typeof meta.aiFallbackThisRun === "number" && meta.aiFallbackThisRun > 0 && (
          <>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>آخر تشغيلة: {meta.aiFallbackThisRun} بدون AI</span>
          </>
        )}
      </p>
      <p className="mt-3 max-w-2xl">
        الموقع لا ينسخ محتوى الكتابات الأصلية — كل بطاقة تعرض عنوانًا دقيقًا وملخصًا فقط ثم تحيلك لرابط المصدر الأصلي. ترتيب
        &quot;الأكثر تأثيرًا&quot; يعتمد على حداثة النشر + قيمة المكافأة المُعلنة + تقييم الخطورة، وليس على مقاييس انتشار اجتماعي فعلية.
      </p>
    </footer>
  );
}
