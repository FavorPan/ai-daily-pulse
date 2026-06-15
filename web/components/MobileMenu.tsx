"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { routing, type AppLocale } from "@/i18n/routing";
import { useRouter } from "next/navigation";

const GITHUB_URL = "https://github.com/FavorPan/ai-daily-pulse";

const LOCALE_LABELS: Record<AppLocale, string> = {
  "zh-CN": "简",
  "zh-TW": "繁",
  en: "EN",
};

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("nav");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (next: AppLocale) => {
    const segments = pathname.split("/").filter(Boolean);
    if (routing.locales.includes(segments[0] as AppLocale)) {
      segments[0] = next;
    } else {
      segments.unshift(next);
    }
    router.push(`/${segments.join("/")}/`);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/explore`, label: t("explore") },
    { href: `/${locale}/builder`, label: t("builder") },
    { href: `/${locale}/about`, label: t("about") },
  ];

  const overlay = open && (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-72 max-w-[80vw] bg-[#fafafa] dark:bg-[#18181b] border-l border-border shadow-xl animate-slide-in-right">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-semibold text-sm">Menu</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {links.map(({ href, label }) => {
            const isHome = href === `/${locale}`;
            const active = isHome
              ? pathname === href || pathname === `${href}/`
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`block px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-foreground hover:bg-surface-muted"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4 space-y-4">
          <div>
            <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-3">
              Settings
            </p>
            <div className="flex items-center gap-2">
              {routing.locales.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => switchLocale(loc)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    locale === loc
                      ? "bg-accent/10 text-accent border-accent/30 font-medium"
                      : "bg-surface text-foreground border-border hover:border-foreground/30"
                  }`}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
              <ThemeSwitcher />
            </div>
          </div>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-8 h-8 rounded-md border border-border bg-surface text-muted hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center"
        aria-label="Open menu"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {mounted && createPortal(overlay, document.body)}
    </div>
  );
}
