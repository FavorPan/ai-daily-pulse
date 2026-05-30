"use client";

import { usePathname, useRouter } from "next/navigation";

export function DateSwitcher({ dates, locale }: { dates: string[]; locale?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  // Extract current date from pathname (e.g., /zh-CN/2026-05-29/ -> 2026-05-29)
  const segments = pathname.split("/").filter(Boolean);
  // segments: [locale, date?] or [locale, "item", date, id]
  const currentDate =
    segments.length >= 2 && segments[1] !== "item" && segments[1] !== "explore" && segments[1] !== "about"
      ? segments[1]
      : dates[0] ?? "";

  if (dates.length === 0) return null;

  const loc = locale ?? segments[0] ?? "zh-CN";

  return (
    <select
      className="bg-surface text-[13px] px-2.5 py-1.5 rounded-md border border-border text-foreground font-mono transition-colors cursor-pointer"
      value={currentDate}
      aria-label="Select date"
      onChange={(e) => {
        const d = e.target.value;
        router.push(`/${loc}/${d}/`);
      }}
    >
      {dates.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}
