import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });

export const metadata: Metadata = {
  title: {
    default: "Bug Bounty Radar — Daily Bug Bounty Writeups, Explained",
    template: "%s — Bug Bounty Radar",
  },
  description:
    "A daily collection of the latest and most important bug bounty writeups from multiple sources — classified, ranked, and taught step by step.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f14" },
  ],
};

// Applied before first paint so the saved theme never flashes the default.
// Also toggles the `dark` class so Tailwind `dark:` variants follow the theme.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("bbr-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t;document.documentElement.classList.toggle("dark",t!=="light")}catch(e){document.documentElement.dataset.theme="dark";document.documentElement.classList.add("dark")}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={cairo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
          <Header />
          <main className="flex-1 py-5 sm:py-8">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
