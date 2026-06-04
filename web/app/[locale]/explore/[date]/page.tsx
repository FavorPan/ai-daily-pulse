import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ExploreClient } from "@/components/ExploreClient";
import { getItemsWithDate, listDigestDates } from "@/lib/api";

type PageProps = {
  params: Promise<{ locale: string; date: string }>;
};

export function generateStaticParams() {
  const dates = listDigestDates().slice(0, 7);
  return dates.map((date) => ({ date }));
}

export default async function ExploreDatePage({ params }: PageProps) {
  const { locale, date } = await params;
  setRequestLocale(locale);

  const items = await getItemsWithDate(date);
  if (items.length === 0) notFound();

  const t = await getTranslations("explore");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline">{t("title")}</h1>
        <p className="text-sm text-muted mt-1">
          {t("subtitle")} — {date}
        </p>
      </div>
      <ExploreClient items={items} />
    </div>
  );
}
