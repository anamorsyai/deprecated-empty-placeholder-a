export type Severity = "critical" | "high" | "medium" | "low" | null;

export interface Lesson {
  /** English lesson (current prompt). Null when not yet taught. */
  cause: string | null;
  walkthrough: string | null;
  /** Illustrative parallel example composed by the AI (fictional target) — not from the article. */
  example: string | null;
  takeaway: string | null;
  fix: string | null;
  /** Legacy pre-English Arabic lesson — kept so the translate toggle can show it. */
  cause_ar?: string | null;
  walkthrough_ar?: string | null;
  example_ar?: string | null;
  takeaway_ar?: string | null;
  fix_ar?: string | null;
}

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
  lesson: Lesson | null;
  excerpt: string | null;
  ai_generated: boolean;
  engagement: { ups?: number; comments?: number } | null;
  score: number;
}

// The subset of a Writeup that WriteupCard (and the client-side feed.json it
// can also be fed by, for infinite scroll) actually needs to render — never
// includes `lesson`, which is only fetched on the writeup's own page.
export interface WriteupCardData {
  id: string;
  title: string;
  url: string;
  source: { slug: string; name: string };
  program: string | null;
  platform_slug: string;
  bounty_raw: string | null;
  published_at: string;
  categories: string[];
  severity: Severity;
  summary_en: string;
  summary_ar: string | null;
  excerpt: string | null;
  score: number;
  /** Estimated full-breakdown reading time, computed at build time. 0 = no lesson yet. */
  readingMinutes?: number;
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
  /** How many of the last run's new items got a real AI read vs heuristic. */
  aiOkThisRun?: number;
  aiFallbackThisRun?: number;
  /** Archive-wide count of items with ai_generated=true. */
  aiGeneratedTotal?: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
}
