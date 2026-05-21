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
    <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-6 rounded-2xl text-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <span className="text-sm text-white/80">{date}</span>
      </div>

      <div className="mb-6">
        <div className="text-4xl font-bold tabular-nums">{items.length}</div>
        <div className="text-sm text-white/80 mt-1">{t("total", { count: items.length })}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {counts.map(({ label, count }) => (
          <div
            key={label}
            className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 text-center"
          >
            <div className="text-2xl font-bold tabular-nums">{count}</div>
            <div className="text-xs text-white/80 mt-1 line-clamp-2 leading-snug">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
