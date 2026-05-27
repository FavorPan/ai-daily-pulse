"use client";

import { useState } from "react";

export function DateSwitcher({ dates }: { dates: string[] }) {
  const [current, setCurrent] = useState(dates[0] ?? "");

  if (dates.length === 0) return null;

  return (
    <select
      className="bg-surface text-[13px] px-2.5 py-1.5 rounded-md border border-border text-foreground font-mono transition-colors cursor-pointer"
      value={current}
      aria-label="Select date"
      onChange={(e) => setCurrent(e.target.value)}
    >
      {dates.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}
