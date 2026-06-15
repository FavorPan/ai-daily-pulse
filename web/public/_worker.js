// Cloudflare Pages _worker.js — dynamically renders /item/ pages.
// All other requests pass through to static assets.

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------
const T = {
  "zh-CN": {
    siteName: "AI Daily Pulse", home: "今日", back: "← 返回全部文章",
    summary: "摘要", noSummary: "暂无摘要", whyNow: "AI 评语",
    topic: "主题", score: "评分", tags: "标签", source: "来源",
    readOriginal: "阅读原文 ↗", notFound: "文章未找到",
    backToHome: "返回首页", allArticles: "全部文章",
  },
  "zh-TW": {
    siteName: "AI Daily Pulse", home: "今日", back: "← 返回全部文章",
    summary: "摘要", noSummary: "暫無摘要", whyNow: "AI 評語",
    topic: "主題", score: "評分", tags: "標籤", source: "來源",
    readOriginal: "閱讀原文 ↗", notFound: "文章未找到",
    backToHome: "返回首頁", allArticles: "全部文章",
  },
  en: {
    siteName: "AI Daily Pulse", home: "Today", back: "← Back to all articles",
    summary: "Summary", noSummary: "No summary", whyNow: "AI Insight",
    topic: "Topic", score: "Score", tags: "Tags", source: "Source",
    readOriginal: "Read original ↗", notFound: "Article not found",
    backToHome: "Back to home", allArticles: "All articles",
  },
};

const TOPIC_LABELS = {
  "OPC/AI赚钱案例": { "zh-CN": "OPC/AI赚钱案例", "zh-TW": "OPC/AI賺錢案例", en: "OPC / AI Monetization" },
  "AI+电商": { "zh-CN": "AI+电商", "zh-TW": "AI+電商", en: "AI + E-commerce" },
  "AI工具实操/Agent工作流": { "zh-CN": "AI工具实操/Agent工作流", "zh-TW": "AI工具實操/Agent工作流", en: "AI Tools & Agent Workflows" },
  "AI新技术/新模型": { "zh-CN": "AI新技术/新模型", "zh-TW": "AI新技術/新模型", en: "AI Tech & New Models" },
  "AI投融资动态": { "zh-CN": "AI投融资动态", "zh-TW": "AI投融資動態", en: "AI Funding & M&A" },
  "AI对行业的冲击": { "zh-CN": "AI对行业的冲击", "zh-TW": "AI對行業的衝擊", en: "AI Industry Impact" },
};

