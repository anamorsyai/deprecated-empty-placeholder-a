import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        bg: "#0b0f14",
        surface: "#121821",
        surface2: "#182130",
        border: "#22303f",
        primary: "#3ddc97",
        accent: "#ff6b6b",
        muted: "#8698ac",
      },
    },
  },
  plugins: [],
};

export default config;
