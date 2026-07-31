import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import type { BuildProject } from "@/lib/types";
import { SectionReveal } from "./SectionReveal";
import { InsightSpotlightCard } from "./InsightSpotlightCard";

type Props = {
  directions: BuildProject[];
  date: string;
};

export async function InsightShowcase({ directions, date }: Props) {
  const t = await getTranslations("landing");
  const locale = await getLocale();

  const featured = directions[0];

  return (
    <section className="mb-24 md:mb-32">
      <SectionReveal>
        <div className="mb-10 max-w-[65ch]">
          <p className="text-[12px] font-mono text-accent uppercase tracking-[0.18em] mb-3">
            {t("insightEyebrow")}
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tighter leading-[1.1] text-foreground">
            {t("insightTitle")}
          </h2>
          <p className="text-base text-muted leading-relaxed mt-5">
            {t("insightBody")}
          </p>
        </div>
      </SectionReveal>

      {featured ? (
        <SectionReveal delay={0.1}>
          <InsightSpotlightCard project={featured} locale={locale} date={date} />
        </SectionReveal>
      ) : (
        <SectionReveal delay={0.1}>
          <div className="border border-border rounded-card p-10 text-center">
            <p className="text-sm text-muted">
              {t("insightBody")}
            </p>
          </div>
        </SectionReveal>
      )}

      <SectionReveal delay={0.15}>
        <div className="mt-8">
          <Link
            href={`/${locale}/insight/`}
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:gap-3 transition-all"
          >
            {t("insightCta")}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </SectionReveal>
    </section>
  );
}
