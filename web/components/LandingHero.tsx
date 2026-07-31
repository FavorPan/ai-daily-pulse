import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { LandingHeroReveal } from "./LandingHeroReveal";

type Props = {
  date: string;
  articleCount: number;
  ideaCount: number;
};

const STAT_LABELS = [
  { key: "statSources", value: "40+" },
  { key: "statDaily", value: "1/day" },
  { key: "statIdeas", value: "live" },
  { key: "statLang", value: "zh/en" },
] as const;

export async function LandingHero({ date, articleCount, ideaCount }: Props) {
  const t = await getTranslations("landing");
  const locale = await getLocale();

  return (
    <section className="relative mb-20 md:mb-28 pt-8 md:pt-12">
      <LandingHeroReveal>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
          {/* Left: headline */}
          <div className="lg:col-span-7">
            <p className="text-[12px] font-mono text-muted uppercase tracking-[0.18em] mb-6">
              {t("eyebrow")}
            </p>
            <h1 className="text-foreground tracking-tighter leading-[1.05]">
              <span className="block text-4xl md:text-5xl lg:text-6xl font-semibold">
                {t("headlineA")}
              </span>
              <span className="block text-4xl md:text-5xl lg:text-6xl font-semibold mt-1">
                {t("headlineB")}
              </span>
            </h1>
            <p className="text-base md:text-lg text-muted leading-relaxed max-w-[58ch] mt-7">
              {t("subtext")}
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-9">
              <Link
                href={`/${locale}/insight/`}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                {t("ctaPrimary")}
              </Link>
              <Link
                href={`/${locale}/today/`}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm hover:border-foreground/30 transition-colors active:scale-[0.98]"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>

          {/* Right: today panel */}
          <div className="lg:col-span-5 lg:pl-8 lg:border-l border-border">
            <div className="space-y-6">
              <div>
                <p className="text-[12px] font-mono text-muted uppercase tracking-[0.18em] mb-2">
                  {date}
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold font-mono tabular-nums tracking-tighter text-foreground">
                    {String(articleCount).padStart(2, "0")}
                  </span>
                  <span className="text-sm text-muted">{t("statDaily")}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {STAT_LABELS.map(({ key, value }) => (
                  <div key={key}>
                    <div className="text-xl font-mono font-semibold tabular-nums text-foreground">
                      {value}
                    </div>
                    <div className="text-xs text-muted mt-0.5">{t(key)}</div>
                  </div>
                ))}
              </div>

              <Link
                href={`/${locale}/insight/`}
                className="group flex items-center justify-between pt-5 border-t border-border"
              >
                <span className="text-sm text-foreground font-medium">
                  {t("statIdeas")}
                </span>
                <span className="text-sm text-accent font-mono tabular-nums group-hover:translate-x-0.5 transition-transform">
                  {ideaCount} →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </LandingHeroReveal>
    </section>
  );
}
