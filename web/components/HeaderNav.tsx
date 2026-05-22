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
    <nav className="flex items-center gap-4 md:gap-6 text-sm">
      {links.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`transition-colors whitespace-nowrap ${
              active
                ? "text-accent font-medium"
                : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
