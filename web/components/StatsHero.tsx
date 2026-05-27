import { getTranslations, getLocale } from "next-intl/server";
import { TOPIC_ORDER } from "@/lib/topics";
import { getTopicLabel } from "@/lib/topicLabels";
import type { AppLocale } from "@/i18n/routing";
import type { DigestItem } from "@/lib/types";

type Props = {
  date: string;
  items: DigestItem[];
};

const TOPIC_COLORS: Record<string, { solid: string; fill: string }> = {
  "OPC/AI赚钱案例": { solid: "#10b981", fill: "rgba(16,185,129,0.22)" },
  "AI+电商": { solid: "#f59e0b", fill: "rgba(245,158,11,0.22)" },
  "AI工具实操/Agent工作流": { solid: "#8b5cf6", fill: "rgba(139,92,246,0.22)" },
  "AI新技术/新模型": { solid: "#3b82f6", fill: "rgba(59,130,246,0.22)" },
  "AI投融资动态": { solid: "#ef4444", fill: "rgba(239,68,68,0.22)" },
  "AI对行业的冲击": { solid: "#f97316", fill: "rgba(249,115,22,0.22)" },
};

export async function StatsHero({ date, items }: Props) {
  const t = await getTranslations("home");
  const locale = (await getLocale()) as AppLocale;

  const counts = TOPIC_ORDER.map((topic) => ({
    topic,
    label: getTopicLabel(topic, locale),
    count: items.filter((i) => i.topic === topic).length,
    colors: TOPIC_COLORS[topic] ?? { solid: "#94a3b8", fill: "rgba(148,163,184,0.22)" },
  })).filter((c) => c.count > 0);

  const maxCount = Math.max(...counts.map((c) => c.count), 1);

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between gap-3 mb-5">
        <h2 className="text-subhead">{t("title")}</h2>
        <span className="text-xs font-mono text-muted px-2.5 py-1 rounded-md bg-surface-muted border border-border">
          {date}
        </span>
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
          {counts.map(({ label, count, colors }) => {
            const pct = (count / maxCount) * 100;
            return (
              <div key={label} className="flex items-center gap-3 group">
                <div className="text-xs text-muted w-28 sm:w-36 text-right truncate shrink-0 transition-colors group-hover:text-foreground">
                  {label}
                </div>
                <div className="flex-1 h-7 rounded-md overflow-hidden relative" style={{ backgroundColor: colors.fill }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: colors.solid,
                      opacity: 0.75,
                    }}
                  />
                </div>
                <span className="text-xs font-mono font-semibold w-5 text-right" style={{ color: colors.solid }}>
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
