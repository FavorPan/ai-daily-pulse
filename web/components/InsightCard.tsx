"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { InsightIdea, VoteCounts, VoteType } from "@/lib/types";
import { VoteBar } from "./VoteBar";

type Props = {
  idea: InsightIdea;
  index: number;
  onVoteChange: (ideaId: string, votes: VoteCounts, myVote: VoteType | null) => void;
  onAuthRequired: () => void;
};

export function InsightCard({ idea, index, onVoteChange, onAuthRequired }: Props) {
  const t = useTranslations("insight");
  const locale = useLocale();
  const isEn = locale === "en";
  const [expanded, setExpanded] = useState(false);

  const displayName = isEn ? (idea.name_en || idea.name) : idea.name;
  const displayDescription = isEn ? (idea.description_en || idea.description) : idea.description;
  const displayWhyNow = isEn ? (idea.why_now_en || idea.why_now) : idea.why_now;
  const displayTargetUser = isEn ? (idea.target_user_en || idea.target_user) : idea.target_user;
  const displayMonetization = isEn ? (idea.monetization_en || idea.monetization) : idea.monetization;
  const displayCoreFeatures = isEn ? (idea.core_features_en || idea.core_features) : idea.core_features;
  const displayRelatedTrends = isEn ? (idea.related_trends_en || idea.related_trends) : idea.related_trends;

  const difficultyLabel = idea.difficulty
    ? t(`difficulty${idea.difficulty.charAt(0).toUpperCase() + idea.difficulty.slice(1)}`)
    : idea.difficulty;

  const hasDetails =
    (displayCoreFeatures && displayCoreFeatures.length > 0) ||
    idea.source_article ||
    (displayRelatedTrends && displayRelatedTrends.length > 0) ||
    displayTargetUser ||
    displayMonetization;

  return (
    <article
      className="border border-border animate-slide-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
    >
      <div className="p-5">
        {/* Row 1: name + meta */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-mono text-muted tabular-nums shrink-0">
              #{String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-semibold text-[15px] leading-snug text-foreground truncate">
              {displayName}
            </h3>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs text-muted">
              {difficultyLabel}
            </span>
            {idea.estimated_mvp_days != null && (
              <>
                <span className="w-px h-3 bg-border" />
                <span className="text-xs text-muted font-mono tabular-nums">
                  {t("mvpDays", { days: idea.estimated_mvp_days })}
                </span>
              </>
            )}
            <span className="w-px h-3 bg-border" />
            <span className="text-xs text-muted font-mono">{idea.date}</span>
          </div>
        </div>

        {/* Row 2: description */}
        <p className="text-sm text-muted leading-relaxed mb-3">
          {displayDescription}
        </p>

        {/* Row 3: Why Now */}
        {displayWhyNow && (
          <div className="border-l-2 border-accent/40 pl-3 mb-3">
            <p className="text-sm text-foreground/80 leading-relaxed">
              <span className="font-semibold text-accent">{t("whyNow")}</span>
              {" "}{displayWhyNow}
            </p>
          </div>
        )}

        {/* Row 4: Vote bar */}
        <VoteBar
          ideaId={idea.id}
          votes={idea.votes}
          myVote={idea.my_vote}
          onVoteChange={onVoteChange}
          onAuthRequired={onAuthRequired}
        />

        {/* Expand toggle */}
        {hasDetails && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors mt-3"
            aria-expanded={expanded}
          >
            <span>{expanded ? t("collapse") : t("expand")}</span>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="border-t border-border px-5 py-4 space-y-3 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {displayTargetUser && (
              <div>
                <span className="text-xs font-medium text-foreground/70">{t("targetUser")}</span>
                <p className="text-xs text-muted mt-0.5">{displayTargetUser}</p>
              </div>
            )}
            {displayMonetization && (
              <div>
                <span className="text-xs font-medium text-foreground/70">{t("monetization")}</span>
                <p className="text-xs text-muted mt-0.5">{displayMonetization}</p>
              </div>
            )}
          </div>

          {displayCoreFeatures && displayCoreFeatures.length > 0 && (
            <div>
              <span className="text-xs font-medium text-foreground/70">{t("coreFeatures")}</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {displayCoreFeatures.map((f, j) => (
                  <span key={j} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-surface-muted text-muted border border-border/50">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {idea.source_article && (
            <div className="text-xs">
              <span className="font-medium text-foreground/70">{t("sourceArticle")}: </span>
              {idea.source_article_url ? (
                <a href={idea.source_article_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:opacity-70 transition-opacity">
                  {idea.source_article}
                </a>
              ) : (
                <span className="text-muted">{idea.source_article}</span>
              )}
              {idea.source_article_source && (
                <span className="text-muted ml-1">
                  ({idea.source_article_source}
                  {idea.source_article_score != null && `, ${idea.source_article_score}/10`})
                </span>
              )}
            </div>
          )}

          {displayRelatedTrends && displayRelatedTrends.length > 0 && (
            <div>
              <span className="text-xs font-medium text-foreground/70">{t("relatedTrends")}</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {displayRelatedTrends.map((tag, j) => (
                  <span key={j} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-accent/10 text-accent font-medium">
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
