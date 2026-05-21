"use client";

import Link from "next/link";
import { Tag } from "./Tag";
import type { DigestItem } from "@/lib/types";

export function ProjectCard({ item }: { item: DigestItem }) {
  return (
    <div className="bg-[#1A1D24] p-4 rounded-2xl hover:scale-[1.02] transition group h-full flex flex-col">
      <div className="flex justify-between items-start gap-2 mb-2">
        <Link href={`/item/${item.id}`} className="font-semibold hover:text-purple-300 line-clamp-2">
          {item.title}
        </Link>
        <Tag label={item.topic} />
      </div>

      <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-1">{item.summary}</p>

      <div className="text-xs text-gray-500 flex justify-between items-center">
        <span>{item.score}/10</span>
        <span className="truncate ml-2">{item.source}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-purple-400 hover:text-purple-300 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          原文 ↗
        </a>
      </div>
    </div>
  );
}
