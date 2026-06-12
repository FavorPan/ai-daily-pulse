import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BuilderOverview } from "@/components/BuilderOverview";
import { BuilderProjectCard } from "@/components/BuilderProjectCard";
import { getDaily } from "@/lib/api";
import { getBaseMetadata } from "@/lib/metadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("builder");
  const siteUrl = "https://ai-daily-pulse.top";
  const base = getBaseMetadata(locale);
  const title = t("title");
  const desc = t("subtitle");

  return {
    title,
    description: desc,
    alternates: {
      ...base.alternates,
      canonical: `${siteUrl}/${locale}/builder/`,
    },
    openGraph: {
      ...base.openGraph,
      title,
      description: desc,
      url: `${siteUrl}/${locale}/builder/`,
    },
    twitter: {
      ...base.twitter,
      title,
      description: desc,
    },
  };
}

export default async function BuilderPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const data = await getDaily();
  const directions = data.directions ?? [];
  const t = await getTranslations("builder");

  const maxEngagement = Math.max(
    ...directions.map((d) => d.social_pulse?.total_engagement ?? 0),
    1
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-headline">{t("title")}</h1>
        <p className="text-sm text-muted mt-1">{t("subtitle")}</p>
        <p className="text-xs text-muted mt-0.5">{t("dataSource")}</p>
      </div>

      {/* Overview */}
      <BuilderOverview itemsCount={data.items.length} directions={directions} />

      {/* Projects */}
      {directions.length > 0 ? (
        <div className="space-y-6">
          {directions.map((proj, i) => (
            <BuilderProjectCard
              key={i}
              project={proj}
              maxEngagement={maxEngagement}
              index={i}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-medium text-muted">{t("empty")}</p>
          <p className="text-sm text-muted mt-2">{t("emptyHint")}</p>
          <Link
            href={`/${locale}/`}
            className="inline-block mt-4 text-sm text-accent hover:opacity-80"
          >
            {t("backToToday")}
          </Link>
        </div>
      )}
    </div>
  );
}
