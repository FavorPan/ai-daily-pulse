import type { InsightIdea, VoteType, VoteCounts, AuthUser } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.ai-daily-pulse.top";

export async function fetchIdeas(): Promise<InsightIdea[]> {
  const res = await fetch(`${API_BASE}/api/ideas`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch ideas: ${res.status}`);
  const data = await res.json();
  return data.ideas;
}

export async function castVote(
  ideaId: string,
  voteType: VoteType
): Promise<VoteCounts> {
  const res = await fetch(`${API_BASE}/api/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idea_id: ideaId, vote_type: voteType }),
  });
  if (!res.ok) throw new Error(`Failed to vote: ${res.status}`);
  const data = await res.json();
  return data.votes;
}

export async function removeVote(ideaId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/vote/${ideaId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to remove vote: ${res.status}`);
}

export async function fetchMyVotes(): Promise<{ idea_id: string; vote_type: VoteType }[]> {
  const res = await fetch(`${API_BASE}/api/my-votes`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.votes;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
