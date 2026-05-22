import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";

type Props = {
  date?: string;
};

const stepIcons = [
  (
    <svg key="1" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  (
    <svg key="2" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  ),
  (
    <svg key="3" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
];

export async function ProductHero({ date }: Props) {
  const t = await getTranslations("hero");
  const locale = await getLocale();
  const exploreQs = date ? `?date=${date}` : "";
  const steps = [t("step1"), t("step2"), t("step3")];

  return (
    <section className="glass-surface rounded-2xl p-6 md:p-8 accent-line-top shadow-glow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-accent mb-2">
              AI Daily Pulse
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-balance leading-tight">
              {t("tagline")}
            </h1>
            <p className="text-muted mt-2 text-sm md:text-base">{t("subtitle")}</p>
          </div>

          <ol className="flex flex-col sm:flex-row gap-3 sm:gap-6">
            {steps.map((label, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0">
                  {stepIcons[i]}
                </span>
                <span className="pt-1.5 text-muted">
                  <span className="font-mono text-accent text-xs mr-1.5">{i + 1}.</span>
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
          <Link
            href={`/${locale}/explore${exploreQs}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-accent text-background font-medium text-sm hover:opacity-90 transition-opacity"
          >
            {t("ctaExplore")}
          </Link>
          <Link
            href={`/${locale}/about`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm hover:border-accent hover:text-accent transition-colors"
          >
            {t("ctaAbout")}
          </Link>
        </div>
      </div>
    </section>
  );
}
