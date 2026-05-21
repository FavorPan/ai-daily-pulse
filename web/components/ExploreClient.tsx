"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProjectCard } from "./ProjectCard";
import { TOPIC_ORDER } from "@/lib/topics";
import type { DigestItem } from "@/lib/types";

export function ExploreClient({ items }: { items: DigestItem[] }) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();
  const [topic, setTopic] = useState<string>("全部");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (topic !== "全部" && item.topic !== topic) return false;
      if (!q) return true;
      const haystack = [
        item.title,
        item.summary,
        item.source,
        item.topic,
        ...item.tags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, topic, q]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-[#1A1D24] p-4 rounded-xl space-y-2 sticky top-6">
          <div className="text-sm font-medium text-gray-300 mb-3">主题筛选</div>
          {["全部", ...TOPIC_ORDER].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition ${
                topic === t
                  ? "bg-purple-600/30 text-white"
                  : "text-gray-400 hover:bg-[#2A2F3A] hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
          {q && (
            <p className="text-xs text-gray-500 pt-2 border-t border-[#2A2F3A] mt-3">
              搜索：{q}
            </p>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        {filtered.length === 0 ? (
          <p className="text-gray-500">没有匹配的文章。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => (
              <ProjectCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
