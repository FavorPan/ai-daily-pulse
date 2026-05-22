import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { HeaderNav } from "@/components/HeaderNav";
import { SearchBar } from "@/components/SearchBar";
import { DateSwitcher } from "@/components/DateSwitcher";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { SiteFooter } from "@/components/SiteFooter";
import { listDigestDates } from "@/lib/api";
import { routing } from "@/i18n/routing";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  return {
    title: "AI Daily Pulse",
    description: t("tagline"),
  };
}

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
  const tHero = await getTranslations("hero");

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans bg-background text-foreground antialiased min-h-screen bg-grid`}
      >
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <div className="min-h-screen flex flex-col">
              <header className="h-auto min-h-16 flex flex-wrap items-center justify-between gap-3 px-4 md:px-8 py-3 border-b border-border glass-surface">
                <div className="flex items-center gap-4 md:gap-6 min-w-0">
                  <div className="min-w-0">
                    <Link
                      href={`/${locale}`}
                      className="font-bold text-lg whitespace-nowrap hover:text-accent transition-colors block"
                    >
                      AI Daily Pulse
                    </Link>
                    <p className="hidden sm:block text-xs text-muted truncate max-w-md mt-0.5">
                      {tHero("tagline")}
                    </p>
                  </div>
                  <HeaderNav />
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
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
              <SiteFooter />
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
