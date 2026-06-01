import type { BuildDirection } from "@/lib/types";

type Props = {
  directions: BuildDirection[];
};

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const difficultyLabels: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

export function BuildDirections({ directions }: Props) {
  if (!directions || directions.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-subhead mb-4">
        🎯 今日构建方向
        <span className="text-sm font-normal text-muted ml-2">
          来自 AI 分析的 OPC 建议
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {directions.map((d, i) => (
          <div
            key={i}
            className="card-surface p-5 border-l-4 border-accent"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-[15px] leading-snug text-foreground">
                {d.direction}
              </h3>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColors[d.difficulty]}`}
              >
                {difficultyLabels[d.difficulty] || d.difficulty}
              </span>
            </div>

            <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
              ⏰ {d.why_now}
            </p>

            <p className="text-sm text-muted mb-3">
              💰 {d.monetization}
            </p>

            {d.evidence && d.evidence.length > 0 && (
              <div className="text-xs text-muted">
                <span className="font-medium">依据：</span>
                {d.evidence.join("；")}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
