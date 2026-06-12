import { MetadataRoute } from "next";
import { listDigestDates, getAllItemParams } from "@/lib/api";

export const dynamic = "force-static";

const SITE_URL = "https://ai-daily-pulse.top";
const LOCALES = ["zh-CN", "zh-TW", "en"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dates = listDigestDates();
  const itemParams = getAllItemParams();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    const baseUrl = `${SITE_URL}/${locale}`;

    // Homepage
    entries.push({
      url: `${baseUrl}/`,
      lastModified: dates[0] ? new Date(dates[0]) : new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    });

    // Static pages
    entries.push({
      url: `${baseUrl}/about/`,
      lastModified: new Date("2026-06-01"),
      changeFrequency: "monthly",
      priority: 0.3,
    });
    entries.push({
      url: `${baseUrl}/explore/`,
      lastModified: dates[0] ? new Date(dates[0]) : new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    });
    entries.push({
      url: `${baseUrl}/builder/`,
      lastModified: dates[0] ? new Date(dates[0]) : new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    });

    // Date archive pages
    for (const d of dates) {
      entries.push({
        url: `${baseUrl}/${d}/`,
        lastModified: new Date(d),
        changeFrequency: "never",
        priority: 0.5,
      });
      entries.push({
        url: `${baseUrl}/explore/${d}/`,
        lastModified: new Date(d),
        changeFrequency: "never",
        priority: 0.4,
      });
      entries.push({
        url: `${baseUrl}/builder/${d}/`,
        lastModified: new Date(d),
        changeFrequency: "never",
        priority: 0.4,
      });
    }

    // Item pages
    for (const { date: d, id } of itemParams) {
      entries.push({
        url: `${baseUrl}/item/${d}/${id}/`,
        lastModified: new Date(d),
        changeFrequency: "never",
        priority: 0.5,
      });
    }
  }

  return entries;
}
