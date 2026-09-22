import { notFound } from "next/navigation";
import WriteupCard from "@/components/WriteupCard";
import { categories, getByCategory, getCategory } from "@/lib/data";

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const cat = getCategory(params.slug);
  return { title: cat ? cat.label_ar : "تصنيف" };
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const cat = getCategory(params.slug);
  if (!cat) notFound();
  const writeups = getByCategory(params.slug);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold sm:text-3xl">{cat.label_ar}</h1>
      <p className="mb-5 font-mono text-xs text-muted">{cat.label_en} · {writeups.length} writeup</p>
      {writeups.length === 0 ? (
        <p className="text-muted">لسه معندناش writeups في التصنيف ده.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {writeups.map((w) => (
            <WriteupCard key={w.id} writeup={w} />
          ))}
        </div>
      )}
    </div>
  );
}
