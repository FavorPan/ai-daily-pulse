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
    <div className="space-y-8">
      {mock && (
        <p className="text-sm text-amber-600 dark:text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2">
          {t("mockHint")}
        </p>
      )}

      <ProductHero date={data.date} />
      <StatsHero date={data.date} items={data.items} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {t("featured")} ({trending.length})
          </h2>
          <Link
            href={`/${locale}/explore${date ? `?date=${date}` : ""}`}
            className="text-sm text-accent hover:opacity-80 transition-opacity"
          >
            {t("viewAll")}
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trending.map((item) => (
            <ProjectCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
