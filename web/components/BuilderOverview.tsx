"use client";

import { useTranslations } from "next-intl";
import type { BuildProject } from "@/lib/types";

type Props = {
  itemsCount: number;
  directions: BuildProject[];
};

export function BuilderOverview({ itemsCount, directions }: Props) {
  const t = useTranslations("builder");
  const hotTopics = directions.filter(
    (d) => d.social_pulse && d.social_pulse.total_engagement > 0
  ).length;

  const stats = [
    { value: itemsCount, label: t("overviewArticles", { count: itemsCount }) },
    { value: hotTopics, label: t("overviewTopics", { count: hotTopics }) },
    { value: directions.length, label: t("overviewProjects", { count: directions.length }) },
  ];

  return (
    <section className="mb-10">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-4">
        {t("overview")}
      </h2>
      <div className="flex items-center gap-0">
        {stats.map((s, i) => (
          <div key={s.label} className="flex items-center gap-0">
            {i > 0 && (
              <div className="w-px h-8 bg-border mx-5" />
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-accent tabular-nums">
                {s.value}
              </span>
              <span className="text-sm text-muted">{s.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
