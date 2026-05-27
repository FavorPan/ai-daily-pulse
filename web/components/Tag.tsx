"use client";

import { useLocale } from "next-intl";
import { getTopicLabel } from "@/lib/topicLabels";
import type { AppLocale } from "@/i18n/routing";

const tagColors: Record<string, string> = {
  "OPC/AI赚钱案例": "tag-emerald",
  "AI+电商": "tag-amber",
  "AI工具实操/Agent工作流": "tag-violet",
  "AI新技术/新模型": "tag-blue",
  "AI投融资动态": "tag-rose",
  "AI对行业的冲击": "tag-orange",
  Agent: "tag-violet",
  Video: "tag-blue",
  Infra: "tag-orange",
};

export function Tag({ label }: { label: string }) {
  const locale = useLocale() as AppLocale;
  const display = getTopicLabel(label, locale) || label;
  const colorClass = tagColors[label] ?? "tag-default";

  return (
    <span className={`topic-tag shrink-0 ${colorClass}`}>
      {display}
    </span>
  );
}
