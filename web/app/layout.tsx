import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { HeaderNav } from "@/components/HeaderNav";
import { SearchBar } from "@/components/SearchBar";
import { DateSwitcher } from "@/components/DateSwitcher";
import { listDigestDates } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Daily Pulse",
  description: "每日 AI 资讯精选",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dates = listDigestDates();

  return (
    <html lang="zh-CN">
      <body className="bg-[#0F1115] text-white antialiased">
        <div className="min-h-screen flex flex-col">
          <header className="h-16 flex items-center justify-between gap-4 px-4 md:px-8 border-b border-[#2A2F3A]">
            <div className="flex items-center gap-6">
              <a href="/" className="font-bold text-lg whitespace-nowrap">
                AI Daily Pulse
              </a>
              <HeaderNav />
            </div>
            <div className="flex items-center gap-3">
              <Suspense fallback={null}>
                <DateSwitcher dates={dates} />
              </Suspense>
              <Suspense fallback={null}>
                <SearchBar />
              </Suspense>
            </div>
          </header>
          <main className="flex-1 px-4 md:px-8 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
