"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function DateSwitcher({ dates }: { dates: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("date") ?? dates[0] ?? "";

  if (dates.length === 0) return null;

  return (
    <select
      className="bg-[#1A1D24] text-sm px-3 py-2 rounded-lg border border-[#2A2F3A] text-gray-300"
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) {
          params.set("date", e.target.value);
        } else {
          params.delete("date");
        }
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
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
