"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { BuildProject } from "@/lib/types";

type Props = {
  project: BuildProject;
  maxEngagement: number;
  index: number;
};

const difficultyLabels: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

function fmtEng(engagement: Record<string, number>): string {
  const parts: string[] = [];
  if (engagement.posts !== undefined) parts.push(`${engagement.posts} posts`);
  if (engagement.votes !== undefined) parts.push(`${engagement.votes} votes`);
  if (engagement.upvotes !== undefined) parts.push(`${engagement.upvotes} upvotes`);
  if (engagement.points !== undefined) parts.push(`${engagement.points} pts`);
  if (engagement.comments !== undefined) parts.push(`${engagement.comments} cmts`);
  if (engagement.replies !== undefined) parts.push(`${engagement.replies} replies`);
  if (engagement.score !== undefined) parts.push(`${engagement.score} score`);
  return parts.join(", ") || "-";
}

const MAX_VISIBLE_PLATFORMS = 3;

export function BuilderProjectCard({ project, maxEngagement, index }: Props) {
  const t = useTranslations("builder");
  const [expanded, setExpanded] = useState(false);
  const p = project;
  const pulse = p.social_pulse;
  const hasPulse = pulse && pulse.total_engagement > 0;
  const barWidth =
    maxEngagement > 0
      ? Math.min(100, Math.round((pulse?.total_engagement ?? 0) / maxEngagement * 100))
      : 0;

  const hasDetails =
    (p.core_features && p.core_features.length > 0) ||
    p.source_article ||
    (p.related_trends && p.related_trends.length > 0) ||
    p.target_user ||
    p.monetization;

  const visibleItems = hasPulse ? pulse!.matched_items.slice(0, MAX_VISIBLE_PLATFORMS) : [];
  const hiddenCount = hasPulse ? pulse!.matched_items.length - MAX_VISIBLE_PLATFORMS : 0;

  return (
    <article
      className="card-surface animate-slide-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
    >
      <div className="p-5">
        {/* Row 1: name + meta */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-mono text-muted tabular-nums shrink-0">
              #{String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-semibold text-[15px] leading-snug text-foreground truncate">
              {p.name}
            </h3>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs text-muted">
              {difficultyLabels[p.difficulty] ?? p.difficulty}
            </span>
            {p.estimated_mvp_days != null && (
              <>
                <span className="w-px h-3 bg-border" />
                <span className="text-xs text-muted font-mono tabular-nums">
                  {t("mvpDays", { days: p.estimated_mvp_days })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Row 2: description */}
        <p className="text-sm text-muted leading-relaxed mb-3">
          {p.description}
        </p>

        {/* Row 3: Why Now — border-left accent, same left edge as other text */}
        <div className="border-l-2 border-accent/40 pl-3 mb-3">
          <p className="text-sm text-foreground/80 leading-relaxed">
            <span className="font-semibold text-accent">{t("whyNow")}</span>
            {" "}{p.why_now}
          </p>
        </div>

        {/* Row 4: community heat */}
        {hasPulse ? (
          <div className="mb-3">
            {/* Platform stats */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted mb-2">
              {visibleItems.map((item, idx) => (
                <span key={idx} className="whitespace-nowrap">
                  <span className="font-medium text-foreground/70">{item.source}</span>
                  {" "}{fmtEng(item.engagement)}
                </span>
              ))}
              {hiddenCount > 0 && (
                <span className="text-muted/60">+{hiddenCount} more</span>
              )}
            </div>

            {/* Heat bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-700"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-xs text-muted font-mono tabular-nums shrink-0">
                {pulse!.total_engagement.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted italic mb-3">
            {t("socialPulseEmpty")}
          </p>
        )}

        {/* Expand toggle */}
        {hasDetails && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
            aria-expanded={expanded}
          >
            <span>{expanded ? t("collapse") : t("expand")}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* EXPANDED DETAILS */}
      {expanded && hasDetails && (
        <div className="border-t border-border px-5 py-4 space-y-3 animate-slide-up">
          {/* Target user + Monetization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {p.target_user && (
              <div>
                <span className="text-xs font-medium text-foreground/70">{t("targetUser")}</span>
                <p className="text-xs text-muted mt-0.5">{p.target_user}</p>
              </div>
            )}
            {p.monetization && (
              <div>
                <span className="text-xs font-medium text-foreground/70">{t("monetization")}</span>
                <p className="text-xs text-muted mt-0.5">{p.monetization}</p>
              </div>
            )}
          </div>

          {/* Core features */}
          {p.core_features && p.core_features.length > 0 && (
            <div>
              <span className="text-xs font-medium text-foreground/70">{t("coreFeatures")}</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {p.core_features.map((f, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs
                               bg-surface-muted text-muted border border-border/50"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* All platforms (expanded view) */}
          {hasPulse && hiddenCount > 0 && (
            <div>
              <span className="text-xs font-medium text-foreground/70">
                {t("crossPlatform", { count: pulse!.source_count })}
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted">
                {pulse!.matched_items.map((item, idx) => (
                  <span key={idx} className="whitespace-nowrap">
                    <span className="font-medium text-foreground/70">{item.source}</span>
                    {" "}{fmtEng(item.engagement)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Discussion links */}
          {hasPulse && pulse!.matched_items.filter((item) => item.url).length > 0 && (
            <div>
              <span className="text-xs font-medium text-foreground/70">{t("discussionLinks")}</span>
              <div className="space-y-0.5 mt-1">
                {pulse!.matched_items
                  .filter((item) => item.url)
                  .map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-accent hover:opacity-70 transition-opacity truncate"
                    >
                      {item.title || item.url}
                    </a>
                  ))}
              </div>
            </div>
          )}

          {/* Source article */}
          {p.source_article && (
            <div className="text-xs">
              <span className="font-medium text-foreground/70">{t("sourceArticle")}: </span>
              {p.source_article_url ? (
                <a
                  href={p.source_article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:opacity-70 transition-opacity"
                >
                  {p.source_article}
                </a>
              ) : (
                <span className="text-muted">{p.source_article}</span>
              )}
              {p.source_article_source && (
                <span className="text-muted ml-1">
                  ({p.source_article_source}
                  {p.source_article_score != null && `, ${p.source_article_score}/10`})
                </span>
              )}
            </div>
          )}

          {/* Related trends */}
          {p.related_trends && p.related_trends.length > 0 && (
            <div>
              <span className="text-xs font-medium text-foreground/70">{t("relatedTrends")}</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {p.related_trends.map((tag, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs
                               bg-accent/10 text-accent font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
