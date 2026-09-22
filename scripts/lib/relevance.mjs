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
// severity/report vocabulary bug hunters use. Kept intentionally broad on
// single high-precision stems (bypass, takeover, disclos*) because real
// writeup titles are narrative ("How a Silent Websocket Led Me to
// Unauthenticated Uploads") and often name no vuln class in the title —
// career/tutorial and advisory noise is caught by the negative gates above,
// which always run first.
const INCLUDE_RE =
  /\b(bug ?bounty|hackerone|bugcrowd|intigriti|yeswehack|synack|h1-\d|\$\d|bounty|responsible disclosure|disclos\w*|vulnerability disclosure program|\bvdp\b|\bp[1-4]\b|critical severity|account takeover|takeover|bypass|unauthenticated|unauthori[sz]ed|auth[\s-]?vuln[a-z]*|idor|bola|bfla|ssrf|xxe|ssti|ssrf|sqli|nosqli|xss|csrf|cors|\blfi\b|\brfi\b|race condition|privilege escalation|subdomain takeover|mass assignment|open redirect|file upload|arbitrary file|jwt|oauth|graphql|rce|command injection|path traversal|cache poisoning|request smuggling|0[\s-]?day|zero[\s-]?day)\b/i;

// Meta/announcement posts ("Introducing CrowdRecon", "How to appeal a bug
// bounty submission") mention bounty vocabulary constantly without ever being
// a writeup — catch the common shapes explicitly.
const META_POST_RE =
  /\b(introducing|unleashed|is coming\b|meet (the|your|crowdrecon)|named (the )?(new )?(official )?provider|how to appeal|how to become|guide to (starting|getting started)|checklist for|tips? for (new|beginner)s?|announcing|we'?re (excited|thrilled|proud) to)\b/i;

// Career-journey / tutorial / tool-overview posts ("How I went from zero
// experience...", "100 Days of Bug Bounty — Day 1", "Subfinder: because
// guessing subdomains..."). They carry bug-bounty tags so they pass the
// positive gate below, but they teach no specific disclosed vulnerability.
const CAREER_TUTORIAL_RE =
  /\b(how i (went from|started)|from zero( experience)?|zero experience|my (journey|second month)|100 days of|getting started|beginner'?s? guide|roadmap to|because guessing|tool (guide|overview|introduction)|cheat ?sheet|top \d+ (tools|tips|techniques))\b/i;

// Vendor CVE advisories mirrored on aggregator feeds ("vCenter Pre-Auth RCE
// CVE-2026-59310", "IBM DB2 ... RCE and the road to..."). Real vulnerability
// research, but not a bug-bounty-program writeup — no program, no bounty, no
// disclosure narrative. Only rejected when there is genuinely no bounty
// signal attached (see isLikelyBugBounty below); a CVE writeup that names a
// bounty platform or payout still passes.
const CVE_ADVISORY_RE = /\bCVE-\d{4}-\d{4,7}\b/i;
const BOUNTY_SIGNAL_RE = /\b(bug ?bounty|hackerone|bugcrowd|intigriti|yeswehack|synack|\$\d|bounty|responsible disclosure)\b/i;

export function isLikelyBugBounty(candidate, source) {
  if (source?.trustedBugBounty) return true;

  const haystack = `${candidate.title || ""} ${(candidate.tagHints || []).join(" ")} ${candidate.contentSnippet || ""}`;
  if (LAB_CTF_RE.test(haystack)) return false;
  if (EXCLUDE_RE.test(haystack)) return false;
  if (META_POST_RE.test(candidate.title || "")) return false;
  if (CAREER_TUTORIAL_RE.test(candidate.title || "")) return false;
  // CVE advisory without any bounty signal (no platform, payout, or
  // disclosure language) is vendor research, not a bounty writeup.
  if (CVE_ADVISORY_RE.test(haystack) && !BOUNTY_SIGNAL_RE.test(haystack)) return false;
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
  if (CAREER_TUTORIAL_RE.test(title)) return false;
  if (CVE_ADVISORY_RE.test(text) && !BOUNTY_SIGNAL_RE.test(text)) return false;
  if (LAB_CTF_RE.test(text) || EXCLUDE_RE.test(text)) return false;
  return true;
}
