import { notFound } from "next/navigation";
import InfiniteFeed from "@/components/InfiniteFeed";
import { categories, getByCategory, getCategory } from "@/lib/data";

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const cat = getCategory(params.slug);
  return { title: cat ? cat.label_en : "Category" };
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const cat = getCategory(params.slug);
  if (!cat) notFound();
  const writeups = getByCategory(params.slug);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">{cat.label_en}</h1>
      <p className="mb-5 font-mono text-xs text-muted">
        {cat.label_en} · {writeups.length} writeups
      </p>
      {writeups.length === 0 ? (
        <p className="text-muted">No writeups in this category yet.</p>
      ) : (
        <InfiniteFeed initial={writeups.slice(0, 12)} category={params.slug} />
      )}
    </div>
  );
}
