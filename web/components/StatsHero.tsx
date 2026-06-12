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
  })).filter((c) => c.count > 0);

  const maxCount = Math.max(...counts.map((c) => c.count), 1);

  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between gap-3 mb-5">
        <h2 className="text-subhead">{t("title")}</h2>
        <span className="text-xs font-mono text-muted">{date}</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="shrink-0">
          <div className="text-5xl font-bold font-mono tabular-nums tracking-tighter text-foreground">
            {items.length}
          </div>
          <div className="text-sm text-muted mt-1">{t("total", { count: items.length })}</div>
        </div>

        {/* Horizontal bar chart */}
        <div className="flex-1 w-full space-y-2">
          {counts.map(({ label, count }) => {
            const pct = (count / maxCount) * 100;
            return (
              <div key={label} className="flex items-center gap-3 group">
                <div className="text-xs text-muted w-28 sm:w-36 text-right truncate shrink-0 transition-colors group-hover:text-foreground">
                  {label}
                </div>
                <div className="flex-1 h-6 rounded-sm overflow-hidden relative bg-accent/10">
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: "var(--accent)",
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span className="text-xs font-mono font-semibold w-5 text-right text-accent">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
