export type Severity = "critical" | "high" | "medium" | "low" | null;

export interface Writeup {
  id: string;
  title: string;
  url: string;
  source: { slug: string; name: string };
  authors: string[];
  program: string | null;
  platform_slug: string;
  bounty_raw: string | null;
  published_at: string;
  added_at: string;
  categories: string[];
  severity: Severity;
  summary_en: string;
  summary_ar: string | null;
  excerpt: string | null;
  ai_generated: boolean;
  engagement: { ups?: number; comments?: number } | null;
  score: number;
}

export interface CategoryDef {
  slug: string;
  label_en: string;
  label_ar: string;
  keywords: string[];
}

export interface PlatformDef {
  slug: string;
  label: string;
  match: string[];
}

export interface Meta {
  lastRun: string;
  totalItems: number;
  newItemsThisRun: number;
  aiProvider: string;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
}
