"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

export function HeaderNav() {
  const t = useTranslations("nav");
  const locale = useLocale();

  return (
    <nav className="flex items-center gap-6 text-sm text-muted">
      <Link href={`/${locale}`} className="hover:text-foreground">
        {t("home")}
      </Link>
      <Link href={`/${locale}/explore`} className="hover:text-foreground">
        {t("explore")}
      </Link>
      <Link href={`/${locale}/about`} className="hover:text-foreground">
        {t("about")}
      </Link>
    </nav>
  );
}
