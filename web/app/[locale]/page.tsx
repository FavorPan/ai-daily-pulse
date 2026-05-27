import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductHero } from "@/components/ProductHero";
import { ProjectCard } from "@/components/ProjectCard";
import { StatsHero } from "@/components/StatsHero";
import { getDaily, isUsingMockData } from "@/lib/api";

const TRENDING_MIN_SCORE = 5;

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { date } = await searchParams;
  const data = await getDaily(date);
  const mock = isUsingMockData(date);
  const trending = data.items
    .filter((item) => item.score >= TRENDING_MIN_SCORE)
    .map((item) => ({ ...item, digestDate: data.date }));

  const t = await getTranslations("home");

  return (
    <div>
      {mock && (
        <p className="text-xs text-muted bg-surface-muted border border-border rounded-md px-3 py-2 font-mono mb-6">
          {t("mockHint")}
        </p>
      )}

      <ProductHero date={data.date} />
      <StatsHero date={data.date} items={data.items} />

      {/* Featured section */}
      <div>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-subhead">
            {t("featured")}{" "}
            <span className="text-sm font-normal text-muted">({trending.length})</span>
          </h2>
          <Link
            href={`/${locale}/explore${date ? `?${new URLSearchParams({ date })}` : ""}`}
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
