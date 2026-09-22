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
  /\b(introducing|meet (the|your)|named (the )?(new )?(official )?provider|how to appeal|how to become|guide to (starting|getting started)|checklist for|tips? for (new|beginner)s?|announcing)\b/i;

// Narrative/report language a real "I found X in Y" writeup almost always
// has, that a tool announcement or a tips listicle doesn't.
const NARRATIVE_RE =
  /\b(i (found|discovered|noticed|tested|reported|was able)|allowed (me|an attacker|us) to|able to (bypass|access|read|execute|escalate|exfiltrate)|steps to reproduce|proof of concept|\bpoc\b|disclosed (this|the|to)|reported (this|the|to)|the vulnerability (was|is|allowed)|this (bug|vulnerability|flaw)|exploiting this|vulnerable (endpoint|parameter|to))\b/i;

export function isLikelyBugBounty(candidate, source) {
  if (source?.trustedBugBounty) return true;

  const haystack = `${candidate.title || ""} ${(candidate.tagHints || []).join(" ")} ${candidate.contentSnippet || ""}`;
  if (LAB_CTF_RE.test(haystack)) return false;
  if (EXCLUDE_RE.test(haystack)) return false;
  if (META_POST_RE.test(candidate.title || "")) return false;
  return INCLUDE_RE.test(haystack);
}

// Second pass, run after Jina extraction (more text to work with than an RSS
// snippet). Catches meta/announcement posts that slipped past the title-only
// gate above once we can see the actual article body.
export function looksLikeWriteupContent(enrichedItem, source) {
  if (source?.trustedBugBounty) return true;

  const text = `${enrichedItem.cleanTitle || enrichedItem.title || ""} ${enrichedItem.excerpt || ""}`;
  if (META_POST_RE.test(enrichedItem.cleanTitle || enrichedItem.title || "")) return false;
  if (LAB_CTF_RE.test(text) || EXCLUDE_RE.test(text)) return false;
  return NARRATIVE_RE.test(text);
}
