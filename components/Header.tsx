import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/trending", label: "الأكثر تأثيرًا" },
  { href: "/categories", label: "التصنيفات" },
  { href: "/platforms", label: "المنصات" },
  { href: "/search", label: "بحث" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-20 -mx-4 border-b border-border bg-bg/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex flex-1 items-center justify-between gap-2">
          <Link href="/" className="flex min-h-[44px] shrink-0 items-baseline gap-2" aria-label="Bug Bounty Radar — الرئيسية">
            <span className="bg-gradient-to-l from-primary to-emerald-600 bg-clip-text text-base font-extrabold text-transparent dark:to-emerald-300 xs:text-lg sm:text-xl">
              Bug Bounty Radar
            </span>
            <span className="hidden text-xs text-muted min-[420px]:inline">رادار كتابات البج باونتي</span>
          </Link>
          <ThemeToggle />
        </div>
        <nav
          aria-label="التنقل الرئيسي"
          className="no-scrollbar -mx-4 flex items-center gap-1 overflow-x-auto px-4 text-sm sm:mx-0 sm:px-0"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-md px-3 text-muted transition hover:bg-surface hover:text-primary sm:min-h-0 sm:py-1.5"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
