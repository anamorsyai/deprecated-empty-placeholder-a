const SEVERITY_POINTS = { critical: 20, high: 13, medium: 7, low: 3 };
const HALF_LIFE_DAYS = 6; // "trending" decays fast so the front page stays fresh daily

// Composite ranking score used for the "Trending" / "Most impactful" rails.
// Transparent by design (documented in the site footer): recency + disclosed
// bounty size + our severity read + any real engagement signal we have.
export function computeScore(item) {
  const now = Date.now();
  const publishedMs = item.publishedAt ? Date.parse(item.publishedAt) : now;
  const ageDays = Math.max(0, (now - publishedMs) / 86_400_000);
  const recencyPoints = 40 * Math.pow(0.5, ageDays / HALF_LIFE_DAYS);

  const bountyAmount = parseBounty(item.bountyRaw);
  const bountyPoints = bountyAmount > 0 ? Math.min(30, 6 * Math.log10(bountyAmount + 1)) : 0;

  const severityPoints = SEVERITY_POINTS[item.severity] || 0;

  const engagementPoints = item.engagement
    ? Math.min(10, Math.log10((item.engagement.ups || 0) + (item.engagement.comments || 0) * 2 + 1) * 4)
    : 0;

  return Math.round((recencyPoints + bountyPoints + severityPoints + engagementPoints) * 100) / 100;
}

function parseBounty(raw) {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
