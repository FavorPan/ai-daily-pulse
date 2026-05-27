"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useCallback, useState } from "react";

function SearchInput({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const t = useTranslations("search");
  const [value, setValue] = useState(initialQ);

  const submit = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim()) {
        params.set("q", q.trim());
      } else {
        params.delete("q");
      }
      const qs = params.toString();
      router.push(qs ? `/${locale}/explore?${qs}` : `/${locale}/explore`);
    },
    [router, searchParams, locale]
  );

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
          if (e.key === "Enter") submit(value);
        }}
        onBlur={() => submit(value)}
        aria-label={t("placeholder")}
      />
    </div>
  );
}

export function SearchBar() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  return <SearchInput key={initialQ} initialQ={initialQ} />;
}
