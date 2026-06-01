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

export type BuildDirection = {
  direction: string;
  why_now: string;
  evidence: string[];
  difficulty: "easy" | "medium" | "hard";
  monetization: string;
};

export type DigestItemWithDate = DigestItem & {
  digestDate: string;
};

export type DailyDigest = {
  date: string;
  highlights: string[];
  items: DigestItem[];
  directions?: BuildDirection[];
  social_post?: { zh?: string; en?: string };
  x_thread?: string[];
};
