import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

const GITHUB_URL = "https://github.com/FavorPan/ai-daily-pulse";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("about");
  const siteUrl = "https://ai-daily-pulse.top";
  const title = t("title");
  const desc = t("motivation1").slice(0, 160);

  return {
    title,
    description: desc,
    alternates: {
      canonical: `${siteUrl}/${locale}/about/`,
    },
    openGraph: {
      title,
      description: desc,
      url: `${siteUrl}/${locale}/about/`,
    },
    twitter: {
      title,
      description: desc,
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <article className="max-w-2xl mx-auto space-y-8">
      <div>
        <Link
          href={`/${locale}`}
          className="text-sm text-muted hover:text-foreground transition-colors inline-block mb-4"
        >
          {t("backHome")}
        </Link>
        <h1 className="text-headline">{t("title")}</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t("motivationTitle")}</h2>
        <p className="text-sm text-muted leading-relaxed">{t("motivation1")}</p>
        <p className="text-sm text-muted leading-relaxed">{t("motivation2")}</p>
        <p className="text-sm text-muted leading-relaxed">{t("motivation3")}</p>
      </section>

      <div className="h-px bg-border" />

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">{t("authorTitle")}</h2>
        <p className="text-sm font-medium text-foreground">{t("authorName")}</p>
        <p className="text-sm text-muted leading-relaxed">{t("authorBio")}</p>
      </section>

      <div className="h-px bg-border" />

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">{t("githubTitle")}</h2>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent hover:opacity-80 transition-opacity inline-flex items-center gap-1"
        >
          {t("githubLink")}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </section>
    </article>
  );
}
