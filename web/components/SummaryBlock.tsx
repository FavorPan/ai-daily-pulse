import { Tag } from "./Tag";
import type { DigestItem } from "@/lib/types";

export function SummaryBlock({ item }: { item: DigestItem }) {
  return (
    <div className="bg-[#1A1D24] p-6 rounded-2xl space-y-5">
      <div>
        <div className="text-sm text-gray-400 mb-1">摘要</div>
        <div className="leading-relaxed">{item.summary || "暂无摘要"}</div>
      </div>
      <div>
        <div className="text-sm text-gray-400 mb-1">主题</div>
        <Tag label={item.topic} />
      </div>
      <div>
        <div className="text-sm text-gray-400 mb-1">评分</div>
        <div>{item.score}/10</div>
      </div>
      {item.tags.length > 0 && (
        <div>
          <div className="text-sm text-gray-400 mb-2">标签</div>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-1 rounded bg-[#2A2F3A] text-gray-300">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="text-sm text-gray-400 mb-1">来源</div>
        <div>{item.source}</div>
      </div>
      <div>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
        >
          阅读原文 ↗
        </a>
      </div>
    </div>
  );
}
