"use client";

import { useTranslations } from "next-intl";
import { Tag } from "./Tag";
import type { DigestItem } from "@/lib/types";

export function SummaryBlock({ item }: { item: DigestItem }) {
  const t = useTranslations("item");

  return (
    <div className="bg-surface p-6 rounded-2xl space-y-5 border border-border">
      <div>
        <div className="text-sm text-muted mb-1">{t("summary")}</div>
        <div className="leading-relaxed">{item.summary || t("noSummary")}</div>
      </div>
      <div>
        <div className="text-sm text-muted mb-1">{t("topic")}</div>
        <Tag label={item.topic} />
      </div>
      <div>
        <div className="text-sm text-muted mb-1">{t("score")}</div>
        <div>{item.score}/10</div>
      </div>
      {item.tags.length > 0 && (
        <div>
          <div className="text-sm text-muted mb-2">{t("tags")}</div>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded bg-surface-muted text-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="text-sm text-muted mb-1">{t("source")}</div>
        <div>{item.source}</div>
      </div>
      <div>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-accent hover:opacity-80"
        >
          {t("readOriginal")}
        </a>
      </div>
    </div>
  );
}
