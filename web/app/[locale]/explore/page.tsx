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
      <ExploreClient items={items} />
    </div>
  );
}
