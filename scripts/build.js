#!/usr/bin/env node
/**
 * Build-Script
 * Liest public/ → schreibt dist/
 *
 *  - generiert content/index.json aus Frontmatter
 *  - generiert version.json (timestamp + git sha)
 *  - ersetzt __CACHE_VERSION__ in sw.js
 *  - kopiert alles übrige 1:1
 *
 * Wird lokal und in CI (.github/workflows/deploy.yml) ausgeführt.
 */

const fs   = require('fs');
const path = require('path');

const SRC  = path.join(__dirname, '..', 'public');
const DIST = path.join(__dirname, '..', 'dist');

/* ── Helpers ─────────────────────────────────────────────── */

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const meta = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    meta[key] = isNaN(val) || val === '' ? val : Number(val);
  }
  return meta;
}

/* ── Build ───────────────────────────────────────────────── */

rmrf(DIST);
copyTree(SRC, DIST);

// 1. Generate content index.json
const contentDir = path.join(DIST, 'content');
const mdFiles = fs.readdirSync(contentDir)
  .filter(f => f.endsWith('.md'))
  .sort();

const index = mdFiles.map(file => {
  const meta = parseFrontmatter(fs.readFileSync(path.join(contentDir, file), 'utf8'));
  return {
    file,
    title: meta.title || file,
    icon:  meta.icon  || '📄',
    order: meta.order ?? 999
  };
}).sort((a, b) => a.order - b.order);

fs.writeFileSync(
  path.join(contentDir, 'index.json'),
  JSON.stringify(index, null, 2) + '\n'
);

// 2. Version stamp
let sha = 'dev';
try {
  sha = require('child_process')
    .execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString().trim();
} catch { /* git not available */ }

const version = {
  version: new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14),
  sha,
  builtAt: new Date().toISOString()
};

fs.writeFileSync(
  path.join(DIST, 'version.json'),
  JSON.stringify(version, null, 2) + '\n'
);

// 3. Stamp sw.js
const swPath = path.join(DIST, 'sw.js');
const swSrc  = fs.readFileSync(swPath, 'utf8');
fs.writeFileSync(swPath, swSrc.replace(/__CACHE_VERSION__/g, `${version.version}-${sha}`));

// 4. Done
console.log(`✓ Build complete → dist/`);
console.log(`  · ${index.length} pages indexed`);
console.log(`  · version ${version.version} (${sha})`);
