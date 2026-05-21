import type { AppLocale } from "@/i18n/routing";

const TOPIC_LABELS: Record<string, Record<AppLocale, string>> = {
  "OPC/AI赚钱案例": {
    "zh-CN": "OPC/AI赚钱案例",
    "zh-TW": "OPC/AI賺錢案例",
    en: "OPC / AI Monetization",
  },
  "AI+电商": {
    "zh-CN": "AI+电商",
    "zh-TW": "AI+電商",
    en: "AI + E-commerce",
  },
  "AI工具实操/Agent工作流": {
    "zh-CN": "AI工具实操/Agent工作流",
    "zh-TW": "AI工具實操/Agent工作流",
    en: "AI Tools & Agent Workflows",
  },
  "AI新技术/新模型": {
    "zh-CN": "AI新技术/新模型",
    "zh-TW": "AI新技術/新模型",
    en: "AI Tech & New Models",
  },
  "AI投融资动态": {
    "zh-CN": "AI投融资动态",
    "zh-TW": "AI投融資動態",
    en: "AI Funding & M&A",
  },
  "AI对行业的冲击": {
    "zh-CN": "AI对行业的冲击",
    "zh-TW": "AI對行業的衝擊",
    en: "AI Industry Impact",
  },
};

export function getTopicLabel(topic: string, locale: AppLocale): string {
  return TOPIC_LABELS[topic]?.[locale] ?? topic;
}
