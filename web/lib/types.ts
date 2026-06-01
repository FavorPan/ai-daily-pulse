export type DigestItem = {
  id: string;
  title: string;
  summary: string;
  score: number;
  topic: string;
  source: string;
  url: string;
  tags: string[];
  why_now?: string;
  trend_signal?: boolean;
  trend_topic?: string;
  trend_source_count?: number;
};

export type DigestItemWithDate = DigestItem & {
  digestDate: string;
};

export type DailyDigest = {
  date: string;
  highlights: string[];
  items: DigestItem[];
};
