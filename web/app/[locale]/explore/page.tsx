import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExploreClient } from "@/components/ExploreClient";
import { getItemsWithDate } from "@/lib/api";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ExplorePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const items = await getItemsWithDate();
  const t = await getTranslations("explore");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline">{t("title")}</h1>
        <p className="text-sm text-muted mt-1">{t("subtitle")}</p>
      </div>
      <ExploreClient items={items} />
    </div>
  );
}
