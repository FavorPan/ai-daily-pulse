import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh-CN", "zh-TW", "en"],
  defaultLocale: "zh-CN",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
