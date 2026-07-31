"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import type { DigestItemWithDate } from "@/lib/types";
import { ScoreBadge } from "./ScoreBadge";

type Props = {
  item: DigestItemWithDate;
};

export function FeaturedItem({ item }: Props) {
  const locale = useLocale();
  const isEn = locale === "en";
  const summary = isEn && item.summary_en ? item.summary_en : item.summary;
  const whyNow = isEn && item.why_now_en ? item.why_now_en : item.why_now;

  return (
    <Link
      href={`/${locale}/item/${item.digestDate}/${item.id}/`}
      className="group block border-b border-border py-5 hover:border-accent transition-colors"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 items-start">
        <div className="md:col-span-8">
          <h3 className="font-semibold text-[15px] leading-snug text-foreground group-hover:text-accent transition-colors line-clamp-2">
            {item.title}
          </h3>
          <p className="text-sm text-muted leading-relaxed mt-1.5 line-clamp-2">
            {summary}
          </p>
          {whyNow && (
            <p className="text-sm text-accent mt-2 line-clamp-1">
              {whyNow}
            </p>
          )}
        </div>
        <div className="md:col-span-4 flex md:flex-col items-center md:items-end gap-3 md:gap-1.5 md:text-right">
          <ScoreBadge score={item.score} />
          <span className="text-xs text-muted truncate">{item.source}</span>
          <span className="text-[11px] font-mono text-muted">{item.topic}</span>
        </div>
      </div>
    </Link>
  );
}
