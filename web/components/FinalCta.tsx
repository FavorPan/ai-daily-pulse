import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { SectionReveal } from "./SectionReveal";

export async function FinalCta() {
  const t = await getTranslations("landing");
  const locale = await getLocale();

  return (
    <section className="mb-16">
      <SectionReveal>
        <div className="border border-border rounded-card px-8 md:px-14 py-12 md:py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tighter leading-[1.1] text-foreground max-w-[24ch] mx-auto">
            {t("finalCtaTitle")}
          </h2>
          <p className="text-base text-muted leading-relaxed mt-5 max-w-[52ch] mx-auto">
            {t("finalCtaBody")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link
              href={`/${locale}/insight/`}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href={`/${locale}/about/`}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm hover:border-foreground/30 transition-colors active:scale-[0.98]"
            >
              {t("finalCtaSecondary")}
            </Link>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
