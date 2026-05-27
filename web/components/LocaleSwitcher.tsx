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
    <select
      className="bg-surface text-[13px] px-2 py-1.5 rounded-md border border-border text-foreground cursor-pointer transition-colors"
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
  );
}
