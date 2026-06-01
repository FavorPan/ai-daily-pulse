import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import localFont from "next/font/local";
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

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <div className="min-h-[100dvh] flex flex-col">
              {/* Header */}
              <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="max-w-6xl mx-auto px-4 md:px-8">
                  <div className="h-14 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-5 min-w-0">
                      <Link
                        href={`/${locale}/`}
                        className="flex items-center gap-2 hover:text-accent transition-colors shrink-0"
                      >
                        <Image
                          src="/logo.png"
                          alt="AI Daily Pulse"
                          width={32}
                          height={32}
                          className="rounded-md"
                          priority
                        />
                        <span className="font-bold text-[15px] tracking-tight">AI Daily Pulse</span>
                      </Link>
                      <HeaderNav />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SearchBar />
                      <DateSwitcher dates={dates} locale={locale} />
                      <LocaleSwitcher />
                      <ThemeSwitcher />
                    </div>
                  </div>
                </div>
              </header>

              {/* Main */}
              <main className="flex-1">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
                  {children}
                </div>
              </main>

              {/* Footer */}
              <SiteFooter />
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
