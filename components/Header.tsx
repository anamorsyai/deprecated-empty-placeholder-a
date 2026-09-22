import Link from "next/link";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/trending", label: "الأكثر تأثيرًا" },
  { href: "/categories", label: "التصنيفات" },
  { href: "/platforms", label: "المنصات" },
  { href: "/search", label: "بحث" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-20 -mx-4 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-primary">Bug Bounty Radar</span>
          <span className="text-xs text-muted">رادار كتابات البج باونتي</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-muted transition hover:bg-surface hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
