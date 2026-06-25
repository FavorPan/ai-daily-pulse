import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InsightClient } from "@/components/InsightClient";
import { getBaseMetadata } from "@/lib/metadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("insight");
  const siteUrl = "https://ai-daily-pulse.top";
  const base = getBaseMetadata(locale, "/insight/");
  const title = t("title");
  const desc = t("subtitle");

  return {
    title,
    description: desc,
    alternates: {
      ...base.alternates,
      canonical: `${siteUrl}/${locale}/insight/`,
    },
    openGraph: {
      ...base.openGraph,
      title,
      description: desc,
      url: `${siteUrl}/${locale}/insight/`,
    },
    twitter: {
      ...base.twitter,
      title,
      description: desc,
    },
  };
}

export default async function InsightPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <InsightClient />;
}
