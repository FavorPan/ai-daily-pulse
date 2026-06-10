"use client";

import { usePathname, useRouter } from "next/navigation";

export function DateSwitcher({ dates, locale }: { dates: string[]; locale?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  // Extract current date and detect page type from pathname
  const segments = pathname.split("/").filter(Boolean);
  // segments examples:
  //   [locale]              -> home
  //   [locale, date]        -> date page
  //   [locale, "explore"]   -> explore (no date)
  //   [locale, "explore", date] -> explore with date
  //   [locale, "item", date, id] -> item detail

  const isExplore = segments[1] === "explore";
  const isBuilder = segments[1] === "builder";

  // Current date: for explore/builder pages it's segments[2], for others it's segments[1]
  const currentDate =
    isExplore || isBuilder
      ? (segments.length >= 3 ? segments[2] : dates[0] ?? "")
      : segments.length >= 2 && segments[1] !== "item" && segments[1] !== "about"
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
        if (isExplore) {
          router.push(`/${loc}/explore/${d}/`);
        } else if (isBuilder) {
          router.push(`/${loc}/builder/${d}/`);
        } else {
          router.push(`/${loc}/${d}/`);
        }
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