// ---------------------------------------------------------------------------
// Inline CSS
// ---------------------------------------------------------------------------
const CSS = `:root{--bg:#fafafa;--fg:#18181b;--surface:#fff;--surface-muted:#f4f4f5;--border:#e4e4e7;--accent:#2563eb;--accent-muted:#3b82f6;--muted:#71717a;--highlight:#eff6ff}@media(prefers-color-scheme:dark){:root{--bg:#18181b;--fg:#fafafa;--surface:#222225;--surface-muted:#2e2e32;--border:#333336;--accent:#3b82f6;--accent-muted:#60a5fa;--muted:#a1a1aa;--highlight:#172554}}*,::before,::after{box-sizing:border-box;margin:0;padding:0}html{-webkit-text-size-adjust:100%;tab-size:4}body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:var(--bg);color:var(--fg);line-height:1.6;-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}a:hover{color:var(--accent)}.site-header{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 80%,transparent);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}.header-inner{display:flex;align-items:center;justify-content:space-between;height:56px;padding:0 16px;max-width:1152px;margin:0 auto}@media(min-width:768px){.header-inner{padding:0 32px}}.header-brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;letter-spacing:-.01em}.header-brand img{width:32px;height:32px;border-radius:8px}.header-brand span{display:none}@media(min-width:640px){.header-brand span{display:inline}}.header-nav{display:flex;align-items:center;gap:4px;font-size:13px;color:var(--muted)}.header-nav a{padding:6px 10px;border-radius:6px;transition:color .15s,background-color .15s}.header-nav a:hover{color:var(--fg);background:var(--surface-muted)}.site-main{flex:1;padding:32px 16px}@media(min-width:768px){.site-main{padding:32px}}.container{max-width:672px;margin:0 auto}.breadcrumb{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);font-family:ui-monospace,'SF Mono',Menlo,monospace;margin-bottom:24px}.breadcrumb a{color:var(--muted)}.breadcrumb a:hover{color:var(--fg)}.breadcrumb .sep{color:var(--border)}.breadcrumb .current{color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}.back-link{display:inline-block;font-size:14px;color:var(--muted);margin-bottom:12px}.back-link:hover{color:var(--fg)}.page-title{font-size:1.75rem;font-weight:700;line-height:1.2;letter-spacing:-.02em;margin-bottom:24px}.section{margin-bottom:24px}.section-label{font-size:12px;font-weight:500;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}.section-text{font-size:15px;line-height:1.7;color:var(--fg)}.section-text-accent{font-size:14px;line-height:1.7;color:var(--accent)}.meta-row{display:flex;flex-wrap:wrap;gap:24px;margin-bottom:24px}.topic-tag{display:inline-flex;align-items:center;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:500;border:1px solid #bfdbfe;background:#eff6ff;color:#2563eb;white-space:nowrap}@media(prefers-color-scheme:dark){.topic-tag{background:rgba(37,99,235,.12);color:#93c5fd;border-color:rgba(37,99,235,.25)}}.score{display:inline-flex;align-items:center;gap:4px;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:18px;font-weight:600;color:var(--accent)}.source-name{font-size:14px;color:var(--fg)}.tag-list{display:flex;flex-wrap:wrap;gap:8px}.tag-item{font-size:12px;padding:4px 10px;border-radius:6px;background:var(--surface-muted);color:var(--muted);border:1px solid var(--border);font-family:ui-monospace,'SF Mono',Menlo,monospace}.cta-link{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;background:var(--fg);color:var(--bg);font-size:14px;font-weight:500;margin-top:8px;transition:opacity .15s}.cta-link:hover{opacity:.9;color:var(--bg)}.site-footer{border-top:1px solid var(--border);padding:24px 16px;text-align:center;font-size:12px;color:var(--muted)}@media(min-width:768px){.site-footer{padding:24px 32px}}.not-found{text-align:center;padding:64px 0}.not-found h1{font-size:1.5rem;font-weight:700;margin-bottom:12px}.not-found p{color:var(--muted);margin-bottom:24px}.not-found a{display:inline-block;padding:10px 20px;border-radius:10px;background:var(--fg);color:var(--bg);font-size:14px;font-weight:500}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function esc(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function getTopicLabel(topic, locale) {
  return (TOPIC_LABELS[topic] && TOPIC_LABELS[topic][locale]) || topic;
}

// ---------------------------------------------------------------------------
// Page renderers
// ---------------------------------------------------------------------------
function renderPage(item, locale, date) {
  const t = T[locale] || T["zh-CN"];
  const siteUrl = "https://ai-daily-pulse.top";
  const pageUrl = siteUrl + "/" + locale + "/item/" + date + "/" + item.id + "/";
  const homeUrl = "/" + locale + "/";
  const dateUrl = "/" + locale + "/" + date + "/";
  const summaryText = (locale === "en" && item.summary_en) || item.summary || "";
  const desc = summaryText.length > 160 ? summaryText.slice(0, 157) + "..." : summaryText;
  const tags = Array.isArray(item.tags) ? item.tags : typeof item.tags === "string" ? item.tags.split(",").map(function(s) { return s.trim(); }) : [];

  var altLocales = [{ code: "zh-CN", hreflang: "zh-CN" }, { code: "zh-TW", hreflang: "zh-TW" }, { code: "en", hreflang: "en" }];
  var alternates = altLocales.map(function(l) {
    return '<link rel="alternate" hreflang="' + l.hreflang + '" href="' + siteUrl + "/" + l.code + "/item/" + date + "/" + item.id + '/">';
  }).join("\n    ");

  var ogTagLines = tags.map(function(tag) { return '    <meta property="article:tag" content="' + esc(tag) + '">'; }).join("\n");

  var tagPills = "";
  if (tags.length > 0) {
    tagPills = '\n        <div class="section">\n          <div class="section-label">' + t.tags + '</div>\n          <div class="tag-list">\n            ' +
      tags.map(function(tag) { return '<span class="tag-item">#' + esc(tag) + '</span>'; }).join("\n            ") +
      '\n          </div>\n        </div>';
  }

  var whyNowSection = "";
  if (item.why_now) {
    whyNowSection = '\n        <div class="section">\n          <div class="section-label">' + t.whyNow + '</div>\n          <div class="section-text-accent">' + esc(item.why_now) + '</div>\n        </div>';
  }

  var displaySummary = (locale === "en" && item.summary_en) || item.summary || "";

  return "<!DOCTYPE html>\n<html lang=\"" + locale + "\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>" + esc(item.title) + " | " + t.siteName + "</title>\n  <meta name=\"description\" content=\"" + esc(desc) + "\">\n  <meta name=\"robots\" content=\"index, follow\">\n  <link rel=\"canonical\" href=\"" + pageUrl + "\">\n  " + alternates + '\n  <link rel="alternate" hreflang="x-default" href="' + siteUrl + "/zh-CN/item/" + date + "/" + item.id + '/">\n  <meta property="og:title" content="' + esc(item.title) + '">\n  <meta property="og:description" content="' + esc(desc) + '">\n  <meta property="og:url" content="' + pageUrl + '">\n  <meta property="og:site_name" content="' + t.siteName + '">\n  <meta property="og:locale" content="' + (locale === "zh-CN" ? "zh_CN" : locale === "zh-TW" ? "zh_TW" : "en_US") + '">\n  <meta property="og:image" content="' + siteUrl + '/og-image.png">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n  <meta property="og:type" content="article">\n  <meta property="article:published_time" content="' + date + '">\n' + ogTagLines + '\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:title" content="' + esc(item.title) + '">\n  <meta name="twitter:description" content="' + esc(desc) + '">\n  <meta name="twitter:image" content="' + siteUrl + '/og-image.png">\n  <link rel="icon" href="/favicon.ico" sizes="any">\n  <style>' + CSS + '</style>\n</head>\n<body>\n  <div style="min-height:100dvh;display:flex;flex-direction:column">\n    <header class="site-header">\n      <div class="header-inner">\n        <a href="' + homeUrl + '" class="header-brand">\n          <img src="/logo.png" alt="' + t.siteName + '" width="32" height="32">\n          <span>' + t.siteName + '</span>\n        </a>\n        <nav class="header-nav">\n          <a href="' + homeUrl + '">' + t.home + '</a>\n          <a href="' + dateUrl + '">' + date + '</a>\n        </nav>\n      </div>\n    </header>\n    <main class="site-main">\n      <div class="container">\n        <script type="application/ld+json">' + JSON.stringify({"@context":"https://schema.org","@type":"Article",headline:item.title,description:desc||undefined,datePublished:date,author:{"@type":"Person",name:t.siteName},publisher:{"@type":"Organization",name:t.siteName,url:siteUrl},url:pageUrl,image:siteUrl+"/og-image.png",keywords:tags.join(", ")}) + '</script>\n        <script type="application/ld+json">' + JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:t.siteName,item:siteUrl+"/"+locale+"/"},{"@type":"ListItem",position:2,name:date,item:siteUrl+"/"+locale+"/"+date+"/"},{"@type":"ListItem",position:3,name:item.title}]}) + '</script>\n        <nav class="breadcrumb" aria-label="Breadcrumb">\n          <a href="' + homeUrl + '">' + t.home + '</a>\n          <span class="sep">/</span>\n          <span>' + date + '</span>\n          <span class="sep">/</span>\n          <span class="current">' + esc(item.title) + '</span>\n        </nav>\n        <a href="' + homeUrl + '" class="back-link">' + t.back + '</a>\n        <h1 class="page-title">' + esc(item.title) + '</h1>\n        <div class="section">\n          <div class="section-label">' + t.summary + '</div>\n          <div class="section-text">' + (esc(displaySummary) || t.noSummary) + '</div>\n        </div>\n        <div class="meta-row">\n          <div>\n            <div class="section-label">' + t.topic + '</div>\n            <span class="topic-tag">' + esc(getTopicLabel(item.topic, locale)) + '</span>\n          </div>\n          <div>\n            <div class="section-label">' + t.score + '</div>\n            <span class="score">★' + item.score + '</span>\n          </div>\n          <div>\n            <div class="section-label">' + t.source + '</div>\n            <span class="source-name">' + esc(item.source) + '</span>\n          </div>\n        </div>\n' + whyNowSection + tagPills + '\n        <a href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer" class="cta-link">' + t.readOriginal + '</a>\n      </div>\n    </main>\n    <footer class="site-footer">\n      <p>' + t.siteName + ' &mdash; ' + t.allArticles + '</p>\n    </footer>\n  </div>\n</body>\n</html>';
}

function render404(locale) {
  var t = T[locale] || T["zh-CN"];
  var homeUrl = "/" + locale + "/";
  return "<!DOCTYPE html>\n<html lang=\"" + locale + "\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>404 | " + t.siteName + "</title>\n  <meta name=\"robots\" content=\"noindex\">\n  <link rel=\"icon\" href=\"/favicon.ico\" sizes=\"any\">\n  <style>" + CSS + "</style>\n</head>\n<body>\n  <div style=\"min-height:100dvh;display:flex;flex-direction:column\">\n    <header class=\"site-header\">\n      <div class=\"header-inner\">\n        <a href=\"" + homeUrl + "\" class=\"header-brand\">\n          <img src=\"/logo.png\" alt=\"" + t.siteName + "\" width=\"32\" height=\"32\">\n          <span>" + t.siteName + "</span>\n        </a>\n      </div>\n    </header>\n    <main class=\"site-main\">\n      <div class=\"container not-found\">\n        <h1>" + t.notFound + "</h1>\n        <p>" + t.notFound + "</p>\n        <a href=\"" + homeUrl + "\">" + t.backToHome + "</a>\n      </div>\n    </main>\n    <footer class=\"site-footer\">\n      <p>" + t.siteName + "</p>\n    </footer>\n  </div>\n</body>\n</html>";
}

// ---------------------------------------------------------------------------
// Item route pattern: /{locale}/item/{date}/{id}/
// ---------------------------------------------------------------------------
var ITEM_RE = /^\/(zh-CN|zh-TW|en)\/item\/(\d{4}-\d{2}-\d{2})\/([a-f0-9]+)\/?$/;

// ---------------------------------------------------------------------------
// Fetch event handler
// ---------------------------------------------------------------------------
addEventListener("fetch", function(event) {
  var url = new URL(event.request.url);
  var match = url.pathname.match(ITEM_RE);

  if (!match) {
    // Not an item page — pass through to static assets
    return;
  }

  event.respondWith(handleItem(match[1], match[2], match[3], url));
});

async function handleItem(locale, date, id, requestUrl) {
  try {
    var digestUrl = requestUrl.origin + "/data/digest-" + date + ".json";
    var res = await fetch(digestUrl);

    if (!res.ok) {
      return new Response(render404(locale), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    var digest = await res.json();
    var items = digest.items || [];
    var item = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        item = items[i];
        break;
      }
    }

    if (!item) {
      return new Response(render404(locale), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    var html = renderPage(item, locale, date);
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(render404(locale), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}
