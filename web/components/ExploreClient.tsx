"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ProjectCard } from "./ProjectCard";
import { TOPIC_ORDER } from "@/lib/topics";
import { getTopicLabel } from "@/lib/topicLabels";
import type { AppLocale } from "@/i18n/routing";
import type { DigestItemWithDate } from "@/lib/types";

type Props = {
  items: DigestItemWithDate[];
  globalSearch: boolean;
  archiveDays?: number;
};

function TopicChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 text-sm px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-accent/15 text-accent border-accent/40"
          : "bg-surface text-muted border-border hover:border-accent/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function TopicSidebar({
  topic,
  setTopic,
  topicOptions,
  q,
  searchingLabel,
}: {
  topic: string;
  setTopic: (k: string) => void;
  topicOptions: { key: string; label: string }[];
  q: string;
  searchingLabel: string;
}) {
  const t = useTranslations("explore");

  return (
    <div className="glass-surface p-4 rounded-xl space-y-2 sticky top-6">
      <div className="text-sm font-medium text-foreground mb-3">{t("topicFilter")}</div>
      {topicOptions.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setTopic(key)}
          className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition ${
            topic === key
              ? "bg-accent/15 text-accent border border-accent/30"
              : "text-muted hover:bg-surface-muted hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
      {q && (
        <p className="text-xs text-muted pt-2 border-t border-border mt-3">{searchingLabel}</p>
      )}
    </div>
  );
}

export function ExploreClient({ items, globalSearch, archiveDays }: Props) {
  const searchParams = useSearchParams();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("explore");
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();
  const [topic, setTopic] = useState<string>("__all__");

  const topicOptions = useMemo(
    () => [
      { key: "__all__", label: t("allTopics") },
      ...TOPIC_ORDER.map((topicKey) => ({
        key: topicKey,
        label: getTopicLabel(topicKey, locale),
      })),
    ],
    [locale, t]
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (topic !== "__all__" && item.topic !== topic) return false;
      if (!q) return true;
      const haystack = [
        item.title,
        item.summary,
        item.source,
        item.topic,
        ...item.tags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, topic, q]);

  const searchingLabel = q ? t("searching", { q }) : "";

  return (
    <div className="space-y-4">
      {/* Mobile / tablet: horizontal topic chips */}
      <div className="lg:hidden sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {topicOptions.map(({ key, label }) => (
            <TopicChip
              key={key}
              active={topic === key}
              label={label}
              onClick={() => setTopic(key)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="hidden lg:block lg:col-span-1">
          <TopicSidebar
            topic={topic}
            setTopic={setTopic}
            topicOptions={topicOptions}
            q={q}
            searchingLabel={searchingLabel}
          />
        </div>

        <div className="lg:col-span-3">
          {globalSearch && archiveDays != null && (
            <p className="text-sm text-muted mb-4">
              {t("globalSearchHint", { days: archiveDays })}
            </p>
          )}
          {filtered.length === 0 ? (
            <p className="text-muted">{t("empty")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((item) => (
                <ProjectCard
                  key={`${item.digestDate}-${item.id}`}
                  item={item}
                  showDate={globalSearch}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
