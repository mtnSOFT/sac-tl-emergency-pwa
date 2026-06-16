/* ============================================================
 * SAC Notfallblatt – App
 * Vanilla JS · no framework · loads markdown content & manages SW
 * ============================================================ */

const $ = (s) => document.querySelector(s);
const tabsEl    = $('#tabs');
const contentEl = $('#content');
const versionEl = $('#version-badge');
const toastEl   = $('#update-toast');
const updateBtn = $('#update-btn');
const offlineEl = $('#offline-pill');

let pages = [];
let activeFile = null;

/* ── Markdown renderer config ─────────────────────────────── */

marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: false,
  mangle: false
});

/* Strip YAML frontmatter before rendering */
function stripFrontmatter(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n+/, '');
}

/* ── Load index + render tabs ─────────────────────────────── */

async function init() {
  try {
    // Cache-bust version.json so we always see the latest
    const versionResp = await fetch('version.json', { cache: 'no-store' }).catch(() => null);
    if (versionResp?.ok) {
      const v = await versionResp.json();
      versionEl.textContent = `v${v.version.slice(0, 8)}`;
    }

    const indexResp = await fetch('content/index.json');
    pages = await indexResp.json();

    renderTabs();
    const initial = location.hash.replace('#', '') || pages[0].file;
    await loadPage(initial);
  } catch (err) {
    contentEl.innerHTML = `
      <div class="loading">
        <p>⚠️ Konnte Inhalte nicht laden.</p>
        <p style="font-size:12px;color:#888">${err.message}</p>
      </div>`;
  }
}

function renderTabs() {
  tabsEl.innerHTML = pages.map(p => `
    <button class="tab" role="tab" data-file="${p.file}" aria-selected="false">
      <span class="tab__icon">${p.icon}</span>
      <span>${p.title}</span>
    </button>
  `).join('');

  tabsEl.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => loadPage(btn.dataset.file));
  });
}

async function loadPage(file) {
  if (!pages.find(p => p.file === file)) file = pages[0].file;
  activeFile = file;
  location.hash = file;

  // Update tab state
  tabsEl.querySelectorAll('.tab').forEach(btn => {
    btn.setAttribute('aria-selected', btn.dataset.file === file ? 'true' : 'false');
  });

  try {
    const resp = await fetch(`content/${file}`);
    const md   = await resp.text();
    contentEl.innerHTML = marked.parse(stripFrontmatter(md));
    contentEl.scrollTop = 0;
    window.scrollTo(0, 0);
  } catch (err) {
    contentEl.innerHTML = `<div class="loading"><p>⚠️ ${err.message}</p></div>`;
  }
}

/* ── Service Worker registration & update flow ───────────── */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      // Check for updates every 60 minutes while app is open
      setInterval(() => reg.update(), 60 * 60 * 1000);

      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // A new SW is waiting → show update prompt
            showUpdateToast(newSW);
          }
        });
      });
    });

    // Listen for the new SW to take control after we tell it to skip waiting
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

function showUpdateToast(waitingSW) {
  toastEl.hidden = false;
  updateBtn.addEventListener('click', () => {
    waitingSW.postMessage({ type: 'SKIP_WAITING' });
    toastEl.hidden = true;
  }, { once: true });
}

/* ── Online / Offline indicator ───────────────────────────── */

function updateOnlineState() {
  offlineEl.hidden = navigator.onLine;
}
window.addEventListener('online',  updateOnlineState);
window.addEventListener('offline', updateOnlineState);
updateOnlineState();

/* ── Boot ─────────────────────────────────────────────────── */

init();
