import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductHero } from "@/components/ProductHero";
import { ProjectCard } from "@/components/ProjectCard";
import { getDaily } from "@/lib/api";
import { TOPIC_ORDER } from "@/lib/topics";
import { getTopicLabel } from "@/lib/topicLabels";
import type { Metadata } from "next";
import type { AppLocale } from "@/i18n/routing";
import { getBaseMetadata } from "@/lib/metadata";

const TRENDING_MIN_SCORE = 5;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const data = await getDaily();
  const siteUrl = "https://ai-daily-pulse.top";
  const base = getBaseMetadata(locale);
  const desc = `${data.items.length} articles today — AI-scored news from 40+ RSS feeds.`;

  return {
    title: { absolute: `AI Daily Pulse — ${data.items.length} articles today` },
    description: desc,
    alternates: {
      ...base.alternates,
      canonical: `${siteUrl}/${locale}/`,
    },
    openGraph: {
      ...base.openGraph,
      title: "AI Daily Pulse",
      description: desc,
      url: `${siteUrl}/${locale}/`,
    },
    twitter: {
      ...base.twitter,
      title: "AI Daily Pulse",
      description: desc,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const data = await getDaily();
  const trending = data.items
    .filter((item) => item.score >= TRENDING_MIN_SCORE)
    .map((item) => ({ ...item, digestDate: data.date }));

  const t = await getTranslations("home");
  const ti = await getTranslations("insight");
  const hasDirections = data.directions && data.directions.length > 0;

  const topicCounts = TOPIC_ORDER.map((topic) => ({
    label: getTopicLabel(topic, locale as AppLocale),
    count: data.items.filter((i) => i.topic === topic).length,
  })).filter((c) => c.count > 0);

  return (
    <div>
      <ProductHero date={data.date} />

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          {/* Date + total */}
          <div className="mb-6">
            <div className="text-xs font-mono text-muted mb-1">{data.date}</div>
            <div className="text-3xl font-bold font-mono tabular-nums tracking-tighter text-foreground">
              {data.items.length}
            </div>
            <div className="text-sm text-muted">{t("total", { count: data.items.length })}</div>
          </div>

          {/* Topic breakdown */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-3">
              {t("title")}
            </h3>
            <div className="space-y-2">
              {topicCounts.map(({ label, count }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-muted truncate">{label}</span>
                  <span className="text-sm font-mono font-semibold text-accent ml-3">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-3">
              快捷导航
            </h3>
            <div className="space-y-1.5">
              <Link
                href={`/${locale}/explore/`}
                className="block text-sm text-muted hover:text-foreground transition-colors"
              >
                全部文章 →
              </Link>
              <Link
                href={`/${locale}/insight/`}
                className="block text-sm text-muted hover:text-foreground transition-colors"
              >
                Insight →
              </Link>
              <Link
                href={`/${locale}/about/`}
                className="block text-sm text-muted hover:text-foreground transition-colors"
              >
                关于 →
              </Link>
            </div>
          </div>
        </aside>

        {/* Right main */}
        <div className="flex-1 min-w-0">
          {/* Builder banner */}
          {hasDirections && (
            <Link
              href={`/${locale}/insight/`}
              className="block mb-8 p-4 rounded-lg bg-accent/5 border border-accent/20 hover:bg-accent/10 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    🎯 {ti("homeBanner", { count: data.directions!.length })}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {ti("homeBannerHint")}
                  </p>
                </div>
                <span className="text-sm text-accent font-medium shrink-0 ml-4">
                  {ti("homeBannerCta")}
                </span>
              </div>
            </Link>
          )}

          {/* Featured section */}
          <div>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-subhead">
                {t("featured")}{" "}
                <span className="text-sm font-normal text-muted">({trending.length})</span>
              </h2>
              <Link
                href={`/${locale}/explore/`}
                className="text-sm text-accent hover:opacity-80 transition-opacity"
              >
                {t("viewAll")}
              </Link>
            </div>

            {trending.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">No trending items today.</p>
            ) : (
              <div>
                {trending.map((item) => (
                  <ProjectCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
