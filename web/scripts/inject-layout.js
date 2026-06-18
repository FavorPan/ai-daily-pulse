/**
 * Postbuild script: extracts header/footer HTML and CSS path from the
 * static build output and injects them into _worker.js so the worker
 * renders item pages with the same layout as the main site.
 */
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "out");
const workerPath = path.join(outDir, "_worker.js");

if (!fs.existsSync(workerPath)) {
  console.log("[inject-layout] _worker.js not found, skipping");
  process.exit(0);
}

// Read a generated page to extract header, footer, and CSS
const samplePage = path.join(outDir, "zh-CN", "index.html");
if (!fs.existsSync(samplePage)) {
  console.log("[inject-layout] no sample page found, skipping");
  process.exit(0);
}

const html = fs.readFileSync(samplePage, "utf-8");

// Extract CSS link
const cssMatch = html.match(/<link rel="stylesheet" href="(\/_next\/static\/chunks\/[^"]+\.css)"/);
const cssLink = cssMatch
  ? '<link rel="stylesheet" href="' + cssMatch[1] + '">'
  : "";

// Extract header HTML
const headerMatch = html.match(/<header[\s\S]*?<\/header>/);
const headerHTML = headerMatch ? headerMatch[0] : "";

// Extract footer HTML
const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/);
const footerHTML = footerMatch ? footerMatch[0] : "";

// Escape for JS single-quoted string
function jsStringEscape(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

// Read worker and inject
let worker = fs.readFileSync(workerPath, "utf-8");

worker = worker.replace("'__CSS_LINK__'", "'" + jsStringEscape(cssLink) + "'");
worker = worker.replace("'__HEADER_HTML__'", "'" + jsStringEscape(headerHTML) + "'");
worker = worker.replace("'__FOOTER_HTML__'", "'" + jsStringEscape(footerHTML) + "'");

fs.writeFileSync(workerPath, worker);

console.log("[inject-layout] injected CSS: " + (cssMatch ? cssMatch[1] : "none"));
console.log("[inject-layout] injected header (" + headerHTML.length + " chars)");
console.log("[inject-layout] injected footer (" + footerHTML.length + " chars)");
