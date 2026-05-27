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
        <h1 className="text-headline">{t("title")}</h1>
        <p className="text-sm text-muted mt-1">{t("subtitle")}</p>
      </div>
      {mock && !globalSearch && (
        <p className="text-xs text-muted bg-surface-muted border border-border rounded-md px-3 py-2 font-mono">
          {t("mockHint")}
        </p>
      )}
      <Suspense fallback={<p className="text-muted text-sm">...</p>}>
        <ExploreClient
          items={items}
          globalSearch={globalSearch}
          archiveDays={archiveDays}
        />
      </Suspense>
    </div>
  );
}
