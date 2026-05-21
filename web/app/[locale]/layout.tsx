import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { HeaderNav } from "@/components/HeaderNav";
import { SearchBar } from "@/components/SearchBar";
import { DateSwitcher } from "@/components/DateSwitcher";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { listDigestDates } from "@/lib/api";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Daily Pulse",
  description: "每日 AI 资讯精选",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dates = listDigestDates();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <div className="min-h-screen flex flex-col">
              <header className="h-16 flex items-center justify-between gap-4 px-4 md:px-8 border-b border-border">
                <div className="flex items-center gap-6 min-w-0">
                  <Link
                    href={`/${locale}`}
                    className="font-bold text-lg whitespace-nowrap hover:text-accent"
                  >
                    AI Daily Pulse
                  </Link>
                  <HeaderNav />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Suspense fallback={null}>
                    <DateSwitcher dates={dates} />
                  </Suspense>
                  <Suspense fallback={null}>
                    <SearchBar />
                  </Suspense>
                  <LocaleSwitcher />
                  <ThemeSwitcher />
                </div>
              </header>
              <main className="flex-1 px-4 md:px-8 py-6">{children}</main>
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
