import type { BuildProject } from "@/lib/types";

type Props = {
  directions: BuildProject[];
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
        🎯 可做的项目
        <span className="text-sm font-normal text-muted ml-2">
          基于 7 天以上持续趋势
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {directions.map((p, i) => (
          <div
            key={i}
            className="card-surface p-5 border-l-4 border-accent"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-[15px] leading-snug text-foreground">
                {p.name}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficultyColors[p.difficulty]}`}
                >
                  {difficultyLabels[p.difficulty] || p.difficulty}
                </span>
                {p.estimated_mvp_days && (
                  <span className="text-xs text-muted">
                    {p.estimated_mvp_days}天MVP
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-muted mb-2">
              {p.description}
            </p>

            <p className="text-sm text-muted mb-2">
              👤 {p.target_user}
            </p>

            <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
              ⏰ {p.why_now}
            </p>

            {p.core_features && p.core_features.length > 0 && (
              <div className="text-sm text-muted mb-2">
                <span className="font-medium">核心功能：</span>
                <ul className="mt-1 space-y-0.5">
                  {p.core_features.map((f, j) => (
                    <li key={j} className="ml-3">• {f}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-sm text-muted mb-2">
              💰 {p.monetization}
            </p>

            {p.related_trends && p.related_trends.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {p.related_trends.map((t, j) => (
                  <span
                    key={j}
                    className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
