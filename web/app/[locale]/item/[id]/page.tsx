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
  const exploreHref = `/${locale}/explore${backQs.toString() ? `?${backQs}` : ""}`;
  const homeHref = `/${locale}${date ? `?date=${date}` : ""}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <nav className="text-sm text-muted flex flex-wrap items-center gap-1.5" aria-label="Breadcrumb">
        <Link href={homeHref} className="hover:text-accent transition-colors">
          {t("breadcrumbHome")}
        </Link>
        <span aria-hidden>/</span>
        <Link href={exploreHref} className="hover:text-accent transition-colors">
          {t("breadcrumbExplore")}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground line-clamp-1">{item.title}</span>
      </nav>

      <Link href={exploreHref} className="text-sm text-muted hover:text-accent transition-colors inline-block">
        {t("back")}
      </Link>
      <h1 className="text-2xl font-bold leading-snug">{item.title}</h1>
      <SummaryBlock item={item} />
    </div>
  );
}
