import Link from "next/link";

const SEVERITY_STYLES: Record<string, string> = {
  // Text colors use a darker step for light backgrounds, lighter step on dark.
  critical: "bg-accent/15 text-red-600 border-accent/40 dark:text-accent",
  high: "bg-orange-500/15 text-orange-700 border-orange-500/40 dark:text-orange-400",
  medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/40 dark:text-yellow-400",
  low: "bg-sky-500/15 text-sky-700 border-sky-500/40 dark:text-sky-400",
};

export const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-s-accent",
  high: "border-s-orange-400",
  medium: "border-s-yellow-400",
  low: "border-s-sky-400",
};

const SEVERITY_LABEL_EN: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return null;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${SEVERITY_STYLES[severity]}`}>
      {SEVERITY_LABEL_EN[severity] || severity}
    </span>
  );
}

const TAG_CLS =
  "rounded-full border border-border bg-surface2/60 px-2.5 py-1 text-[11px] text-muted transition hover:border-primary/60 hover:text-primary hover:bg-surface2";

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
