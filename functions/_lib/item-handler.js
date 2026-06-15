/**
 * Shared item page handler for Cloudflare Pages Functions.
 *
 * Fetches digest JSON from static assets, finds the requested article,
 * and returns a complete HTML page with inline CSS and full SEO metadata.
 */

// ---------------------------------------------------------------------------
// Translations (3 locales)
// ---------------------------------------------------------------------------
const T = {
  "zh-CN": {
    siteName: "AI Daily Pulse",
    home: "今日",
    back: "← 返回全部文章",
    summary: "摘要",
    noSummary: "暂无摘要",
    whyNow: "AI 评语",
    topic: "主题",
    score: "评分",
    tags: "标签",
    source: "来源",
    readOriginal: "阅读原文 ↗",
    notFound: "文章未找到",
    backToHome: "返回首页",
    allArticles: "全部文章",
  },
  "zh-TW": {
    siteName: "AI Daily Pulse",
    home: "今日",
    back: "← 返回全部文章",
    summary: "摘要",
    noSummary: "暫無摘要",
    whyNow: "AI 評語",
    topic: "主題",
    score: "評分",
    tags: "標籤",
    source: "來源",
    readOriginal: "閱讀原文 ↗",
    notFound: "文章未找到",
    backToHome: "返回首頁",
    allArticles: "全部文章",
  },
  en: {
    siteName: "AI Daily Pulse",
    home: "Today",
    back: "← Back to all articles",
    summary: "Summary",
    noSummary: "No summary",
    whyNow: "AI Insight",
    topic: "Topic",
    score: "Score",
    tags: "Tags",
    source: "Source",
    readOriginal: "Read original ↗",
    notFound: "Article not found",
    backToHome: "Back to home",
    allArticles: "All articles",
  },
};

// ---------------------------------------------------------------------------
// Topic label translations
// ---------------------------------------------------------------------------
const TOPIC_LABELS = {
  "OPC/AI赚钱案例": {
    "zh-CN": "OPC/AI赚钱案例",
    "zh-TW": "OPC/AI賺錢案例",
    en: "OPC / AI Monetization",
  },
  "AI+电商": {
    "zh-CN": "AI+电商",
    "zh-TW": "AI+電商",
    en: "AI + E-commerce",
  },
  "AI工具实操/Agent工作流": {
    "zh-CN": "AI工具实操/Agent工作流",
    "zh-TW": "AI工具實操/Agent工作流",
    en: "AI Tools & Agent Workflows",
  },
  "AI新技术/新模型": {
    "zh-CN": "AI新技术/新模型",
    "zh-TW": "AI新技術/新模型",
    en: "AI Tech & New Models",
  },
  "AI投融资动态": {
    "zh-CN": "AI投融资动态",
    "zh-TW": "AI投融資動態",
    en: "AI Funding & M&A",
  },
  "AI对行业的冲击": {
    "zh-CN": "AI对行业的冲击",
    "zh-TW": "AI對行業的衝擊",
    en: "AI Industry Impact",
  },
};

function getTopicLabel(topic, locale) {
  return TOPIC_LABELS[topic]?.[locale] || topic;
}

