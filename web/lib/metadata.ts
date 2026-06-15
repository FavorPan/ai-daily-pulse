const SITE_URL = "https://ai-daily-pulse.top";

export function getBaseMetadata(locale: string, path = "") {
  const ogLocale =
    locale === "zh-CN" ? "zh_CN" : locale === "zh-TW" ? "zh_TW" : "en_US";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return {
    alternates: {
      languages: {
        "zh-CN": `${SITE_URL}/zh-CN${cleanPath}`,
        "zh-TW": `${SITE_URL}/zh-TW${cleanPath}`,
        en: `${SITE_URL}/en${cleanPath}`,
        "x-default": `${SITE_URL}/zh-CN${cleanPath}`,
      },
    },
    openGraph: {
      siteName: "AI Daily Pulse",
      locale: ogLocale,
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: "AI Daily Pulse",
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      images: [`${SITE_URL}/og-image.png`],
    },
  };
}
