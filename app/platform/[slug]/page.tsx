import { notFound } from "next/navigation";
import InfiniteFeed from "@/components/InfiniteFeed";
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
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">{platform.label}</h1>
      <p className="mb-5 text-xs text-muted">{writeups.length} writeup</p>
      {writeups.length === 0 ? (
        <p className="text-muted">لسه معندناش writeups من المنصة دي.</p>
      ) : (
        <InfiniteFeed initial={writeups.slice(0, 12)} platform={params.slug} />
      )}
    </div>
  );
}
