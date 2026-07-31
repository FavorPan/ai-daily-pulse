import type { BuildProject } from "@/lib/types";

type Props = {
  project: BuildProject;
  locale: string;
  date: string;
};

const DIFFICULTY_LABEL: Record<string, { zh: string; en: string; color: string }> = {
  easy: { zh: "简单", en: "Easy", color: "text-diff-easy" },
  medium: { zh: "中等", en: "Medium", color: "text-diff-medium" },
  hard: { zh: "困难", en: "Hard", color: "text-diff-hard" },
};

export function InsightSpotlightCard({ project, locale, date }: Props) {
  const isEn = locale === "en";
  const name = project.name_en || project.name;
  const description = isEn
    ? project.description_en || project.description
    : project.description;
  const whyNow = isEn ? project.why_now_en || project.why_now : project.why_now;
  const monetization = isEn
    ? project.monetization_en || project.monetization
    : project.monetization;
  const targetUser = isEn
    ? project.target_user_en || project.target_user
    : project.target_user;
  const coreFeatures = isEn
    ? project.core_features_en || project.core_features
    : project.core_features;

  const diff = project.difficulty
    ? DIFFICULTY_LABEL[project.difficulty] ?? DIFFICULTY_LABEL.medium
    : null;

  return (
    <article className="grid grid-cols-1 lg:grid-cols-12 border border-border rounded-card overflow-hidden">
      {/* Left rail: identity */}
      <div className="lg:col-span-4 bg-surface-muted p-7 lg:p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          {diff && (
            <span className={`text-xs font-mono font-medium ${diff.color}`}>
              {isEn ? diff.en : diff.zh}
            </span>
          )}
          {project.estimated_mvp_days != null && (
            <span className="text-xs font-mono text-muted tabular-nums">
              {project.estimated_mvp_days}d MVP
            </span>
          )}
        </div>

        <h3 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
          {name}
        </h3>

        {targetUser && (
          <p className="text-sm text-muted mt-4 leading-relaxed">
            {targetUser}
          </p>
        )}

        <div className="mt-auto pt-6">
          <span className="text-[11px] font-mono text-muted uppercase tracking-[0.14em]">
            {date}
          </span>
        </div>
      </div>

      {/* Right: body */}
      <div className="lg:col-span-8 p-7 lg:p-8">
        {description && (
          <p className="text-base text-foreground/90 leading-relaxed mb-6">
            {description}
          </p>
        )}

        {whyNow && (
          <div className="border-l-2 border-accent pl-4 mb-6">
            <p className="text-[11px] font-mono font-semibold text-accent uppercase tracking-[0.14em] mb-1.5">
              {isEn ? "Why now" : "为什么是现在"}
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {whyNow}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-6">
          {monetization && (
            <div>
              <p className="text-[11px] font-mono text-muted uppercase tracking-[0.14em] mb-1.5">
                {isEn ? "Monetization" : "变现"}
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {monetization}
              </p>
            </div>
          )}
          {project.source_article && (
            <div>
              <p className="text-[11px] font-mono text-muted uppercase tracking-[0.14em] mb-1.5">
                {isEn ? "Source" : "来源"}
              </p>
              {project.source_article_url ? (
                <a
                  href={project.source_article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:opacity-70 transition-opacity line-clamp-2"
                >
                  {project.source_article}
                </a>
              ) : (
                <p className="text-sm text-muted line-clamp-2">
                  {project.source_article}
                </p>
              )}
            </div>
          )}
        </div>

        {coreFeatures && coreFeatures.length > 0 && (
          <div>
            <p className="text-[11px] font-mono text-muted uppercase tracking-[0.14em] mb-2">
              {isEn ? "Core features" : "核心功能"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {coreFeatures.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-surface-muted text-muted border border-border/60"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
