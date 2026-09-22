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
    <header className="sticky top-0 z-20 -mx-4 border-b border-border bg-bg/85 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Link href="/" className="flex items-baseline gap-2 shrink-0">
          <span className="bg-gradient-to-l from-primary to-emerald-300 bg-clip-text text-lg font-extrabold text-transparent sm:text-xl">
            Bug Bounty Radar
          </span>
          <span className="hidden text-xs text-muted xs:inline sm:inline">رادار كتابات البج باونتي</span>
        </Link>
        <nav className="no-scrollbar -mx-4 flex items-center gap-1 overflow-x-auto px-4 text-sm sm:mx-0 sm:px-0">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-1.5 text-muted transition hover:bg-surface hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
