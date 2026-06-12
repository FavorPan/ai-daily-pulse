import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SummaryBlock } from "@/components/SummaryBlock";
import { getItem, getAllItemParams } from "@/lib/api";
import { getBaseMetadata } from "@/lib/metadata";

type PageProps = {
  params: Promise<{ locale: string; date: string; id: string }>;
};

export function generateStaticParams() {
  return getAllItemParams();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, date, id } = await params;
  const item = await getItem(id, date);
  if (!item) return {};

  const siteUrl = "https://ai-daily-pulse.top";
  const pageUrl = `${siteUrl}/${locale}/item/${date}/${id}/`;
  const base = getBaseMetadata(locale);
  const desc = item.summary
    ? item.summary.length > 160
      ? item.summary.slice(0, 157) + "..."
      : item.summary
    : undefined;
  const rawTags = item.tags as unknown;
  const tags: string[] = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === "string"
      ? rawTags.split(",").map((t) => t.trim())
      : [];

  return {
    title: item.title,
    description: desc,
    alternates: {
      ...base.alternates,
      canonical: pageUrl,
    },
    openGraph: {
      ...base.openGraph,
      title: item.title,
      description: desc,
      url: pageUrl,
      type: "article",
      publishedTime: date,
      tags,
      images: [
        {
          url: `${siteUrl}/logo.png`,
          width: 512,
          height: 512,
          alt: item.title,
        },
      ],
    },
    twitter: {
      ...base.twitter,
      title: item.title,
      description: desc,
      images: [`${siteUrl}/logo.png`],
    },
  };
}

export default async function ItemPage({ params }: PageProps) {
  const { locale, date, id } = await params;
  setRequestLocale(locale);

  const item = await getItem(id, date);
  if (!item) notFound();

  const t = await getTranslations("item");
  const homeHref = `/${locale}/`;

  // tags may be string[] or comma-separated string at runtime
  const normalizedTags = (() => {
    const raw = item.tags as unknown;
    return Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? raw.split(",").map((s) => s.trim())
        : [];
  })();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: item.title,
            ...(item.summary ? { description: item.summary } : {}),
            datePublished: date,
            author: {
              "@type": "Person",
              name: "AI Daily Pulse",
            },
            publisher: {
              "@type": "Organization",
              name: "AI Daily Pulse",
              url: "https://ai-daily-pulse.top",
            },
            url: `https://ai-daily-pulse.top/${locale}/item/${date}/${id}/`,
            image: "https://ai-daily-pulse.top/logo.png",
            keywords: normalizedTags.join(", "),
          }),
        }}
      />
      <nav className="text-xs text-muted flex items-center gap-1.5 font-mono" aria-label="Breadcrumb">
        <Link href={homeHref} className="hover:text-foreground transition-colors">
          {t("breadcrumbHome")}
        </Link>
        <span className="text-border">/</span>
        <span className="text-muted">{date}</span>
        <span className="text-border">/</span>
        <span className="text-foreground truncate max-w-[200px]">{item.title}</span>
      </nav>

      <div>
        <Link href={homeHref} className="text-sm text-muted hover:text-foreground transition-colors inline-block mb-3">
          {t("back")}
        </Link>
        <h1 className="text-headline leading-snug">{item.title}</h1>
      </div>

      <SummaryBlock item={item} />
    </div>
  );
}
