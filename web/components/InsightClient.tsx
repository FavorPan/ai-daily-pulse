"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { InsightIdea, VoteCounts, VoteType } from "@/lib/types";
import { fetchIdeas } from "@/lib/api";
import { InsightCard } from "./InsightCard";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/lib/auth";

type SortKey = "votes_good" | "votes_total" | "date_newest" | "difficulty";

const SORT_OPTIONS: { key: SortKey; labelKey: string }[] = [
  { key: "votes_good", labelKey: "sortVotesGood" },
  { key: "votes_total", labelKey: "sortVotesTotal" },
  { key: "date_newest", labelKey: "sortDateNewest" },
  { key: "difficulty", labelKey: "sortDifficulty" },
];

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"] as const;

export function InsightClient() {
  const t = useTranslations("insight");
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<InsightIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortKey>("votes_good");
  const [difficultyFilter, setDifficultyFilter] = useState<Set<string>>(new Set());
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    fetchIdeas()
      .then(setIdeas)
      .catch(() => setError(t("loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  const handleVoteChange = useCallback(
    (ideaId: string, votes: VoteCounts, myVote: VoteType | null) => {
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId ? { ...idea, votes, my_vote: myVote } : idea
        )
      );
    },
    []
  );

  const filtered = useMemo(() => {
    return ideas
      .filter((idea) => {
        if (difficultyFilter.size > 0 && idea.difficulty && !difficultyFilter.has(idea.difficulty))
          return false;
        if (dateStart && idea.date < dateStart) return false;
        if (dateEnd && idea.date > dateEnd) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sort) {
          case "votes_good":
            return b.votes.good - a.votes.good || b.votes.total - a.votes.total;
          case "votes_total":
            return b.votes.total - a.votes.total;
          case "date_newest":
            return b.date.localeCompare(a.date);
          case "difficulty": {
            const order = { easy: 0, medium: 1, hard: 2 };
            return (order[a.difficulty as keyof typeof order] ?? 3) - (order[b.difficulty as keyof typeof order] ?? 3);
          }
          default:
            return 0;
        }
      });
  }, [ideas, sort, difficultyFilter, dateStart, dateEnd]);

  const toggleDifficulty = (d: string) => {
    setDifficultyFilter((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const allDates = useMemo(() => {
    const dates = [...new Set(ideas.map((i) => i.date))].sort().reverse();
    return dates;
  }, [ideas]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-muted text-sm">{t("loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Left sidebar: filters */}
      <aside className="w-full md:w-48 shrink-0">
        <h1 className="text-headline mb-1">{t("title")}</h1>
        <p className="text-sm text-muted mb-4">{t("subtitle")}</p>

        {/* Sort */}
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-3">
          {t("sortLabel")}
        </h3>
        <div className="space-y-1 mb-6">
          {SORT_OPTIONS.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                sort === key
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-muted hover:text-foreground hover:bg-surface-muted"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Difficulty filter */}
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-3">
          {t("difficultyFilter")}
        </h3>
        <div className="space-y-1 mb-6">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => toggleDifficulty(d)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                difficultyFilter.has(d)
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-muted hover:text-foreground hover:bg-surface-muted"
              }`}
            >
              {t(`difficulty${d.charAt(0).toUpperCase() + d.slice(1)}`)}
            </button>
          ))}
        </div>

        {/* Date range filter */}
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-3">
          {t("dateFilter")}
        </h3>
        <div className="space-y-2">
          <select
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-border bg-surface text-xs text-foreground"
          >
            <option value="">{t("dateFrom")}</option>
            {allDates.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-border bg-surface text-xs text-foreground"
          >
            <option value="">{t("dateTo")}</option>
            {allDates.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* User info */}
        {user && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted truncate">{user.email}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Right: ideas */}
      <div className="flex-1 min-w-0">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted">
              {t("ideaCount", { count: filtered.length })}
            </p>
            {filtered.map((idea, i) => (
              <InsightCard
                key={idea.id}
                idea={idea}
                index={i}
                onVoteChange={handleVoteChange}
                onAuthRequired={() => setAuthOpen(true)}
              />
            ))}
          </div>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
