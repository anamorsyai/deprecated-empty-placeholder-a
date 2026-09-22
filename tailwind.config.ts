import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "420px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Theme-aware: every color resolves from a CSS variable so
        // [data-theme="..."] on <html> can reskin the whole site.
        // The rgb(.../<alpha-value>) shape keeps Tailwind opacity
        // modifiers (bg-primary/10, text-muted/70, ...) working.
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        surface2: "rgb(var(--c-surface2) / <alpha-value>)",
        border: "rgb(var(--c-border) / <alpha-value>)",
        primary: "rgb(var(--c-primary) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};

export default config;
