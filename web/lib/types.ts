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
