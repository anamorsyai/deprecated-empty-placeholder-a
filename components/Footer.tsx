import { meta } from "@/lib/data";

export default function Footer() {
  const lastRun = meta.lastRun ? new Date(meta.lastRun).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) : "—";
  return (
    <footer className="mt-10 border-t border-border py-6 text-xs text-muted">
      <p>
        آخر تحديث للبيانات: <span className="text-muted/80">{lastRun}</span> · {meta.totalItems} تدوينة مؤرشفة · محرك التصنيف
        الحالي: <span className="font-mono">{meta.aiProvider}</span>
      </p>
      <p className="mt-2 leading-relaxed">
        الموقع لا ينسخ محتوى الكتابات الأصلية — كل بطاقة تعرض عنوانًا دقيقًا وملخصًا فقط ثم تحيلك لرابط المصدر الأصلي. ترتيب
        &quot;الأكثر تأثيرًا&quot; يعتمد على حداثة النشر + قيمة المكافأة المُعلنة + تقييم الخطورة، وليس على مقاييس انتشار اجتماعي فعلية.
      </p>
    </footer>
  );
}
