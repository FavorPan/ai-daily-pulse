"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ScoreBadge } from "./ScoreBadge";
import { Tag } from "./Tag";
import type { DigestItemWithDate } from "@/lib/types";

type Props = {
  item: DigestItemWithDate;
  showDate?: boolean;
};

export function ProjectCard({ item, showDate = false }: Props) {
  const locale = useLocale();
  const t = useTranslations("card");
  const isEn = locale === "en";
  const displaySummary = isEn && item.summary_en ? item.summary_en : item.summary;

  return (
    <Link
      href={`/${locale}/item/${item.digestDate}/${item.id}/`}
      className="group block editorial-card pb-4 mb-4 last:border-b-0 last:mb-0 accent-bar pl-6"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-[15px] leading-snug text-foreground group-hover:text-accent transition-colors line-clamp-2">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <Tag label={item.topic} />
        </div>
      </div>

      {showDate && (
        <span className="text-xs font-mono text-muted mb-2 block">{item.digestDate}</span>
      )}

      <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-3">
        {displaySummary}
      </p>

      {item.why_now && (
        <p className="text-sm text-accent mb-3 line-clamp-1">
          {item.why_now}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <ScoreBadge score={item.score} />
        <span className="text-xs text-muted truncate flex-1 text-center">{item.source}</span>
        <span className="text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {t("original")}
        </span>
      </div>
    </Link>
  );
}
