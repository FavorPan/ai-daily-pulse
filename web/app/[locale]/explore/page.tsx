import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExploreClient } from "@/components/ExploreClient";
import { getAllItems, listDigestDates } from "@/lib/api";
import type { Metadata } from "next";
import { getBaseMetadata } from "@/lib/metadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("explore");
  const siteUrl = "https://ai-daily-pulse.top";
  const base = getBaseMetadata(locale, "/explore/");
  const title = t("title");
  const desc = t("subtitle");

  return {
    title,
    description: desc,
    alternates: {
      ...base.alternates,
      canonical: `${siteUrl}/${locale}/explore/`,
    },
    openGraph: {
      ...base.openGraph,
      title,
      description: desc,
      url: `${siteUrl}/${locale}/explore/`,
    },
    twitter: {
      ...base.twitter,
      title,
      description: desc,
    },
  };
}

export default async function ExplorePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const items = await getAllItems();
  const dates = listDigestDates();
  const t = await getTranslations("explore");

  return (
    <div className="space-y-6">
      <ExploreClient items={items} dates={dates} locale={locale} />
    </div>
  );
}
