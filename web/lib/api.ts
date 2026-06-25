import fs from "fs";
import path from "path";
import type { DailyDigest, DigestItem, DigestItemWithDate } from "./types";

const OUTPUT_DIR = path.join(process.cwd(), "..", "output");

const MOCK_DIGEST: DailyDigest = {
  date: "2026-05-21",
  highlights: [
    "Agent进入自动执行阶段",
    "AI视频成本下降",
    "开源模型爆发",
  ],
  items: [
    {
      id: "mock1",
      title: "AutoAgent",
      summary: "一个自动执行复杂任务的Agent框架",
      score: 8,
      topic: "AI工具实操/Agent工作流",
      source: "GitHub",
      url: "https://github.com/example/autoagent",
      tags: ["Agent", "开源"],
    },
    {
      id: "mock2",
      title: "VideoGenX",
      summary: "低成本AI视频生成模型",
      score: 7,
      topic: "AI新技术/新模型",
      source: "GitHub",
      url: "https://github.com/example/videogenx",
      tags: ["Video", "多模态"],
    },
  ],
};

function resolveDigestPath(date?: string): string | null {
  if (date) {
    const dated = path.join(OUTPUT_DIR, `digest-${date}.json`);
    if (fs.existsSync(dated)) return dated;
    return null;
  }

  const envDate = process.env.DIGEST_DATE;
  if (envDate) {
    const dated = path.join(OUTPUT_DIR, `digest-${envDate}.json`);
    if (fs.existsSync(dated)) return dated;
  }

  const latest = path.join(OUTPUT_DIR, "latest.json");
  if (fs.existsSync(latest)) return latest;

  if (!fs.existsSync(OUTPUT_DIR)) return null;
  const files = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.startsWith("digest-") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  return path.join(OUTPUT_DIR, files[0]);
}

function readDigest(filePath: string): DailyDigest {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/** Returns all available digest dates (sorted newest first). */
export function listDigestDates(): string[] {
  if (!fs.existsSync(OUTPUT_DIR)) return [];
  return fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.startsWith("digest-") && f.endsWith(".json"))
    .map((f) => {
      const date = f.replace("digest-", "").replace(".json", "");
      try {
        const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, f), "utf-8"));
        if (!data.items || data.items.length === 0) return null;
      } catch {
        return null;
      }
      return date;
    })
    .filter((d): d is string => d !== null)
    .sort()
    .reverse();
}

/** Returns true if we're using mock data (no real output files). */
export function isUsingMockData(date?: string): boolean {
  return resolveDigestPath(date) === null;
}

/** Get daily digest for a given date (or latest). */
export async function getDaily(date?: string): Promise<DailyDigest> {
  const filePath = resolveDigestPath(date);
  if (!filePath) return MOCK_DIGEST;
  return readDigest(filePath);
}

/** Get a single item by ID across all digests (or a specific date). */
export async function getItem(
  id: string,
  date?: string
): Promise<DigestItem | null> {
  if (date) {
    const digest = await getDaily(date);
    return digest.items.find((i) => i.id === id) ?? null;
  }

  // Search across all dates
  const dates = listDigestDates();
  for (const d of dates) {
    const digest = await getDaily(d);
    const item = digest.items.find((i) => i.id === id);
    if (item) return item;
  }
  return null;
}

/** Get all items for a specific date (or latest). */
export async function getItemsWithDate(
  date?: string
): Promise<DigestItemWithDate[]> {
  const digest = await getDaily(date);
  return digest.items.map((item) => ({ ...item, digestDate: digest.date }));
}

/** Get ALL items across all dates (for global search). */
export async function getAllItems(): Promise<DigestItemWithDate[]> {
  const dates = listDigestDates();
  const all: DigestItemWithDate[] = [];
  for (const d of dates) {
    const digest = await getDaily(d);
    for (const item of digest.items) {
      all.push({ ...item, digestDate: digest.date });
    }
  }
  return all;
}

/** Get (date, id) pairs for static generation / sitemap.
 *  maxDays defaults to 1 (one day of static pages for output:export).
 *  Pass 0 for all dates (used by sitemap). */
export function getAllItemParams(maxDays = 1): { date: string; id: string }[] {
  const allDates = listDigestDates();
  const dates = maxDays > 0 ? allDates.slice(0, maxDays) : allDates;
  const params: { date: string; id: string }[] = [];
  for (const d of dates) {
    const filePath = resolveDigestPath(d);
    if (!filePath) continue;
    const digest = readDigest(filePath);
    for (const item of digest.items) {
      params.push({ date: d, id: item.id });
    }
  }
  return params;
}