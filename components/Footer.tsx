import { meta } from "@/lib/data";

export default function Footer() {
  const lastRun = meta.lastRun ? new Date(meta.lastRun).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";
  return (
    <footer className="mt-12 border-t border-border py-6 text-xs leading-relaxed text-muted sm:py-8">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span>Data updated: {lastRun}</span>
        <span aria-hidden className="text-border">
          ·
        </span>
        <span>{meta.totalItems} writeups archived</span>
        <span aria-hidden className="text-border">
          ·
        </span>
        <span>
          Classifier: <span className="font-mono text-primary/80">{meta.aiProvider}</span>
        </span>
        {typeof meta.aiGeneratedTotal === "number" && (
          <>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>{meta.aiGeneratedTotal} with AI breakdown</span>
          </>
        )}
        {typeof meta.aiFallbackThisRun === "number" && meta.aiFallbackThisRun > 0 && (
          <>
            <span aria-hidden className="text-border">
              ·
            </span>
            <span>Last run: {meta.aiFallbackThisRun} without AI</span>
          </>
        )}
      </p>
      <p className="mt-3 max-w-2xl">
        This site does not copy original writeups — each card shows an accurate title plus a short summary,
        then links to the original source. The &quot;most impactful&quot; ranking blends recency + disclosed
        bounty size + severity — not real social-engagement metrics. Arabic translations are machine-generated
        on demand via a free translation service.
      </p>
    </footer>
  );
}