// ---------------------------------------------------------------------------
// Inline CSS (matches main site design, supports light/dark)
// ---------------------------------------------------------------------------
const CSS = `
:root {
  --bg: #fafafa;
  --fg: #18181b;
  --surface: #ffffff;
  --surface-muted: #f4f4f5;
  --border: #e4e4e7;
  --accent: #2563eb;
  --accent-muted: #3b82f6;
  --muted: #71717a;
  --highlight: #eff6ff;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #18181b;
    --fg: #fafafa;
    --surface: #222225;
    --surface-muted: #2e2e32;
    --border: #333336;
    --accent: #3b82f6;
    --accent-muted: #60a5fa;
    --muted: #a1a1aa;
    --highlight: #172554;
  }
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;-moz-tab-size:4;tab-size:4}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:var(--bg);color:var(--fg);line-height:1.6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
a{color:inherit;text-decoration:none}
a:hover{color:var(--accent)}

/* Header */
.site-header{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 80%,transparent);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
.header-inner{display:flex;align-items:center;justify-content:space-between;height:56px;padding:0 16px;max-width:1152px;margin:0 auto}
@media(min-width:768px){.header-inner{padding:0 32px}}
.header-brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;letter-spacing:-0.01em}
.header-brand img{width:32px;height:32px;border-radius:8px}
.header-brand span{display:none}
@media(min-width:640px){.header-brand span{display:inline}}
.header-nav{display:flex;align-items:center;gap:4px;font-size:13px;color:var(--muted)}
.header-nav a{padding:6px 10px;border-radius:6px;transition:color .15s,background-color .15s}
.header-nav a:hover{color:var(--fg);background:var(--surface-muted)}

/* Main */
.site-main{flex:1;padding:32px 16px}
@media(min-width:768px){.site-main{padding:32px}}
.container{max-width:672px;margin:0 auto}

/* Breadcrumb */
.breadcrumb{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);font-family:ui-monospace,'SF Mono','Cascadia Code','Source Code Pro',Menlo,monospace;margin-bottom:24px}
.breadcrumb a{color:var(--muted)}
.breadcrumb a:hover{color:var(--fg)}
.breadcrumb .sep{color:var(--border)}
.breadcrumb .current{color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}

/* Back link */
.back-link{display:inline-block;font-size:14px;color:var(--muted);margin-bottom:12px}
.back-link:hover{color:var(--fg)}

/* Title */
.page-title{font-size:1.75rem;font-weight:700;line-height:1.2;letter-spacing:-0.02em;margin-bottom:24px}

/* Sections */
.section{margin-bottom:24px}
.section-label{font-size:12px;font-weight:500;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
.section-text{font-size:15px;line-height:1.7;color:var(--fg)}
.section-text-accent{font-size:14px;line-height:1.7;color:var(--accent)}

/* Meta row */
.meta-row{display:flex;flex-wrap:wrap;gap:24px;margin-bottom:24px}

/* Topic tag */
.topic-tag{display:inline-flex;align-items:center;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:500;border:1px solid #bfdbfe;background:#eff6ff;color:#2563eb;white-space:nowrap}
@media(prefers-color-scheme:dark){.topic-tag{background:rgba(37,99,235,.12);color:#93c5fd;border-color:rgba(37,99,235,.25)}}

/* Score */
.score{display:inline-flex;align-items:center;gap:4px;font-family:ui-monospace,'SF Mono','Cascadia Code','Source Code Pro',Menlo,monospace;font-size:18px;font-weight:600;color:var(--accent)}
.score .star{font-size:16px}

/* Source */
.source-name{font-size:14px;color:var(--fg)}

/* Tags */
.tag-list{display:flex;flex-wrap:wrap;gap:8px}
.tag-item{font-size:12px;padding:4px 10px;border-radius:6px;background:var(--surface-muted);color:var(--muted);border:1px solid var(--border);font-family:ui-monospace,'SF Mono','Cascadia Code','Source Code Pro',Menlo,monospace}

/* CTA */
.cta-link{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;background:var(--fg);color:var(--bg);font-size:14px;font-weight:500;margin-top:8px;transition:opacity .15s}
.cta-link:hover{opacity:.9;color:var(--bg)}

/* Footer */
.site-footer{border-top:1px solid var(--border);padding:24px 16px;text-align:center;font-size:12px;color:var(--muted)}
@media(min-width:768px){.site-footer{padding:24px 32px}}

/* 404 */
.not-found{text-align:center;padding:64px 0}
.not-found h1{font-size:1.5rem;font-weight:700;margin-bottom:12px}
.not-found p{color:var(--muted);margin-bottom:24px}
.not-found a{display:inline-block;padding:10px 20px;border-radius:10px;background:var(--fg);color:var(--bg);font-size:14px;font-weight:500}
`;

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------
function esc(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Page renderer
// ---------------------------------------------------------------------------
function renderPage(item, locale, date) {
  const t = T[locale] || T["zh-CN"];
  const siteUrl = "https://ai-daily-pulse.top";
  const pageUrl = `${siteUrl}/${locale}/item/${date}/${item.id}/`;
  const homeUrl = `/${locale}/`;
  const dateUrl = `/${locale}/${date}/`;

  // Description for meta tags
  const summaryText = (locale === "en" && item.summary_en) || item.summary || "";
  const desc = summaryText.length > 160 ? summaryText.slice(0, 157) + "..." : summaryText;

  // Tags
  const rawTags = item.tags;
  const tags = Array.isArray(rawTags) ? rawTags : typeof rawTags === "string" ? rawTags.split(",").map((s) => s.trim()) : [];

  // Locale alternates
  const altLocales = [
    { code: "zh-CN", hreflang: "zh-CN" },
    { code: "zh-TW", hreflang: "zh-TW" },
    { code: "en", hreflang: "en" },
  ];

  const alternates = altLocales
    .map(
      (l) =>
        `<link rel="alternate" hreflang="${l.hreflang}" href="${siteUrl}/${l.code}/item/${date}/${item.id}/">`
    )
    .join("\n    ");

  // OG article tags
  const ogTags = tags
    .map((tag) => `    <meta property="article:tag" content="${esc(tag)}">`)
    .join("\n");

  // Tag pills
  const tagPills =
    tags.length > 0
      ? `
        <div class="section">
          <div class="section-label">${t.tags}</div>
          <div class="tag-list">
            ${tags.map((tag) => `<span class="tag-item">#${esc(tag)}</span>`).join("\n            ")}
          </div>
        </div>`
      : "";

  // Why now section
  const whyNowSection = item.why_now
    ? `
        <div class="section">
          <div class="section-label">${t.whyNow}</div>
          <div class="section-text-accent">${esc(item.why_now)}</div>
        </div>`
    : "";

  // Display summary: use summary_en for en locale if available
  const displaySummary = (locale === "en" && item.summary_en) || item.summary || "";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(item.title)} | ${t.siteName}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${pageUrl}">
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${siteUrl}/zh-CN/item/${date}/${item.id}/">
  <meta property="og:title" content="${esc(item.title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:site_name" content="${t.siteName}">
  <meta property="og:locale" content="${locale === 'zh-CN' ? 'zh_CN' : locale === 'zh-TW' ? 'zh_TW' : 'en_US'}">
  <meta property="og:image" content="${siteUrl}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:type" content="article">
  <meta property="article:published_time" content="${date}">
${ogTags}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(item.title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${siteUrl}/og-image.png">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <style>${CSS}</style>
</head>
<body>
  <div style="min-height:100dvh;display:flex;flex-direction:column">
    <header class="site-header">
      <div class="header-inner">
        <a href="${homeUrl}" class="header-brand">
          <img src="/logo.png" alt="${t.siteName}" width="32" height="32">
          <span>${t.siteName}</span>
        </a>
        <nav class="header-nav">
          <a href="${homeUrl}">${t.home}</a>
          <a href="${dateUrl}">${date}</a>
        </nav>
      </div>
    </header>

    <main class="site-main">
      <div class="container">
        <script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: item.title,
          ...(desc ? { description: desc } : {}),
          datePublished: date,
          author: { "@type": "Person", name: t.siteName },
          publisher: { "@type": "Organization", name: t.siteName, url: siteUrl },
          url: pageUrl,
          image: `${siteUrl}/og-image.png`,
          keywords: tags.join(", "),
        })}</script>
        <script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: t.siteName, item: `${siteUrl}/${locale}/` },
            { "@type": "ListItem", position: 2, name: date, item: `${siteUrl}/${locale}/${date}/` },
            { "@type": "ListItem", position: 3, name: item.title },
          ],
        })}</script>

        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="${homeUrl}">${t.home}</a>
          <span class="sep">/</span>
          <span>${date}</span>
          <span class="sep">/</span>
          <span class="current">${esc(item.title)}</span>
        </nav>

        <a href="${homeUrl}" class="back-link">${t.back}</a>
        <h1 class="page-title">${esc(item.title)}</h1>

        <div class="section">
          <div class="section-label">${t.summary}</div>
          <div class="section-text">${esc(displaySummary) || t.noSummary}</div>
        </div>

        <div class="meta-row">
          <div>
            <div class="section-label">${t.topic}</div>
            <span class="topic-tag">${esc(getTopicLabel(item.topic, locale))}</span>
          </div>
          <div>
            <div class="section-label">${t.score}</div>
            <span class="score"><span class="star">★</span>${item.score}</span>
          </div>
          <div>
            <div class="section-label">${t.source}</div>
            <span class="source-name">${esc(item.source)}</span>
          </div>
        </div>
${whyNowSection}${tagPills}
        <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" class="cta-link">
          ${t.readOriginal}
        </a>
      </div>
    </main>

    <footer class="site-footer">
      <p>${t.siteName} &mdash; ${t.allArticles}</p>
    </footer>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 404 page renderer
// ---------------------------------------------------------------------------
function render404(locale) {
  const t = T[locale] || T["zh-CN"];
  const homeUrl = `/${locale}/`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 | ${t.siteName}</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <style>${CSS}</style>
</head>
<body>
  <div style="min-height:100dvh;display:flex;flex-direction:column">
    <header class="site-header">
      <div class="header-inner">
        <a href="${homeUrl}" class="header-brand">
          <img src="/logo.png" alt="${t.siteName}" width="32" height="32">
          <span>${t.siteName}</span>
        </a>
      </div>
    </header>
    <main class="site-main">
      <div class="container not-found">
        <h1>${t.notFound}</h1>
        <p>${t.notFound}</p>
        <a href="${homeUrl}">${t.backToHome}</a>
      </div>
    </main>
    <footer class="site-footer">
      <p>${t.siteName}</p>
    </footer>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export async function handleItem(locale, context) {
  const { request, params } = context;

  // Parse path segments from catch-all [[path]]
  // URL: /zh-CN/item/2026-06-15/abc123/ → path = ['2026-06-15', 'abc123', '']
  const segments = (params.path || []).filter((s) => s !== "");

  if (segments.length < 2) {
    return new Response(render404(locale), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const date = segments[0];
  const id = segments[1];

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(render404(locale), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    // Fetch the digest JSON from static assets
    const digestUrl = new URL(`/data/digest-${date}.json`, request.url);
    const digestRes = await fetch(digestUrl);

    if (!digestRes.ok) {
      return new Response(render404(locale), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const digest = await digestRes.json();
    const item = (digest.items || []).find((i) => i.id === id);

    if (!item) {
      return new Response(render404(locale), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const html = renderPage(item, locale, date);

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response(render404(locale), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
