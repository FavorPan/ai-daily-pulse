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
