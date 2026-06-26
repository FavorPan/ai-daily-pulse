import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { HeaderNav } from "@/components/HeaderNav";
import { MobileMenu } from "@/components/MobileMenu";
import { SearchBar } from "@/components/SearchBar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthProvider } from "@/lib/auth";
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
  const siteUrl = "https://ai-daily-pulse.top";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "AI Daily Pulse",
      template: "%s | AI Daily Pulse",
    },
    description: t("tagline"),
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${siteUrl}/${locale}/`,
      languages: {
        "zh-CN": `${siteUrl}/zh-CN/`,
        "zh-TW": `${siteUrl}/zh-TW/`,
        en: `${siteUrl}/en/`,
        "x-default": `${siteUrl}/en/`,
      },
    },
    openGraph: {
      title: "AI Daily Pulse",
      description: t("tagline"),
      url: `${siteUrl}/${locale}/`,
      siteName: "AI Daily Pulse",
      locale: locale === "zh-CN" ? "zh_CN" : locale === "zh-TW" ? "zh_TW" : "en_US",
      type: "website",
      images: [
        {
          url: `${siteUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: "AI Daily Pulse",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "AI Daily Pulse",
      description: t("tagline"),
      images: [`${siteUrl}/og-image.png`],
    },
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

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans bg-background text-foreground antialiased`}
      >
        {/* WebSite JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "AI Daily Pulse",
              url: "https://ai-daily-pulse.top",
              description:
                "40+ RSS feeds · AI scoring & dedup · Daily digest",
              inLanguage: ["zh-CN", "zh-TW", "en"],
            }),
          }}
        />
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <AuthProvider>
              <div className="min-h-[100dvh] flex flex-col">
              {/* Header */}
              <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="px-4 md:px-8">
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
                        <span className="font-bold text-[15px] tracking-tight hidden sm:inline">AI Daily Pulse</span>
                      </Link>
                      <HeaderNav />
                    </div>
                    <div className="flex items-center gap-2 flex-1 sm:flex-none min-w-0 justify-end">
                      {/* Desktop-only controls */}
                      <div className="hidden sm:flex items-center gap-2">
                        <a
                          href="https://github.com/FavorPan/ai-daily-pulse"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-foreground transition-colors p-1.5"
                          aria-label="GitHub"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/>
                          </svg>
                        </a>
                        <LocaleSwitcher />
                        <ThemeSwitcher />
                      </div>
                      {/* Search: fills remaining space on mobile */}
                      <div className="flex-1 sm:flex-none min-w-0">
                        <SearchBar />
                      </div>
                      {/* Mobile menu (hidden on desktop) */}
                      <MobileMenu />
                    </div>
                  </div>
                </div>
              </header>

              {/* Main */}
              <main className="flex-1">
                <div className="px-4 md:px-8 py-8">
                  {children}
                </div>
              </main>

              {/* Footer */}
              <SiteFooter />
            </div>
            </AuthProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
