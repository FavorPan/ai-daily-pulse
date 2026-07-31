import { getTranslations, setRequestLocale } from "next-intl/server";
import { LandingHero } from "@/components/LandingHero";
import { InsightShowcase } from "@/components/InsightShowcase";
import { PipelineSection } from "@/components/PipelineSection";
import { FeaturedSection } from "@/components/FeaturedSection";
import { FinalCta } from "@/components/FinalCta";
import { getDaily } from "@/lib/api";
import type { Metadata } from "next";
import { getBaseMetadata } from "@/lib/metadata";

const TRENDING_MIN_SCORE = 5;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = "https://ai-daily-pulse.top";
  const base = getBaseMetadata(locale);
  const desc =
    "Stay updated with AI Daily Pulse! Get curated AI news from over 40 RSS feeds, featuring insights, articles, and daily digests.";

  return {
    title: {
      default: "AI Daily Pulse: Your Daily Digest of AI News",
      template: "%s | AI Daily Pulse",
    },
    description: desc,
    alternates: {
      ...base.alternates,
      canonical: `${siteUrl}/${locale}/`,
    },
    openGraph: {
      ...base.openGraph,
      title: "AI Daily Pulse: Your Daily Digest of AI News",
      description: desc,
      url: `${siteUrl}/${locale}/`,
    },
    twitter: {
      ...base.twitter,
      title: "AI Daily Pulse: Your Daily Digest of AI News",
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

  const directions = data.directions ?? [];

  // Idea count for the hero panel: today's directions, or a live-ish signal.
  const ideaCount = directions.length;

  return (
    <div>
      <LandingHero
        date={data.date}
        articleCount={data.items.length}
        ideaCount={ideaCount}
      />

      <InsightShowcase directions={directions} date={data.date} />

      <PipelineSection />

      {trending.length > 0 && <FeaturedSection items={trending} />}

      <FinalCta />
    </div>
  );
}
