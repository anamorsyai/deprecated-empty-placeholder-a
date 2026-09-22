import { notFound } from "next/navigation";
import WriteupCard from "@/components/WriteupCard";
import { getByPlatform, getPlatform, platforms } from "@/lib/data";

export function generateStaticParams() {
  return platforms.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const p = getPlatform(params.slug);
  return { title: p ? p.label : "منصة" };
}

export default function PlatformPage({ params }: { params: { slug: string } }) {
  const platform = getPlatform(params.slug);
  if (!platform) notFound();
  const writeups = getByPlatform(params.slug);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">{platform.label}</h1>
      <p className="mb-5 text-xs text-muted">{writeups.length} writeup</p>
      {writeups.length === 0 ? (
        <p className="text-muted">لسه معندناش writeups من المنصة دي.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {writeups.map((w) => (
            <WriteupCard key={w.id} writeup={w} />
          ))}
        </div>
      )}
    </div>
  );
}
