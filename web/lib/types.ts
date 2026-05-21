export type DigestItem = {
  id: string;
  title: string;
  summary: string;
  score: number;
  topic: string;
  source: string;
  url: string;
  tags: string[];
};

export type DigestItemWithDate = DigestItem & {
  digestDate: string;
};

export type DailyDigest = {
  date: string;
  highlights: string[];
  items: DigestItem[];
};
