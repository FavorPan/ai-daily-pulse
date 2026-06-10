"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { BuildProject } from "@/lib/types";

type Props = {
  project: BuildProject;
  maxEngagement: number;
};

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300",
  hard: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300",
};

const difficultyLabels: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

function formatEngagement(engagement: Record<string, number>): string {
  const parts: string[] = [];
  if (engagement.posts !== undefined) parts.push(`${engagement.posts} posts`);
  if (engagement.votes !== undefined) parts.push(`${engagement.votes} votes`);
  if (engagement.upvotes !== undefined)
    parts.push(`${engagement.upvotes} upvotes`);
  if (engagement.points !== undefined) parts.push(`${engagement.points} pts`);
  if (engagement.score !== undefined) parts.push(`${engagement.score} score`);
  if (engagement.comments !== undefined)
    parts.push(`${engagement.comments} comments`);
  if (engagement.replies !== undefined)
    parts.push(`${engagement.replies} replies`);
  return parts.join(" · ") || "-";
}

export function BuilderProjectCard({ project, maxEngagement }: Props) {
  const t = useTranslations("builder");
  const p = project;
  const pulse = p.social_pulse;
  const hasPulse = pulse && pulse.total_engagement > 0;
  const barWidth =
    maxEngagement > 0
      ? Math.min(100, Math.round((pulse?.total_engagement ?? 0) / maxEngagement * 100))
      : 0;

  return (
    <div className="card-surface p-5 border-l-4 border-accent">
      {/* a. Top: name + difficulty + MVP days */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-[15px] leading-snug text-foreground">
          {p.name}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              difficultyColors[p.difficulty] ?? difficultyColors.medium
            }`}
          >
            {difficultyLabels[p.difficulty] ?? p.difficulty}
          </span>
          {p.estimated_mvp_days != null && (
            <span className="text-xs text-muted font-mono">
              {t("mvpDays", { days: p.estimated_mvp_days })}
            </span>
          )}
        </div>
      </div>

      {/* b. Description */}
      <p className="text-sm text-muted mb-2">{p.description}</p>

      {/* c. Why now */}
      <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
        ⏰ {t("whyNow")}：{p.why_now}
      </p>

      {/* d. Target user */}
      <p className="text-sm text-muted mb-2">
        👤 {t("targetUser")}：{p.target_user}
      </p>

      {/* e. Core features */}
      {p.core_features && p.core_features.length > 0 && (
        <div className="text-sm text-muted mb-2">
          <span className="font-medium">{t("coreFeatures")}：</span>
          <ul className="mt-1 space-y-0.5">
            {p.core_features.map((f, j) => (
              <li key={j} className="ml-3">
                • {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* f. Monetization */}
      <p className="text-sm text-muted mb-2">
        💰 {t("monetization")}：{p.monetization}
      </p>

      {/* g. Social pulse */}
      {hasPulse ? (
        <div className="mb-3 p-3 rounded-lg bg-surface-muted">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">
              🔥 {t("socialPulse")}
            </span>
            <span className="text-xs text-muted">
              {t("crossPlatform", { count: pulse!.source_count })}
            </span>
          </div>

          {/* Per-platform engagement */}
          <div className="space-y-1.5 mb-2">
            {pulse!.matched_items.map((item, idx) => (
              <div
                key={idx}
                className="text-xs text-muted flex items-center gap-2"
              >
                <span className="font-medium text-foreground shrink-0">
                  {item.source}:
                </span>
                <span>{formatEngagement(item.engagement)}</span>
              </div>
            ))}
          </div>

          {/* Heat progress bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-muted mb-1">
              <span>{t("socialPulse")}</span>
              <span>
                {pulse!.total_engagement.toLocaleString()} engagements
              </span>
            </div>
            <div className="h-2 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>

          {/* Related discussion links */}
          <div className="space-y-0.5">
            {pulse!.matched_items
              .filter((item) => item.url)
              .map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-accent hover:opacity-80 truncate"
                >
                  {item.title || item.url}
                </a>
              ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted mb-3 italic">
          {t("socialPulseEmpty")}
        </p>
      )}

      {/* h. Source article */}
      {p.source_article && (
        <div className="text-sm mb-2">
          <span className="text-muted">📄 {t("sourceArticle")}：</span>
          {p.source_article_url ? (
            <a
              href={p.source_article_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:opacity-80"
            >
              {p.source_article}
            </a>
          ) : (
            <span>{p.source_article}</span>
          )}
          {p.source_article_source && (
            <span className="text-muted ml-1">
              ({p.source_article_source}
              {p.source_article_score != null && `, ${p.source_article_score}/10`})
            </span>
          )}
        </div>
      )}

      {/* i. Related trends */}
      {p.related_trends && p.related_trends.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {p.related_trends.map((tag, j) => (
            <span
              key={j}
              className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
