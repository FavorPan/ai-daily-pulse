export const TOPIC_ORDER = [
  "OPC/AI赚钱案例",
  "AI+电商",
  "AI工具实操/Agent工作流",
  "AI新技术/新模型",
  "AI投融资动态",
  "AI对行业的冲击",
] as const;

export type Topic = (typeof TOPIC_ORDER)[number];
