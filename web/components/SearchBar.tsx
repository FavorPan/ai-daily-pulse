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
    <input
      className="bg-surface px-4 py-2 rounded-lg text-sm w-full max-w-xs border border-border text-foreground placeholder:text-muted"
      placeholder={t("placeholder")}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit(value);
      }}
      onBlur={() => submit(value)}
    />
  );
}

export function SearchBar() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  return <SearchInput key={initialQ} initialQ={initialQ} />;
}
