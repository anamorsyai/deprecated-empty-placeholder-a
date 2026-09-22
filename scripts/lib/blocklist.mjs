// Curated removal list (data/blocklist.json). The hourly pipeline consults it
// so a writeup a human deliberately removed from the archive is never
// re-added by a later run — relevance filters alone can't do this, because a
// trusted source (Pentester Land) bypasses them by design and a re-extracted
// page can surface under a slightly different title.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "source"].forEach((p) => u.searchParams.delete(p));
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

function normalizeTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function loadBlocklist() {
  try {
    const raw = JSON.parse(
      await readFile(path.join(__dirname, "..", "..", "data", "blocklist.json"), "utf8")
    );
    const entries = Array.isArray(raw) ? raw : (raw.entries ?? []);
    return {
      urls: new Set(entries.map((e) => normalizeUrl(e.url)).filter(Boolean)),
      titles: new Set(entries.map((e) => normalizeTitle(e.title)).filter(Boolean)),
    };
  } catch {
    return { urls: new Set(), titles: new Set() };
  }
}

export function isBlocked(candidate, blocklist) {
  if (!candidate) return false;
  if (candidate.url && blocklist.urls.has(normalizeUrl(candidate.url))) return true;
  const t = normalizeTitle(candidate.title);
  if (t && blocklist.titles.has(t)) return true;
  return false;
}
