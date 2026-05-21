"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

const THEMES = ["light", "dark", "system"] as const;

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="h-9 w-[7.5rem] rounded-lg bg-surface-muted border border-border" />
    );
  }

  return (
    <select
      className="bg-surface text-sm px-2 py-2 rounded-lg border border-border text-foreground max-w-[7.5rem]"
      value={theme ?? "system"}
      onChange={(e) => setTheme(e.target.value)}
      aria-label={t("label")}
    >
      {THEMES.map((value) => (
        <option key={value} value={value}>
          {t(value)}
        </option>
      ))}
    </select>
  );
}
