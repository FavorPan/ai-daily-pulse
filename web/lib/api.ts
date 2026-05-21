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

function readDigest(date?: string): DailyDigest | null {
  const filePath = resolveDigestPath(date);
  if (!filePath) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as DailyDigest;
  } catch {
    return null;
  }
}

export async function getDaily(date?: string): Promise<DailyDigest> {
  const data = readDigest(date);
  if (data) return data;
  return MOCK_DIGEST;
}

export async function getItems(date?: string): Promise<DigestItem[]> {
  const data = await getDaily(date);
  return data.items;
}

export async function getItemsWithDate(date?: string): Promise<DigestItemWithDate[]> {
  const data = await getDaily(date);
  return data.items.map((item) => ({ ...item, digestDate: data.date }));
}

export async function getAllItems(): Promise<DigestItemWithDate[]> {
  const dates = listDigestDates();
  if (dates.length === 0) {
    const mock = await getDaily();
    return mock.items.map((item) => ({ ...item, digestDate: mock.date }));
  }

  const byId = new Map<string, DigestItemWithDate>();
  for (const digestDate of [...dates].reverse()) {
    const data = readDigest(digestDate);
    if (!data) continue;
    for (const item of data.items) {
      byId.set(item.id, { ...item, digestDate });
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    b.digestDate.localeCompare(a.digestDate)
  );
}

export async function getItem(id: string, date?: string): Promise<DigestItem | null> {
  if (date) {
    const items = await getItems(date);
    return items.find((item) => item.id === id) ?? null;
  }
  const all = await getAllItems();
  const found = all.find((item) => item.id === id);
  return found ?? null;
}

export function listDigestDates(): string[] {
  if (!fs.existsSync(OUTPUT_DIR)) return [];
  return fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.startsWith("digest-") && f.endsWith(".json"))
    .map((f) => f.replace("digest-", "").replace(".json", ""))
    .sort()
    .reverse();
}

export function isUsingMockData(date?: string): boolean {
  return readDigest(date) === null;
}
