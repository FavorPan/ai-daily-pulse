const SITE_URL = "https://ai-daily-pulse.top";

export function getBaseMetadata(locale: string) {
  const ogLocale =
    locale === "zh-CN" ? "zh_CN" : locale === "zh-TW" ? "zh_TW" : "en_US";

  return {
    alternates: {
      languages: {
        "zh-CN": `${SITE_URL}/zh-CN/`,
        "zh-TW": `${SITE_URL}/zh-TW/`,
        en: `${SITE_URL}/en/`,
        "x-default": `${SITE_URL}/zh-CN/`,
      },
    },
    openGraph: {
      siteName: "AI Daily Pulse",
      locale: ogLocale,
      images: [
        {
          url: `${SITE_URL}/logo.png`,
          width: 512,
          height: 512,
          alt: "AI Daily Pulse",
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      images: [`${SITE_URL}/logo.png`],
    },
  };
}
