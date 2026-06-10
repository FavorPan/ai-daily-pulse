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
    { label: t("overviewArticles", { count: itemsCount }), value: itemsCount },
    { label: t("overviewTopics", { count: hotTopics }), value: hotTopics },
    { label: t("overviewProjects", { count: directions.length }), value: directions.length },
  ];

  return (
    <section className="mb-8">
      <h2 className="text-subhead mb-4">{t("overview")}</h2>
      <div className="flex flex-wrap gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center min-w-[80px]">
            <div className="text-2xl font-bold text-accent">{s.value}</div>
            <div className="text-xs text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
