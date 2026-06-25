"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { VoteCounts, VoteType } from "@/lib/types";
import { castVote } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";

type Props = {
  ideaId: string;
  votes: VoteCounts;
  myVote: VoteType | null;
  onVoteChange: (ideaId: string, votes: VoteCounts, myVote: VoteType | null) => void;
  onAuthRequired: () => void;
};

const ThumbsUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
);

const MinusCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8" />
  </svg>
);

const ThumbsDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 14V2" />
    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
  </svg>
);

const VOTE_OPTIONS: { type: VoteType; icon: React.ReactNode; color: string }[] = [
  { type: "good", icon: <ThumbsUpIcon />, color: "bg-emerald-500" },
  { type: "maybe", icon: <MinusCircleIcon />, color: "bg-amber-500" },
  { type: "dont", icon: <ThumbsDownIcon />, color: "bg-red-400" },
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
        {VOTE_OPTIONS.map(({ type, icon }) => (
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
            {icon}
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
