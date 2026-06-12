"use client";

import { useLocale } from "next-intl";
import { getTopicLabel } from "@/lib/topicLabels";
import type { AppLocale } from "@/i18n/routing";

export function Tag({ label }: { label: string }) {
  const locale = useLocale() as AppLocale;
  const display = getTopicLabel(label, locale) || label;

  return (
    <span className="topic-tag tag-blue shrink-0">
      {display}
    </span>
  );
}
