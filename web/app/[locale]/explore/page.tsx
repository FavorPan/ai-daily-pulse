import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExploreClient } from "@/components/ExploreClient";
import {
  getAllItems,
  getItemsWithDate,
  isUsingMockData,
  listDigestDates,
} from "@/lib/api";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string; q?: string }>;
};

export default async function ExplorePage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { date, q } = await searchParams;
  const globalSearch = Boolean(q?.trim());
  const items = globalSearch ? await getAllItems() : await getItemsWithDate(date);
  const mock = isUsingMockData(date);
  const archiveDays = listDigestDates().length;
  const t = await getTranslations("explore");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted text-sm mt-1">{t("subtitle")}</p>
      </div>
      {mock && !globalSearch && (
        <p className="text-sm text-amber-600 dark:text-amber-400/90">{t("mockHint")}</p>
      )}
      <Suspense fallback={<p className="text-muted">...</p>}>
        <ExploreClient
          items={items}
          globalSearch={globalSearch}
          archiveDays={archiveDays}
        />
      </Suspense>
    </div>
  );
}
