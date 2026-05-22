"use client";

import { useLocale } from "next-intl";
import { getTopicLabel } from "@/lib/topicLabels";
import type { AppLocale } from "@/i18n/routing";

const colorMap: Record<string, string> = {
  "OPC/AI赚钱案例": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "AI+电商": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "AI工具实操/Agent工作流": "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  "AI新技术/新模型": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  "AI投融资动态": "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  "AI对行业的冲击": "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  Agent: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  Video: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  Infra: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
};

export function Tag({ label }: { label: string }) {
  const locale = useLocale() as AppLocale;
  const display = getTopicLabel(label, locale) || label;
  const colors = colorMap[label] || "bg-surface-muted text-muted border-border";

  return (
    <span className={`text-xs px-2 py-1 rounded-full shrink-0 border ${colors}`}>
      {display}
    </span>
  );
}
