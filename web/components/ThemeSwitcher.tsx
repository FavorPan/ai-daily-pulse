"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

const THEMES = ["light", "dark", "system"] as const;

const ICONS: Record<string, React.ReactNode> = {
  light: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  dark: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  system: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
};

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return <div className="w-8 h-8 rounded-md bg-surface-muted border border-border" />;
  }

  // Cycle through themes on click
  const next = () => {
    const idx = THEMES.indexOf((theme ?? "system") as (typeof THEMES)[number]);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  return (
    <button
      type="button"
      onClick={next}
      className="w-8 h-8 rounded-md border border-border bg-surface text-muted hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center"
      aria-label={`Theme: ${theme}`}
      title={`Theme: ${theme}`}
    >
      {ICONS[theme ?? "system"] ?? ICONS.system}
    </button>
  );
}
