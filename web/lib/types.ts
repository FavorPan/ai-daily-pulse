export type DigestItem = {
  id: string;
  title: string;
  summary: string;
  summary_en?: string;
  score: number;
  topic: string;
  source: string;
  url: string;
  tags: string[];
  why_now?: string;
  trend_signal?: boolean;
  trend_topic?: string;
  trend_source_count?: number;
  trend_confidence?: "high" | "medium" | "low" | "";
};

export type BuildProject = {
  name: string;
  description: string;
  target_user: string;
  core_features: string[];
  related_trends: string[];
  why_now: string;
  monetization: string;
  difficulty: "easy" | "medium" | "hard";
  estimated_mvp_days?: number;
  social_pulse?: {
    total_engagement: number;
    source_count: number;
    community_sources: string[];
    matched_items: Array<{
      source: string;
      title: string;
      url: string;
      engagement: Record<string, number>;
    }>;
  };
  source_article?: string;
  source_article_url?: string;
  source_article_score?: number;
  source_article_source?: string;
};

export type DigestItemWithDate = DigestItem & {
  digestDate: string;
};

export type DailyDigest = {
  date: string;
  highlights: string[];
  items: DigestItem[];
  directions?: BuildProject[];
  social_post?: { zh?: string; en?: string };
  x_thread?: string[];
};

export type VoteType = "good" | "maybe" | "dont";

export type VoteCounts = {
  good: number;
  maybe: number;
  dont: number;
  total: number;
};

export type InsightIdea = {
  id: string;
  date: string;
  name: string;
  name_zh: string;
  name_en: string | null;
  description: string | null;
  description_zh: string | null;
  description_en: string | null;
  target_user: string | null;
  target_user_zh: string | null;
  target_user_en: string | null;
  core_features: string[];
  core_features_zh: string[];
  core_features_en: string[] | null;
  related_trends: string[];
  related_trends_zh: string[];
  related_trends_en: string[] | null;
  why_now: string | null;
  why_now_zh: string | null;
  why_now_en: string | null;
  monetization: string | null;
  monetization_zh: string | null;
  monetization_en: string | null;
  difficulty: string | null;
  estimated_mvp_days: number | null;
  source_article: string | null;
  source_article_url: string | null;
  source_article_score: number | null;
  source_article_source: string | null;
  social_pulse: BuildProject["social_pulse"] | null;
  votes: VoteCounts;
  my_vote: VoteType | null;
};

export type AuthUser = {
  sub: string;
  email: string;
  name: string | null;
};
