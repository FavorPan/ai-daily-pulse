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
    <section className="mb-10">
      {/* Large date stamp */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
        <div className="space-y-3">
          <p className="text-[13px] font-mono text-muted tracking-wide uppercase">
            AI Daily Pulse
          </p>
          <h1 className="text-display text-foreground">
            {t("tagline")}
          </h1>
          <p className="text-muted text-base max-w-[50ch] leading-relaxed">
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

      {/* Pipeline steps - editorial style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: "01", label: t("step1"), desc: "RSS + GitHub Trending" },
          { icon: "02", label: t("step2"), desc: "LLM scoring + dedup" },
          { icon: "03", label: t("step3"), desc: "Search + browse" },
        ].map((step, i) => (
          <div
            key={i}
            className="group flex gap-4 p-4 rounded-card border border-border bg-surface hover:border-accent/30 transition-colors"
          >
            <span className="font-mono text-[11px] font-bold text-accent bg-accent/10 w-7 h-7 flex items-center justify-center rounded-md shrink-0 mt-0.5">
              {step.icon}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{step.label}</p>
              <p className="text-xs text-muted mt-0.5 font-mono">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
