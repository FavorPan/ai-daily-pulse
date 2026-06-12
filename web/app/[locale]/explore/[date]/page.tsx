import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ExploreClient } from "@/components/ExploreClient";
import { getItemsWithDate, listDigestDates } from "@/lib/api";
import type { Metadata } from "next";
import { getBaseMetadata } from "@/lib/metadata";

type PageProps = {
  params: Promise<{ locale: string; date: string }>;
};

export function generateStaticParams() {
  const dates = listDigestDates().slice(0, 7);
  return dates.map((date) => ({ date }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, date } = await params;
  const t = await getTranslations("explore");
  const siteUrl = "https://ai-daily-pulse.top";
  const base = getBaseMetadata(locale);
  const title = `${t("title")} - ${date}`;
  const desc = `${t("subtitle")} - ${date}`;

  return {
    title,
    description: desc,
    alternates: {
      ...base.alternates,
      canonical: `${siteUrl}/${locale}/explore/${date}/`,
    },
    openGraph: {
      ...base.openGraph,
      title,
      description: desc,
      url: `${siteUrl}/${locale}/explore/${date}/`,
    },
    twitter: {
      ...base.twitter,
      title,
      description: desc,
    },
  };
}

export default async function ExploreDatePage({ params }: PageProps) {
  const { locale, date } = await params;
  setRequestLocale(locale);

  const items = await getItemsWithDate(date);
  if (items.length === 0) notFound();

  const t = await getTranslations("explore");

  return (
    <div className="space-y-6">
      <ExploreClient items={items} />
    </div>
  );
}
