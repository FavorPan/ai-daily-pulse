"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";

const LOCALE_LABELS: Record<AppLocale, string> = {
  "zh-CN": "简体",
  "zh-TW": "繁體",
  en: "EN",
};

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("locale");

  const switchLocale = (next: AppLocale) => {
    const segments = pathname.split("/");
    if (routing.locales.includes(segments[1] as AppLocale)) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    const nextPath = segments.join("/") || `/${next}`;
    const qs = searchParams.toString();
    router.push(qs ? `${nextPath}?${qs}` : nextPath);
  };

  return (
    <select
      className="bg-surface text-sm px-2 py-2 rounded-lg border border-border text-foreground"
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
