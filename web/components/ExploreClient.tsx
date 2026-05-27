"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ProjectCard } from "./ProjectCard";
import { TOPIC_ORDER } from "@/lib/topics";
import { getTopicLabel } from "@/lib/topicLabels";
import type { AppLocale } from "@/i18n/routing";
import type { DigestItemWithDate } from "@/lib/types";

type Props = {
  items: DigestItemWithDate[];
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
      className={`shrink-0 text-xs px-3 py-1.5 rounded-md border transition-colors font-medium ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-surface text-muted border-border hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function ExploreClient({ items }: Props) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("explore");
  const [topic, setTopic] = useState<string>("__all__");
  const [q, setQ] = useState("");

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#q=")) {
      setQ(decodeURIComponent(hash.slice(3)));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

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
      const haystack = [item.title, item.summary, item.source, item.topic, ...item.tags]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q.toLowerCase());
    });
  }, [items, topic, q]);

  return (
    <div className="space-y-4">
      {/* Search + topic filter bar */}
      <div className="sticky top-14 z-10 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-md border-b border-border space-y-3">
        <input
          type="text"
          className="bg-surface px-3 py-1.5 rounded-md text-[13px] w-full sm:w-64 border border-border text-foreground placeholder:text-muted transition-colors"
          placeholder={t("searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
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

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted text-sm">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <ProjectCard key={`${item.digestDate}-${item.id}`} item={item} showDate />
          ))}
        </div>
      )}
    </div>
  );
}
