const colorMap: Record<string, string> = {
  "OPC/AI赚钱案例": "bg-emerald-600",
  "AI+电商": "bg-amber-600",
  "AI工具实操/Agent工作流": "bg-purple-600",
  "AI新技术/新模型": "bg-blue-600",
  "AI投融资动态": "bg-rose-600",
  "AI对行业的冲击": "bg-orange-500",
  Agent: "bg-purple-600",
  Video: "bg-blue-600",
  Infra: "bg-orange-500",
};

export function Tag({ label }: { label: string }) {
  return (
    <span
      className={`text-xs px-2 py-1 rounded shrink-0 ${colorMap[label] || "bg-gray-600"}`}
    >
      {label}
    </span>
  );
}
