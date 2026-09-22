const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-accent/15 text-accent border-accent/40",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/40",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/40",
  low: "bg-sky-500/15 text-sky-400 border-sky-500/40",
};

const SEVERITY_LABEL_AR: Record<string, string> = {
  critical: "حرجة",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

export function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return null;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_STYLES[severity]}`}>
      {SEVERITY_LABEL_AR[severity] || severity}
    </span>
  );
}

import Link from "next/link";

const TAG_CLS =
  "rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted transition hover:border-primary hover:text-primary";

export function Tag({ children, href }: { children: React.ReactNode; href?: string }) {
  if (href) {
    return (
      <Link href={href} className={TAG_CLS}>
        {children}
      </Link>
    );
  }
  return <span className={TAG_CLS}>{children}</span>;
}
