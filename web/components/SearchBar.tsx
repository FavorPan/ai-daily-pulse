"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

function SearchInput({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      router.push(qs ? `/explore?${qs}` : "/explore");
    },
    [router, searchParams]
  );

  return (
    <input
      className="bg-[#1A1D24] px-4 py-2 rounded-lg text-sm w-full max-w-xs"
      placeholder="搜索标题、摘要、标签..."
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
