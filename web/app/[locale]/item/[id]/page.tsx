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
    <div className="max-w-2xl mx-auto space-y-6">
      <nav className="text-xs text-muted flex items-center gap-1.5 font-mono" aria-label="Breadcrumb">
        <Link href={homeHref} className="hover:text-foreground transition-colors">
          {t("breadcrumbHome")}
        </Link>
        <span className="text-border">/</span>
        <Link href={exploreHref} className="hover:text-foreground transition-colors">
          {t("breadcrumbExplore")}
        </Link>
        <span className="text-border">/</span>
        <span className="text-foreground truncate max-w-[200px]">{item.title}</span>
      </nav>

      <div>
        <Link href={exploreHref} className="text-sm text-muted hover:text-foreground transition-colors inline-block mb-3">
          {t("back")}
        </Link>
        <h1 className="text-headline leading-snug">{item.title}</h1>
      </div>

      <SummaryBlock item={item} />
    </div>
  );
}
