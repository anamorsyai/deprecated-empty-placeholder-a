import Link from "next/link";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-accent/15 text-accent border-accent/40",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/40",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/40",
  low: "bg-sky-500/15 text-sky-400 border-sky-500/40",
};

export const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-s-accent",
  high: "border-s-orange-400",
  medium: "border-s-yellow-400",
  low: "border-s-sky-400",
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
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${SEVERITY_STYLES[severity]}`}>
      {SEVERITY_LABEL_AR[severity] || severity}
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
