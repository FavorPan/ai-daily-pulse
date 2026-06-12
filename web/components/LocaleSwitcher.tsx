"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";

const LOCALE_LABELS: Record<AppLocale, string> = {
  "zh-CN": "简",
  "zh-TW": "繁",
  en: "EN",
};

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("locale");

  const switchLocale = (next: AppLocale) => {
    const segments = pathname.split("/").filter(Boolean);
    if (routing.locales.includes(segments[0] as AppLocale)) {
      segments[0] = next;
    } else {
      segments.unshift(next);
    }
    router.push(`/${segments.join("/")}/`);
  };

  return (
    <div className="relative flex items-center">
      <svg
        className="absolute left-2.5 w-3.5 h-3.5 text-muted pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <select
        className="bg-surface text-[13px] pl-8 pr-2 py-1.5 rounded-md border border-border text-foreground cursor-pointer transition-colors"
        value={locale}
        onChange={(e) => switchLocale(e.target.value as AppLocale)}
        aria-label={t("label")}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_LABELS[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}
