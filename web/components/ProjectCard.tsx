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
  const dateQs = item.digestDate ? `?date=${item.digestDate}` : "";

  return (
    <div className="glass-surface p-4 rounded-2xl transition group h-full flex flex-col hover:shadow-glow-sm hover:border-accent/30">
      <div className="flex justify-between items-start gap-2 mb-2">
        <Link
          href={`/${locale}/item/${item.id}${dateQs}`}
          className="font-semibold hover:text-accent line-clamp-2 transition-colors"
        >
          {item.title}
        </Link>
        <Tag label={item.topic} />
      </div>

      {showDate && (
        <span className="text-xs font-mono text-muted mb-2">{item.digestDate}</span>
      )}

      <p className="text-sm text-muted line-clamp-2 mb-4 flex-1">{item.summary}</p>

      <div className="text-xs text-muted flex justify-between items-center gap-2 pt-2 border-t border-border">
        <ScoreBadge score={item.score} />
        <span className="truncate flex-1 text-center">{item.source}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:opacity-80 shrink-0 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {t("original")}
        </a>
      </div>
    </div>
  );
}
