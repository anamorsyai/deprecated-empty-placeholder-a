"use client";

import { useEffect, useState } from "react";

const THEMES = [
  { id: "dark", icon: "🌙", label: "داكن" },
  { id: "light", icon: "☀️", label: "فاتح" },
  { id: "contrast", icon: "◑", label: "تباين عالٍ" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

function initialTheme(): ThemeId {
  if (typeof document !== "undefined") {
    const current = document.documentElement.dataset.theme;
    if (current === "light" || current === "contrast" || current === "dark") return current;
  }
  return "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>("dark");

  useEffect(() => {
    setTheme(initialTheme());
  }, []);

  const cycle = () => {
    const next = THEMES[(THEMES.findIndex((t) => t.id === theme) + 1) % THEMES.length].id;
    setTheme(next);
    document.documentElement.dataset.theme = next;
    // Keep Tailwind `dark:` variants in sync (everything except light is dark).
    document.documentElement.classList.toggle("dark", next !== "light");
    try {
      localStorage.setItem("bbr-theme", next);
    } catch {
      /* private mode — theme just won't persist */
    }
  };

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <button
      type="button"
      onClick={cycle}
      title={`الثيم الحالي: ${current.label} — اضغط للتبديل`}
      aria-label={`تبديل الثيم (الحالي: ${current.label})`}
      className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-lg transition hover:border-primary/60 hover:text-primary"
    >
      <span aria-hidden>{current.icon}</span>
    </button>
  );
}
