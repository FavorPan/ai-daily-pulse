import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";

type Props = {
  date?: string;
};

export async function ProductHero({ date }: Props) {
  const t = await getTranslations("hero");
  const locale = await getLocale();
  const exploreQs = date ? `?date=${date}` : "";

  return (
    <section className="mb-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-4">
          <p className="text-[13px] font-mono text-muted tracking-wide uppercase">
            AI Daily Pulse
          </p>
          <h1 className="text-headline text-foreground">
            {t("tagline")}
          </h1>
          <p className="text-muted text-base leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex gap-3 shrink-0">
          <Link
            href={`/${locale}/explore${exploreQs}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            {t("ctaExplore")}
          </Link>
          <Link
            href={`/${locale}/about`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm hover:border-foreground/30 transition-colors active:scale-[0.98]"
          >
            {t("ctaAbout")}
          </Link>
        </div>
      </div>
    </section>
  );
}
