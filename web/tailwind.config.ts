import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        border: "var(--border)",
        accent: "var(--accent)",
        "accent-muted": "var(--accent-muted)",
        "accent-secondary": "var(--accent-secondary)",
        muted: "var(--muted)",
      },
      boxShadow: {
        "glow-sm": "0 0 20px var(--glow)",
        "glow-md": "0 0 32px var(--glow)",
      },
    },
  },
  plugins: [],
};
export default config;
