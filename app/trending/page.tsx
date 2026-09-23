import WriteupCard from "@/components/WriteupCard";
import { getMostImpactful, getTrending } from "@/lib/data";

export const metadata = { title: "Trending" };

export default function TrendingPage() {
  const trending = getTrending(30);
  const impactful = getMostImpactful(30);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">🔥 Trending — last 2 weeks</h1>
        <p className="mb-5 text-sm text-muted">
          Ranked by a blend of recency + disclosed bounty + severity — details in the footer.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trending.map((w) => (
            <WriteupCard key={w.id} writeup={w} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-2xl font-extrabold text-accent sm:text-3xl">⚠️ Most severe / impactful (all time)</h2>
        <p className="mb-5 text-sm text-muted">Sorted by severity first (critical → low), then by the same ranking formula.</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {impactful.map((w) => (
            <WriteupCard key={w.id} writeup={w} />
          ))}
        </div>
      </section>
    </div>
  );
}
