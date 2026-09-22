// Keeps the site "bug bounty only" — filters out the business/interview/news/CTF
// noise that bug-bounty-adjacent blogs (Intigriti, InfoSec Write-ups, r/netsec)
// also publish alongside real vulnerability writeups. Runs cheaply on
// title+snippet BEFORE we ever spend a Jina/AI call on a candidate.

// Content that is never a bug bounty writeup, regardless of source.
const EXCLUDE_RE =
  /\b(interview with|hacker spotlight|bug ?bytes|weekly digest|newsletter|webinar|we'?re hiring|job opening|now hiring|career advice|business insights|press release|partnership|product update|changelog|roadmap|conference recap|meetup|now available|introducing crowdrecon|year in review|month in review)\b/i;

// CTF / training-lab platforms are a different genre from a real bug bounty
// program writeup, even though they get tagged similarly.
const LAB_CTF_RE = /\b(tryhackme|hack ?the ?box|vulnhub|overthewire|picoctf|ctf write-?up|root-?me)\b/i;

// Positive signal that a piece is actually about a bug bounty program report:
// a platform name, a bounty/dollar figure, disclosure language, or a specific
// severity/report vocabulary bug hunters use.
const INCLUDE_RE =
  /\b(bug ?bounty|hackerone|bugcrowd|intigriti|yeswehack|synack|h1-\d|\$\d|bounty|responsible disclosure|vulnerability disclosure program|\bvdp\b|\bp[1-4]\b|critical severity|account takeover|idor|bola|bfla|ssrf|xxe|ssti|ssrf|sqli|nosqli|xss|csrf|cors|race condition|privilege escalation|subdomain takeover|mass assignment|open redirect|jwt|oauth|graphql|rce|command injection|path traversal|cache poisoning|request smuggling)\b/i;

// Meta/announcement posts ("Introducing CrowdRecon", "How to appeal a bug
// bounty submission") mention bounty vocabulary constantly without ever being
// a writeup — catch the common shapes explicitly.
const META_POST_RE =
  /\b(introducing|unleashed|is coming\b|meet (the|your|crowdrecon)|named (the )?(new )?(official )?provider|how to appeal|how to become|guide to (starting|getting started)|checklist for|tips? for (new|beginner)s?|announcing|we'?re (excited|thrilled|proud) to)\b/i;

export function isLikelyBugBounty(candidate, source) {
  if (source?.trustedBugBounty) return true;

  const haystack = `${candidate.title || ""} ${(candidate.tagHints || []).join(" ")} ${candidate.contentSnippet || ""}`;
  if (LAB_CTF_RE.test(haystack)) return false;
  if (EXCLUDE_RE.test(haystack)) return false;
  if (META_POST_RE.test(candidate.title || "")) return false;
  return INCLUDE_RE.test(haystack);
}

// Second pass, run after Jina extraction (the full article, not just an RSS
// snippet, so meta/announcement posts that slipped past the title-only gate
// above are easier to catch once we can see the actual body). This is purely
// a NEGATIVE re-check — it does NOT require narrative language, because a
// real writeup's first ~600 chars very often don't happen to contain an
// English "I found/discovered" phrase (different author styles, a technical
// lead-in, a non-English excerpt, a title-only stub) and requiring one caused
// massive false rejects of genuine writeups. Positive relevance was already
// established by isLikelyBugBounty(); this only removes what got through by
// mistake.
export function looksLikeWriteupContent(enrichedItem, source) {
  if (source?.trustedBugBounty) return true;

  const title = enrichedItem.cleanTitle || enrichedItem.title || "";
  const text = `${title} ${enrichedItem.fullTextForClassification || enrichedItem.excerpt || ""}`;
  if (META_POST_RE.test(title)) return false;
  if (LAB_CTF_RE.test(text) || EXCLUDE_RE.test(text)) return false;
  return true;
}
