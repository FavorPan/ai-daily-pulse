"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
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
    <div className="bg-surface p-4 rounded-2xl hover:scale-[1.02] transition group h-full flex flex-col border border-border">
      <div className="flex justify-between items-start gap-2 mb-2">
        <Link
          href={`/${locale}/item/${item.id}${dateQs}`}
          className="font-semibold hover:text-accent line-clamp-2"
        >
          {item.title}
        </Link>
        <Tag label={item.topic} />
      </div>

      {showDate && (
        <span className="text-xs text-muted mb-2">{item.digestDate}</span>
      )}

      <p className="text-sm text-muted line-clamp-2 mb-4 flex-1">{item.summary}</p>

      <div className="text-xs text-muted flex justify-between items-center">
        <span>{item.score}/10</span>
        <span className="truncate ml-2">{item.source}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-accent hover:opacity-80 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {t("original")}
        </a>
      </div>
    </div>
  );
}
