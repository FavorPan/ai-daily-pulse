import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import type { DigestItemWithDate } from "@/lib/types";
import { SectionReveal } from "./SectionReveal";
import { FeaturedItem } from "./FeaturedItem";

type Props = {
  items: DigestItemWithDate[];
};

export async function FeaturedSection({ items }: Props) {
  const t = await getTranslations("landing");
  const locale = await getLocale();

  return (
    <section className="mb-24 md:mb-32">
      <SectionReveal>
        <div className="mb-10 max-w-[65ch]">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tighter leading-[1.1] text-foreground">
            {t("featuredTitle")}
          </h2>
          <p className="text-base text-muted leading-relaxed mt-5">
            {t("featuredBody")}
          </p>
        </div>
      </SectionReveal>

      <div className="border-t border-border">
        {items.slice(0, 6).map((item, i) => (
          <SectionReveal key={item.id} delay={i * 0.05}>
            <FeaturedItem item={item} />
          </SectionReveal>
        ))}
      </div>

      <SectionReveal delay={0.1}>
        <div className="mt-8">
          <Link
            href={`/${locale}/today/`}
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:gap-3 transition-all"
          >
            {t("ctaSecondary")}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </SectionReveal>
    </section>
  );
}
