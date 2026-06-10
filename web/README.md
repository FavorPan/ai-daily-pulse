# AI Daily Pulse - Web Frontend

Next.js 16 static export frontend for [AI Daily Pulse](https://ai-daily-pulse.top).

## Pages

| Route | Description |
|-------|-------------|
| `/` | Auto-redirect to `/zh-CN/` |
| `/[locale]/` | Home: today's pulse + featured articles |
| `/[locale]/builder/` | Builder: collapsible project cards with community heat |
| `/[locale]/builder/[date]/` | Builder for a specific date |
| `/[locale]/explore/` | All articles with topic filter + search |
| `/[locale]/explore/[date]/` | Explore for a specific date |
| `/[locale]/item/[date]/[id]/` | Single article detail |
| `/[locale]/about/` | About page |

## Tech Stack

- **Next.js 16** + React 19 + TypeScript
- **Tailwind CSS 3** with CSS variable theming (light/dark)
- **next-intl** for i18n (zh-CN / zh-TW / en)
- **next-themes** for dark mode toggle
- **Static export** (`output: "export"`) for Cloudflare Pages

## Development

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app reads digest JSON from `../output/`. Make sure you've run `python main.py` at least once, or the repo already contains `output/latest.json`.

## Build

```bash
npm run build
```

Output goes to `web/out/`.

## Deployment

Deployed to Cloudflare Pages at [ai-daily-pulse.top](https://ai-daily-pulse.top):

- Build command: `cd web && npm install && npm run build`
- Output directory: `web/out`
- Environment: `NODE_VERSION=20`, `SKIP_DEPENDENCY_INSTALL=true`
