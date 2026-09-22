import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });

export const metadata: Metadata = {
  title: {
    default: "Bug Bounty Radar — رادار كتابات الـ Bug Bounty",
    template: "%s — Bug Bounty Radar",
  },
  description:
    "تجميعة يومية لأحدث وأهم writeups الخاصة بـ bug bounty من مصادر متعددة، مصنّفة ومرتبة بالذكاء الاصطناعي.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-screen bg-bg font-sans antialiased">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4">
          <Header />
          <main className="flex-1 py-6">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
