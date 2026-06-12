import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExploreClient } from "@/components/ExploreClient";
import { getItemsWithDate } from "@/lib/api";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("explore");
  const siteUrl = "https://ai-daily-pulse.top";
  const title = t("title");
  const desc = t("subtitle");

  return {
    title,
    description: desc,
    alternates: {
      canonical: `${siteUrl}/${locale}/explore/`,
    },
    openGraph: {
      title,
      description: desc,
      url: `${siteUrl}/${locale}/explore/`,
    },
    twitter: {
      title,
      description: desc,
    },
  };
}

export default async function ExplorePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const items = await getItemsWithDate();
  const t = await getTranslations("explore");

  return (
    <div className="space-y-6">
      <ExploreClient items={items} />
    </div>
  );
}
