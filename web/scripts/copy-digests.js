/**
 * Prebuild script: copies digest JSON files from ../output/ to public/data/
 * so they are deployed as static assets accessible to Cloudflare Pages Functions.
 */
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "..", "output");
const DATA_DIR = path.join(__dirname, "..", "public", "data");

if (!fs.existsSync(OUTPUT_DIR)) {
  console.log("[copy-digests] output/ directory not found, skipping");
  process.exit(0);
}

const files = fs.readdirSync(OUTPUT_DIR).filter(
  (f) => f.startsWith("digest-") && f.endsWith(".json")
);

if (files.length === 0) {
  console.log("[copy-digests] no digest files found, skipping");
  process.exit(0);
}

// Also copy latest.json if it exists
const latestPath = path.join(OUTPUT_DIR, "latest.json");
if (fs.existsSync(latestPath)) {
  files.push("latest.json");
}

for (const file of files) {
  const src = path.join(OUTPUT_DIR, file);
  const dest = path.join(DATA_DIR, file);
  fs.copyFileSync(src, dest);
}

console.log(`[copy-digests] copied ${files.length} files to public/data/`);
