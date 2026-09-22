import rawWriteups from "@/data/writeups.json";
import rawMeta from "@/data/meta.json";
import rawTaxonomy from "@/taxonomy.json";
import type { CategoryDef, Meta, PlatformDef, Writeup } from "@/lib/types";

const writeups = rawWriteups as unknown as Writeup[];
export const meta = rawMeta as unknown as Meta;
export const categories = rawTaxonomy.categories as CategoryDef[];
export const platforms = rawTaxonomy.platforms as PlatformDef[];

const TRENDING_WINDOW_DAYS = 14;

export function getAllWriteups(): Writeup[] {
  return writeups;
}

export function getLatest(limit = 30): Writeup[] {
  return [...writeups].sort((a, b) => b.published_at.localeCompare(a.published_at)).slice(0, limit);
}

export function getTrending(limit = 12): Writeup[] {
  const cutoff = Date.now() - TRENDING_WINDOW_DAYS * 86_400_000;
  return [...writeups]
    .filter((w) => Date.parse(w.published_at) >= cutoff)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getMostImpactful(limit = 12): Writeup[] {
  const rank = { critical: 3, high: 2, medium: 1, low: 0 } as const;
  return [...writeups]
    .sort((a, b) => {
      const sa = a.severity ? rank[a.severity] : -1;
      const sb = b.severity ? rank[b.severity] : -1;
      if (sb !== sa) return sb - sa;
      return b.score - a.score;
    })
    .slice(0, limit);
}

export function getByCategory(slug: string): Writeup[] {
  return writeups
    .filter((w) => w.categories.includes(slug))
    .sort((a, b) => b.published_at.localeCompare(a.published_at));
}

export function getByPlatform(slug: string): Writeup[] {
  return writeups
    .filter((w) => w.platform_slug === slug)
    .sort((a, b) => b.published_at.localeCompare(a.published_at));
}

export function getWriteup(id: string): Writeup | undefined {
  return writeups.find((w) => w.id === id);
}

export function getCategory(slug: string): CategoryDef | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getPlatform(slug: string): PlatformDef | undefined {
  return platforms.find((p) => p.slug === slug);
}

export function categoryCount(slug: string): number {
  return writeups.filter((w) => w.categories.includes(slug)).length;
}

export function platformCount(slug: string): number {
  return writeups.filter((w) => w.platform_slug === slug).length;
}
