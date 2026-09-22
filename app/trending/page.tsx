import WriteupCard from "@/components/WriteupCard";
import { getMostImpactful, getTrending } from "@/lib/data";

export const metadata = { title: "الأكثر تأثيرًا" };

export default function TrendingPage() {
  const trending = getTrending(30);
  const impactful = getMostImpactful(30);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">🔥 تريند آخر أسبوعين</h1>
        <p className="mb-5 text-sm text-muted">
          مرتبة حسب مزيج من حداثة النشر + قيمة المكافأة المُعلنة + خطورة الثغرة — التفاصيل في أسفل الصفحة.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trending.map((w) => (
            <WriteupCard key={w.id} writeup={w} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-2xl font-extrabold text-accent sm:text-3xl">⚠️ الأكثر خطورة/تأثيرًا (كل الأوقات)</h2>
        <p className="mb-5 text-sm text-muted">مرتبة أولًا حسب تقييم الخطورة (حرجة → منخفضة) ثم حسب نفس معادلة الترتيب.</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {impactful.map((w) => (
            <WriteupCard key={w.id} writeup={w} />
          ))}
        </div>
      </section>
    </div>
  );
}
