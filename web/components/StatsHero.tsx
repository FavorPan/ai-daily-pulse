import { getTranslations, getLocale } from "next-intl/server";
import { TOPIC_ORDER } from "@/lib/topics";
import { getTopicLabel } from "@/lib/topicLabels";
import type { AppLocale } from "@/i18n/routing";
import type { DigestItem } from "@/lib/types";

type Props = {
  date: string;
  items: DigestItem[];
};

export async function StatsHero({ date, items }: Props) {
  const t = await getTranslations("home");
  const locale = (await getLocale()) as AppLocale;

  const counts = TOPIC_ORDER.map((topic) => ({
    topic,
    label: getTopicLabel(topic, locale),
    count: items.filter((i) => i.topic === topic).length,
  }));

  return (
    <section className="glass-surface rounded-2xl p-6 accent-line-top">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
          {date}
        </span>
      </div>

      <div className="mb-6 flex items-end gap-3">
        <div className="text-4xl font-bold font-mono tabular-nums text-accent">
          {items.length}
        </div>
        <div className="text-sm text-muted pb-1">{t("total", { count: items.length })}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {counts.map(({ label, count }) => (
          <div
            key={label}
            className="rounded-xl px-3 py-3 text-center border border-border bg-surface-muted/50 hover:border-accent/30 transition-colors"
          >
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {count}
            </div>
            <div className="text-xs text-muted mt-1 line-clamp-2 leading-snug">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
