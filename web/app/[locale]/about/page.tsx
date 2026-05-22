import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

const GITHUB_URL = "https://github.com/FavorPan/ai-daily-pulse";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <article className="max-w-3xl mx-auto space-y-8">
      <Link
        href={`/${locale}`}
        className="text-sm text-muted hover:text-accent transition-colors inline-block"
      >
        {t("backHome")}
      </Link>
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      <section className="glass-surface rounded-2xl p-6 space-y-3 accent-line-top">
        <h2 className="text-xl font-semibold">{t("motivationTitle")}</h2>
        <p className="text-muted leading-relaxed">{t("motivation1")}</p>
        <p className="text-muted leading-relaxed">{t("motivation2")}</p>
        <p className="text-muted leading-relaxed">{t("motivation3")}</p>
      </section>

      <section className="glass-surface rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-semibold">{t("authorTitle")}</h2>
        <p className="font-medium text-foreground">{t("authorName")}</p>
        <p className="text-muted leading-relaxed">{t("authorBio")}</p>
      </section>

      <section className="glass-surface rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-semibold">{t("githubTitle")}</h2>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:opacity-80 transition-opacity"
        >
          {t("githubLink")} ↗
        </a>
      </section>
    </article>
  );
}
