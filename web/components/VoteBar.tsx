"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { VoteCounts, VoteType } from "@/lib/types";
import { castVote } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Props = {
  ideaId: string;
  votes: VoteCounts;
  myVote: VoteType | null;
  onVoteChange: (ideaId: string, votes: VoteCounts, myVote: VoteType | null) => void;
  onAuthRequired: () => void;
};

const VOTE_OPTIONS: { type: VoteType; emoji: string; color: string }[] = [
  { type: "good", emoji: "👍", color: "bg-emerald-500" },
  { type: "maybe", emoji: "🤔", color: "bg-amber-500" },
  { type: "dont", emoji: "👎", color: "bg-red-400" },
];

export function VoteBar({ ideaId, votes, myVote, onVoteChange, onAuthRequired }: Props) {
  const t = useTranslations("insight");
  const { user } = useAuth();
  const [loading, setLoading] = useState<VoteType | null>(null);

  const handleVote = async (voteType: VoteType) => {
    if (!user) {
      onAuthRequired();
      return;
    }
    setLoading(voteType);
    try {
      const newVotes = await castVote(ideaId, voteType);
      onVoteChange(ideaId, newVotes, voteType);
    } catch {
      // Silently fail — keep optimistic state
    } finally {
      setLoading(null);
    }
  };

  const maxVotes = Math.max(votes.total, 1);

  return (
    <div className="space-y-2">
      {/* Buttons */}
      <div className="flex items-center gap-2">
        {VOTE_OPTIONS.map(({ type, emoji }) => (
          <button
            key={type}
            onClick={() => handleVote(type)}
            disabled={loading === type}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              myVote === type
                ? "bg-accent/10 text-accent ring-1 ring-accent/30"
                : "bg-surface-muted text-muted hover:text-foreground hover:bg-surface"
            } disabled:opacity-50`}
            aria-pressed={myVote === type}
            aria-label={t(`vote${type.charAt(0).toUpperCase() + type.slice(1)}`)}
          >
            <span className="text-base">{emoji}</span>
            <span className="tabular-nums text-xs">{votes[type]}</span>
          </button>
        ))}
        <span className="text-xs text-muted ml-auto tabular-nums">
          {t("voteTotal", { count: votes.total })}
        </span>
      </div>

      {/* Percentage bar */}
      <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-muted">
        <div
          className="bg-emerald-500 transition-all duration-300"
          style={{ width: `${(votes.good / maxVotes) * 100}%` }}
        />
        <div
          className="bg-amber-500 transition-all duration-300"
          style={{ width: `${(votes.maybe / maxVotes) * 100}%` }}
        />
        <div
          className="bg-red-400 transition-all duration-300"
          style={{ width: `${(votes.dont / maxVotes) * 100}%` }}
        />
      </div>
    </div>
  );
}
