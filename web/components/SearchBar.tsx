"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("search");
  const [value, setValue] = useState("");

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        className="bg-surface pl-9 pr-3 py-1.5 rounded-md text-[13px] w-full sm:w-48 border border-border text-foreground placeholder:text-muted transition-colors"
        placeholder={t("placeholder")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            router.push(`/${locale}/explore/#q=${encodeURIComponent(value.trim())}`);
            setValue("");
          }
        }}
        aria-label={t("placeholder")}
      />
    </div>
  );
}
