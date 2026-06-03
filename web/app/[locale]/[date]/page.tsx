import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProductHero } from "@/components/ProductHero";
import { BuildDirections } from "@/components/BuildDirections";
import { ProjectCard } from "@/components/ProjectCard";
import { StatsHero } from "@/components/StatsHero";
import { getDaily, listDigestDates } from "@/lib/api";

const TRENDING_MIN_SCORE = 5;

type PageProps = {
  params: Promise<{ locale: string; date: string }>;
};

export function generateStaticParams() {
  const dates = listDigestDates().slice(0, 7);
  return dates.map((date) => ({ date }));
}

export default async function DatePage({ params }: PageProps) {
  const { locale, date } = await params;
  setRequestLocale(locale);

  const data = await getDaily(date);
  if (!data || data.date !== date) notFound();

  const trending = data.items
    .filter((item) => item.score >= TRENDING_MIN_SCORE)
    .map((item) => ({ ...item, digestDate: data.date }));

  const t = await getTranslations("home");

  return (
    <div>
      <ProductHero date={data.date} />
      <StatsHero date={data.date} items={data.items} />

      {data.directions && data.directions.length > 0 && (
        <BuildDirections directions={data.directions} />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trending.map((item) => (
              <ProjectCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
