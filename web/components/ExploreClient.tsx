"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ProjectCard } from "./ProjectCard";
import { TOPIC_ORDER } from "@/lib/topics";
import { getTopicLabel } from "@/lib/topicLabels";
import type { AppLocale } from "@/i18n/routing";
import type { DigestItemWithDate } from "@/lib/types";

type Props = {
  items: DigestItemWithDate[];
  dates: string[];
  locale: string;
};

export function ExploreClient({ items, dates, locale: currentLocale }: Props) {
  const locale = currentLocale as AppLocale;
  const t = useTranslations("explore");
  const ti = useTranslations("insight");
  const [topic, setTopic] = useState<string>("__all__");
  const [q, setQ] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

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
      if (dateStart && item.digestDate < dateStart) return false;
      if (dateEnd && item.digestDate > dateEnd) return false;
      if (!q) return true;
      const haystack = [item.title, item.summary, item.source, item.topic, ...item.tags]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q.toLowerCase());
    });
  }, [items, topic, q, dateStart, dateEnd]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.topic, (map.get(item.topic) || 0) + 1);
    }
    return map;
  }, [items]);

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Left sidebar: topic filter */}
      <aside className="w-full md:w-48 shrink-0">
        <h1 className="text-headline mb-1">{t("title")}</h1>
        <p className="text-sm text-muted mb-4">{t("subtitle")}</p>
        <div className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-3">
            {ti("dateFilter")}
          </h3>
          <div className="space-y-2">
            <label className="text-xs text-muted block">{ti("dateFrom")}</label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md border border-border bg-surface text-xs text-foreground"
            />
            <label className="text-xs text-muted block mt-1">{ti("dateTo")}</label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md border border-border bg-surface text-xs text-foreground"
            />
          </div>
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-3">
          {t("topicFilter")}
        </h3>
        <div className="space-y-1">
          {topicOptions.map(({ key, label }) => {
            const count = key === "__all__" ? items.length : counts.get(key) ?? 0;
            const active = topic === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTopic(key)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors text-left ${
                  active
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted hover:text-foreground hover:bg-surface-muted"
                }`}
              >
                <span className="truncate">{label}</span>
                <span className={`text-xs font-mono ml-3 ${active ? "text-accent" : "text-muted"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right: search + articles */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Search */}
        <div className="sticky top-14 z-10 bg-background/90 backdrop-blur-md pb-3">
          <input
            type="text"
            className="bg-surface px-3 py-1.5 rounded-md text-[13px] w-full sm:w-72 border border-border text-foreground placeholder:text-muted transition-colors"
            placeholder={t("searchPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {q && (
          <p className="text-xs text-muted">{t("searching", { q })}</p>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div>
            {filtered.map((item, i) => (
              <ProjectCard key={`${item.digestDate}-${item.id}-${i}`} item={item} showDate />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
