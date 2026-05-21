import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SummaryBlock } from "@/components/SummaryBlock";
import { getItem } from "@/lib/api";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ date?: string }>;
};

export default async function ItemPage({ params, searchParams }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const { date } = await searchParams;
  const item = await getItem(id, date);
  if (!item) notFound();

  const t = await getTranslations("item");
  const backQs = new URLSearchParams();
  if (date) backQs.set("date", date);
  const backHref = `/${locale}/explore${backQs.toString() ? `?${backQs}` : ""}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href={backHref} className="text-sm text-muted hover:text-foreground">
        {t("back")}
      </Link>
      <h1 className="text-2xl font-bold leading-snug">{item.title}</h1>
      <SummaryBlock item={item} />
    </div>
  );
}
