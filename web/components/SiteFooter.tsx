import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";

const GITHUB_URL = "https://github.com/FavorPan/ai-daily-pulse";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const locale = await getLocale();

  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <p>{t("tagline")}</p>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
              {t("home")}
            </Link>
            <Link href={`/${locale}/about`} className="hover:text-foreground transition-colors">
              {t("about")}
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
