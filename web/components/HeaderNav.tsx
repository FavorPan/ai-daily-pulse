"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

export function HeaderNav() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  const links = [
    { href: `/${locale}`, label: t("home"), match: (p: string) => p === `/${locale}` || p === `/${locale}/` },
    { href: `/${locale}/explore`, label: t("explore"), match: (p: string) => p.includes("/explore") },
    { href: `/${locale}/about`, label: t("about"), match: (p: string) => p.includes("/about") },
  ];

  return (
    <nav className="hidden sm:flex items-center gap-1">
      {links.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`text-[13px] px-3 py-1.5 rounded-md transition-colors ${
              active
                ? "text-foreground font-medium bg-surface-muted"
                : "text-muted hover:text-foreground hover:bg-surface-muted/50"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
