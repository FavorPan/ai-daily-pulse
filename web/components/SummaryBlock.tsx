"use client";

import { useTranslations } from "next-intl";
import { ScoreBadge } from "./ScoreBadge";
import { Tag } from "./Tag";
import type { DigestItem } from "@/lib/types";

export function SummaryBlock({ item }: { item: DigestItem }) {
  const t = useTranslations("item");

  return (
    <div className="card-surface p-6 space-y-6">
      <div>
        <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">{t("summary")}</div>
        <div className="text-foreground leading-relaxed text-[15px]">
          {item.summary || t("noSummary")}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <div>
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">{t("topic")}</div>
          <Tag label={item.topic} />
        </div>
        <div>
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">{t("score")}</div>
          <ScoreBadge score={item.score} size="lg" />
        </div>
        <div>
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">{t("source")}</div>
          <div className="text-sm text-foreground">{item.source}</div>
        </div>
      </div>

      {item.tags.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">{t("tags")}</div>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-md bg-surface-muted text-muted border border-border font-mono"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
        >
          {t("readOriginal")}
        </a>
      </div>
    </div>
  );
}
