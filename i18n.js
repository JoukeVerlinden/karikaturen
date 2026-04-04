// ═══════════════════════════════════════════════════════════════════════════
//  i18n.js — Real-time Client-Side Translation Layer  v2
//  Heritage 360° Viewer · Universiteit Antwerpen
//
//  ┌─ ARCHITECTURE ──────────────────────────────────────────────────────────┐
//  │                                                                         │
//  │  DUTCH = canonical source of truth (NL)                                 │
//  │                                                                         │
//  │  On I18n.init() every translatable node gets a permanent data-nl attr   │
//  │  that stores its original Dutch innerHTML.  Subsequent language switches │
//  │  ALWAYS translate from data-nl, never from whatever is currently in the │
//  │  DOM, eliminating "translation-of-a-translation" corruption.            │
//  │                                                                         │
//  │  COORDINATE → PANEL MAPPING (bi-directional sync)                       │
//  │  ─────────────────────────────────────────────────                      │
//  │  hotspot.data-id  ←→  .annotation-entry.data-id                        │
//  │  .rect-hotspot-group.data-id  ←→  .annotation-entry.data-id            │
//  │                                                                         │
//  │  The translation layer only writes innerHTML of LEAF content nodes      │
//  │  (.entry-title, .entry-body > p, etc.).  Structural wrappers that carry │
//  │  data-id / data-goto / event listeners are never touched.               │
//  │  → setActive(id) and flyTo() remain fully operational after any         │
//  │    language switch.                                                      │
//  │                                                                         │
//  │  API STRATEGY                                                            │
//  │  ─────────────                                                           │
//  │  1. Strings are chunked (≤ MAX_CHUNK_BYTES per request).                │
//  │  2. Each chunk is tried against up to 3 LibreTranslate mirrors;         │
//  │     first success wins (fallback chain).                                │
//  │  3. Translated strings are cached: Map keyed by "lang::dutchHTML".      │
//  │  4. If ALL mirrors fail, an error toast is shown; Dutch is restored.    │
//  │  5. A language queued during an in-progress translation is applied       │
//  │     automatically when the current round-trip completes (no silent       │
//  │     drops).                                                             │
//  │                                                                         │
//  └─────────────────────────────────────────────────────────────────────────┘
//
//  DEPLOYMENT CHECKLIST
//  ────────────────────
//  • Replace LT_ENDPOINTS[0] with your self-hosted or paid LibreTranslate URL.
//  • Set LT_API_KEY if your endpoint requires authentication.
//  • Load via: <script src="i18n.js"></script>  AFTER annotations.js.
//  • Call I18n.init() at the END of init() in index.html, after buildPanel(),
//    buildHotspots(), and buildEraSwitcher() have all run.
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  CONFIGURATION                                                            ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/**
 * LibreTranslate endpoint fallback chain.
 * Tried left-to-right; the first 200 OK response wins.
 * Add your own self-hosted URL at index 0 for production use.
 */
const LT_ENDPOINTS = [
  'https://libretranslate.de/translate',
  'https://translate.argosopentech.com/translate',
  'https://libretranslate.com/translate',
];

/** API key — leave empty for public endpoints that do not require one. */
const LT_API_KEY = '';

/**
 * Maximum UTF-8 byte size per API request.
 * LibreTranslate's free tier typically rejects payloads larger than ~10 KB.
 * Items are batched greedily up to this threshold, then sent as a chunk.
 */
const MAX_CHUNK_BYTES = 8000;

/** Per-request network timeout in milliseconds. */
const REQUEST_TIMEOUT_MS = 12000;

/** Language options shown in the selector. */
const SUPPORTED_LANGS = [
  { code: 'nl', label: 'NL', fullLabel: 'Nederlands' },
  { code: 'en', label: 'EN', fullLabel: 'English'    },
  { code: 'fr', label: 'FR', fullLabel: 'Français'   },
  { code: 'zh', label: '中文', fullLabel: '中文'      },
];

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  INTERNAL STATE                                                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

let _currentLang  = 'nl';   // Active language code
let _translating  = false;   // API round-trip in progress
let _queuedLang   = null;    // Language requested while _translating === true

/**
 * Cache: Map<"lang::dutchHTML", translatedHTML>
 * Keyed on the Dutch source — guarantees we always translate from NL,
 * never from an already-translated string.
 */
const _cache = new Map();

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  DOM STAMPING                                                             ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/**
 * Stamp one element with its Dutch innerHTML as data-nl.
 * Idempotent — safe to call multiple times; only stamps once.
 */
function stampNL(el, html) {
  if (!el || el.hasAttribute('data-nl')) return;
  el.setAttribute('data-nl', html !== undefined ? html : el.innerHTML);
}

/**
 * Selectors for translatable leaf nodes.
 *
 * "Leaf" means the node holds only rendered text (plus optional inline tags
 * like <strong>/<em>/<a>).  Structural wrappers (.annotation-entry, .hotspot,
 * .rect-hotspot-group) that carry data-id / event listeners are intentionally
 * excluded to preserve all coordinate→panel navigation links.
 */
const TRANSLATABLE_SELECTORS = [
  '#site-title', '#site-subtitle',
  '#panel-label', '#panel-heading', '#panel-meta',
  '#start-hint-intro',
  '.sh-text', '.sh-tab',
  '#sh-colophon-body',
  '.era-label',
  '.entry-title', '.entry-date', '.entry-body > p',
  '.inscription-transcription', '.inscription-translation',
  '#start-hint-close',
  '#viewer-hint',
];

/** Stamp all translatable nodes in the current document with their Dutch source. */
function stampAllNodes() {
  TRANSLATABLE_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => stampNL(el));
  });

  // Era-btn title attributes (hover tooltips) — stamp as data attributes,
  // not as data-nl, because they are attribute strings, not innerHTML.
  document.querySelectorAll('.era-btn').forEach(btn => {
    if (!btn.dataset.nlTitle) btn.dataset.nlTitle = btn.title || '';
  });

  // Wrap bare text nodes inside #active-indicator so they can be stamped.
  // The "Bekijkt:" label is a bare text node sitting next to #active-label.
  const activeIndicator = document.getElementById('active-indicator');
  if (activeIndicator) {
    Array.from(activeIndicator.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const span = document.createElement('span');
        span.className = 'i18n-text-node';
        span.textContent = node.textContent;
        node.parentNode.replaceChild(span, node);
        stampNL(span, node.textContent);
      }
    });
  }
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  API CLIENT                                                               ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/**
 * POST one translation request to a single LibreTranslate endpoint.
 * Throws on HTTP errors or network timeout.
 *
 * format: "html"  instructs LibreTranslate to skip tag content during
 * tokenisation, so <strong>, <em>, <a href=…>, <kbd> etc. pass through
 * unchanged into the translated output.
 */
async function _fetchTranslation(endpoint, html, targetLang) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const body = { q: html, source: 'nl', target: targetLang, format: 'html' };
    if (LT_API_KEY) body.api_key = LT_API_KEY;

    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data.translatedText) throw new Error('Empty translatedText');
    return data.translatedText;
  } finally {
    clearTimeout(tid);
  }
}

/**
 * Translate one HTML string via the fallback chain.
 * Returns the Dutch source on complete failure (graceful degradation).
 */
async function translateHTML(html, targetLang) {
  if (!html || !html.trim()) return html;

  const key = `${targetLang}::${html}`;
  if (_cache.has(key)) return _cache.get(key);

  let lastErr;
  for (const ep of LT_ENDPOINTS) {
    try {
      const t = await _fetchTranslation(ep, html, targetLang);
      _cache.set(key, t);
      return t;
    } catch (err) {
      lastErr = err;
    }
  }
  console.warn(`[i18n] All endpoints failed ("${html.slice(0,50)}…"):`, lastErr?.message);
  return html; // fall back to Dutch
}

/**
 * Partition items into chunks where each chunk's total UTF-8 byte length
 * stays under MAX_CHUNK_BYTES.  This prevents HTTP 413 errors on free-tier
 * LibreTranslate instances which enforce payload size limits.
 */
function _chunkItems(items) {
  const enc = new TextEncoder();
  const chunks = [];
  let cur = [], bytes = 0;

  for (const item of items) {
    const b = enc.encode(item.nl).length;
    if (cur.length && bytes + b > MAX_CHUNK_BYTES) {
      chunks.push(cur);
      cur = []; bytes = 0;
    }
    cur.push(item);
    bytes += b;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

/**
 * Translate a batch of { el, nl } items.
 *
 * Items within each chunk are translated in parallel for speed.
 * Chunks are processed sequentially to avoid overwhelming free-tier servers.
 *
 * Coordinate→panel integrity:
 *   Only leaf nodes (titles, body paragraphs) receive new innerHTML.
 *   Structural wrappers holding data-id, data-goto, and event listeners
 *   are never modified.  setActive(id) and flyTo() work identically after
 *   any language switch.
 *
 * @param {Array<{el:Element, nl:string}>} items
 * @param {string}   targetLang
 * @param {Function=} onProgress   Called with (done, total) after each chunk.
 */
async function batchTranslate(items, targetLang, onProgress) {
  const chunks = _chunkItems(items);
  let done = 0;

  for (const chunk of chunks) {
    const results = await Promise.all(chunk.map(({ nl }) => translateHTML(nl, targetLang)));
    results.forEach((t, i) => { chunk[i].el.innerHTML = t; });
    done += chunk.length;
    if (onProgress) onProgress(done, items.length);
  }
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  UI — Overlay, Progress, Toast                                            ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

function setOverlay(visible) {
  const ov = document.getElementById('i18n-overlay');
  if (ov) ov.classList.toggle('visible', visible);
}

/**
 * Drive the deterministic progress bar (0–100).
 * Passing 0 resumes the indeterminate CSS animation.
 */
function setProgress(pct) {
  const bar = document.getElementById('i18n-progress-bar');
  if (!bar) return;
  if (pct > 0 && pct < 100) {
    bar.style.animation  = 'none';
    bar.style.width      = pct + '%';
    bar.style.marginLeft = '0';
  } else {
    // Restore indeterminate animation
    bar.style.animation  = '';
    bar.style.width      = '';
    bar.style.marginLeft = '';
  }
}

/** Non-blocking error toast shown when all API mirrors fail. */
function showErrorToast(langLabel) {
  const prev = document.getElementById('i18n-toast');
  if (prev) prev.remove();

  const t = document.createElement('div');
  t.id = 'i18n-toast';
  t.setAttribute('role', 'alert');
  t.innerHTML =
    `<span style="font-size:15px">⚠</span>` +
    `<span>Vertaling naar <strong>${langLabel}</strong> is tijdelijk niet beschikbaar. ` +
    `Nederlandse tekst blijft zichtbaar.</span>`;
  document.body.appendChild(t);

  setTimeout(() => t.classList.add('i18n-toast-out'), 3600);
  setTimeout(() => { if (t.parentNode) t.remove(); }, 4300);
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  CORE — applyLanguage                                                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/**
 * Switch the entire viewer to targetLang.
 *
 * Flow:
 *  1. If a translation is already in flight, queue targetLang and return.
 *     The queued language will be applied when the current request finishes.
 *  2. Restore ALL [data-nl] nodes to Dutch (instant, zero network).
 *  3. If targetLang === 'nl', done.
 *  4. Show overlay, collect stamped nodes, translate in chunked batches,
 *     write back, then update tooltips / era titles / dynamic labels.
 *  5. Hide overlay; if a language was queued during step 4, apply it now.
 *
 * @param {string} targetLang  - 'nl' | 'en' | 'fr' | 'zh'
 */
async function applyLanguage(targetLang) {
  // ── Queue if busy ──────────────────────────────────────────────────────
  if (_translating) {
    if (targetLang !== _currentLang) _queuedLang = targetLang;
    return;
  }
  if (targetLang === _currentLang) return;

  _currentLang = targetLang;
  _queuedLang  = null;

  // ── Restore Dutch source into every stamped node (step 2) ──────────────
  document.querySelectorAll('[data-nl]').forEach(el => {
    el.innerHTML = el.getAttribute('data-nl');
  });

  // Update <html lang> for screen readers and CSS :lang() selectors
  document.documentElement.lang = targetLang;

  // Restore era-btn titles to Dutch originals
  document.querySelectorAll('.era-btn[data-nl-title]').forEach(btn => {
    btn.title = btn.dataset.nlTitle;
  });

  if (targetLang === 'nl') {
    _applyDynamicLabels('nl');
    return;
  }

  // ── Show overlay (step 3) ───────────────────────────────────────────────
  _translating = true;
  setOverlay(true);
  setProgress(0);

  const overlayMsgs = { en: 'Translating…', fr: 'Traduction en cours…', zh: '翻译中…' };
  const overlayText = document.getElementById('i18n-overlay-text');
  if (overlayText) overlayText.textContent = overlayMsgs[targetLang] || 'Translating…';

  let apiFailure = false;

  try {
    // ── Collect stamped items (step 4a) ────────────────────────────────
    const items = [];
    document.querySelectorAll('[data-nl]').forEach(el => {
      const nl = el.getAttribute('data-nl');
      if (nl && nl.trim()) items.push({ el, nl });
    });

    // ── Chunked batch translation with deterministic progress (step 4b) ─
    await batchTranslate(items, targetLang, (done, total) => {
      setProgress(Math.round((done / total) * 100));
    });

    // ── Sync hotspot tooltips (step 4c) ────────────────────────────────
    //
    // Coordinate mapping preserved:
    //   .hotspot[data-id="X"]  →  .annotation-entry[data-id="X"] .entry-title
    //
    // We copy the already-translated .entry-title text content into the
    // tooltip.  textContent (not innerHTML) is used because tooltips must
    // not contain markup — they render as plain text.
    document.querySelectorAll('.hotspot[data-id]').forEach(hs => {
      const tooltip  = hs.querySelector('.hotspot-tooltip');
      if (!tooltip) return;
      const panelTitle = document.querySelector(
        `.annotation-entry[data-id="${hs.dataset.id}"] .entry-title`
      );
      if (panelTitle) tooltip.textContent = panelTitle.textContent;
    });

    // ── Translate era-btn title attributes (step 4d) ───────────────────
    await Promise.all(
      Array.from(document.querySelectorAll('.era-btn[data-nl-title]')).map(async btn => {
        const nl = btn.dataset.nlTitle;
        if (nl) btn.title = await translateHTML(nl, targetLang);
      })
    );

    // ── Update dynamic labels — autoplay, panel toggle, etc. (step 4e) ─
    await _applyDynamicLabels(targetLang);

  } catch (err) {
    console.error('[i18n] Critical failure:', err);
    apiFailure = true;
    // Revert to Dutch
    document.querySelectorAll('[data-nl]').forEach(el => {
      el.innerHTML = el.getAttribute('data-nl');
    });
    document.documentElement.lang = 'nl';
    _currentLang = 'nl';
    const sel = document.getElementById('i18n-select');
    if (sel) sel.value = 'nl';

  } finally {
    // Brief hold at 100% before hiding overlay — feels more intentional
    setProgress(100);
    setTimeout(() => { setOverlay(false); setProgress(0); }, 280);
    _translating = false;

    if (apiFailure) {
      const lang = SUPPORTED_LANGS.find(l => l.code === targetLang);
      showErrorToast(lang ? lang.label : targetLang);
    }

    // ── Drain queue (step 5) ───────────────────────────────────────────
    if (_queuedLang && _queuedLang !== _currentLang) {
      const next = _queuedLang;
      _queuedLang = null;
      await applyLanguage(next);
    }
  }
}

/**
 * Translate or restore strings that are set programmatically by the viewer JS
 * (autoplay toggle, panel toggle, see-also labels, "Bekijk in 360°" buttons).
 *
 * These strings are NOT stamped with data-nl because the viewer modifies them
 * dynamically (e.g. "⟳ Rondleiding" ↔ "⏹ Stop").  Instead we translate
 * both variants up-front and expose them via window._i18nLabels for the
 * viewer to use whenever it updates those buttons.
 *
 * @param {string} targetLang
 */
async function _applyDynamicLabels(targetLang) {
  // Dutch source labels
  const NL = {
    autoplayStart: '⟳ Rondleiding',
    autoplayStop:  '⏹ Stop',
    panelShow:     'Details ◧',
    panelHide:     'Details ◨',
    seeAlsoLabel:  'Zie ook',
    lookAtBtn:     'Bekijk in 360°',
  };

  if (targetLang === 'nl') {
    window._i18nLabels = { ...NL };
  } else {
    // Translate all variants in parallel (mostly from cache at this point)
    const keys   = Object.keys(NL);
    const values = await Promise.all(keys.map(k => translateHTML(NL[k], targetLang)));
    const labels = {};
    keys.forEach((k, i) => { labels[k] = values[i]; });
    window._i18nLabels = labels;
  }

  const L = window._i18nLabels;

  // Autoplay button — detect current state by emoji prefix
  const autoBtn = document.getElementById('btn-autoplay');
  if (autoBtn) {
    const running = autoBtn.textContent.startsWith('⏹');
    autoBtn.textContent = running ? L.autoplayStop : L.autoplayStart;
  }

  // Panel toggle button
  const toggleBtn = document.getElementById('btn-toggle-panel');
  if (toggleBtn) {
    const hidden = toggleBtn.textContent.includes('◨');
    toggleBtn.textContent = hidden ? L.panelHide : L.panelShow;
  }

  // "Zie ook" labels inside annotation entries
  document.querySelectorAll('.see-also-label').forEach(el => {
    el.textContent = L.seeAlsoLabel;
  });

  // "Bekijk in 360°" buttons — preserve the embedded SVG icon
  document.querySelectorAll('.look-at-btn').forEach(btn => {
    const svg = btn.querySelector('svg');
    btn.textContent = L.lookAtBtn;
    if (svg) btn.insertBefore(svg, btn.firstChild);
  });
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  WIDGET — Language FAB + Overlay + Toast styles                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

function buildSelector() {
  // ── Styles ─────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'i18n-styles';
  style.textContent = `
    /* ════════ Language FAB ════════
       Stacked above #viewer-controls on desktop.
       viewer-controls: bottom: calc(52px + 20px + safe-area), right: 20px.
       FAB height: 36px + 4px gap = 40px above viewer-controls.            */
    #i18n-fab {
      position: fixed;
      bottom: calc(52px + 20px + 36px + 4px + env(safe-area-inset-bottom, 0px));
      right:  calc(20px + env(safe-area-inset-right, 0px));
      z-index: 150;
      display: flex;
      align-items: center;
      background: rgba(0,46,101,0.92);
      border: 1px solid rgba(130,161,173,0.45);
      border-radius: 2px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 2px 12px rgba(0,0,0,0.35);
      overflow: hidden;
      transition: border-color 0.18s, box-shadow 0.18s;
      cursor: pointer;
    }
    #i18n-fab:hover {
      border-color: rgba(130,161,173,0.75);
    }
    #i18n-fab:focus-within {
      border-color: var(--ua-teal, #82A1AD);
      box-shadow: 0 0 0 2px rgba(130,161,173,0.3), 0 2px 12px rgba(0,0,0,0.35);
    }

    #i18n-fab-icon {
      width: 30px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px;
      color: var(--ua-teal-light, #C8D9D8);
      flex-shrink: 0;
      pointer-events: none; user-select: none;
      padding-left: 2px;
    }

    #i18n-select {
      appearance: none; -webkit-appearance: none;
      background: transparent;
      border: none; outline: none;
      color: rgba(200,217,216,0.92);
      font-family: var(--sans, 'Source Sans 3', Arial, sans-serif);
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase;
      padding: 0 26px 0 0;
      height: 36px; cursor: pointer; min-width: 38px;
      color-scheme: dark;
    }
    #i18n-select option { background: #002e65; color: #fff; font-weight: 600; }
    #i18n-select:focus { outline: none; }

    #i18n-fab-caret {
      position: absolute; right: 7px; top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: rgba(200,217,216,0.4);
      font-size: 8px; line-height: 1;
    }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      #i18n-fab {
        /* On mobile the viewer takes the top 50%; side-panel is below.
           We keep the FAB inside the viewer half, above viewer-controls. */
        bottom: calc(52px + 20px + 36px + 6px + env(safe-area-inset-bottom, 0px));
        right:  calc(12px + env(safe-area-inset-right, 0px));
      }
    }

    /* ════════ Translation overlay ════════ */
    #i18n-overlay {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 7800;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.22s ease;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 16px;
    }
    #i18n-overlay.visible { opacity: 1; }

    #i18n-overlay-bar {
      background: var(--ua-blue, #002e65);
      border: 1px solid rgba(130,161,173,0.3);
      border-top: 3px solid var(--ua-teal, #82A1AD);
      padding: 9px 20px 9px 14px;
      display: flex; align-items: center; gap: 11px;
      font-family: var(--sans, 'Source Sans 3', Arial, sans-serif);
      font-size: 11.5px; font-weight: 600;
      letter-spacing: 0.04em;
      color: rgba(200,217,216,0.85);
      box-shadow: 0 -2px 20px rgba(0,46,101,0.4);
      border-radius: 1px;
    }

    #i18n-spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(130,161,173,0.18);
      border-top-color: var(--ua-teal, #82A1AD);
      border-radius: 50%;
      animation: _i18n-spin 0.65s linear infinite;
      flex-shrink: 0;
    }
    @keyframes _i18n-spin { to { transform: rotate(360deg); } }

    #i18n-progress {
      width: 110px; height: 2px;
      background: rgba(200,217,216,0.08);
      border-radius: 1px; overflow: hidden; flex-shrink: 0;
    }
    #i18n-progress-bar {
      height: 100%;
      background: var(--ua-teal, #82A1AD);
      width: 0;
      transition: width 0.2s ease;
      animation: _i18n-progress 1.6s ease-in-out infinite;
    }
    @keyframes _i18n-progress {
      0%   { width: 0%;  margin-left: 0;    }
      50%  { width: 65%; margin-left: 15%;  }
      100% { width: 0%;  margin-left: 100%; }
    }

    /* ════════ Error toast ════════ */
    #i18n-toast {
      position: fixed;
      bottom: 80px; left: 50%;
      transform: translateX(-50%);
      z-index: 9200;
      background: var(--ua-blue, #002e65);
      border: 1px solid rgba(234,44,56,0.45);
      border-top: 3px solid var(--ua-red, #ea2c38);
      color: rgba(200,217,216,0.9);
      font-family: var(--sans, 'Source Sans 3', Arial, sans-serif);
      font-size: 12px; font-weight: 600;
      letter-spacing: 0.03em;
      padding: 10px 18px;
      display: flex; align-items: center; gap: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      border-radius: 2px;
      max-width: 90vw;
      pointer-events: none;
      animation: _i18n-toast-in 0.25s ease forwards;
    }
    #i18n-toast strong { color: #fff; }
    #i18n-toast.i18n-toast-out {
      animation: _i18n-toast-out 0.3s ease forwards;
    }
    @keyframes _i18n-toast-in  {
      from { opacity:0; transform:translateX(-50%) translateY(8px); }
      to   { opacity:1; transform:translateX(-50%) translateY(0); }
    }
    @keyframes _i18n-toast-out {
      from { opacity:1; transform:translateX(-50%) translateY(0); }
      to   { opacity:0; transform:translateX(-50%) translateY(6px); }
    }

    /* ════════ Bare-text-node wrappers ════════ */
    #active-indicator .i18n-text-node { display: contents; }
  `;
  document.head.appendChild(style);

  // ── FAB element ──────────────────────────────────────────────────────────
  const fab = document.createElement('div');
  fab.id = 'i18n-fab';
  fab.setAttribute('role', 'group');
  fab.setAttribute('aria-label', 'Taal kiezen / Select language');
  fab.innerHTML =
    `<span id="i18n-fab-icon" aria-hidden="true">🌐</span>` +
    `<select id="i18n-select" aria-label="Taal / Language">` +
      SUPPORTED_LANGS.map(l =>
        `<option value="${l.code}"${l.code === 'nl' ? ' selected' : ''}>${l.label}</option>`
      ).join('') +
    `</select>` +
    `<span id="i18n-fab-caret" aria-hidden="true">▾</span>`;
  document.body.appendChild(fab);

  // ── Overlay element ──────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'i18n-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML =
    `<div id="i18n-overlay-bar">` +
      `<div id="i18n-spinner"></div>` +
      `<span id="i18n-overlay-text">Vertaling bezig…</span>` +
      `<div id="i18n-progress"><div id="i18n-progress-bar"></div></div>` +
    `</div>`;
  document.body.appendChild(overlay);

  // ── Language selector change ─────────────────────────────────────────────
  document.getElementById('i18n-select').addEventListener('change', e => {
    applyLanguage(e.target.value);
  });
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  PUBLIC API                                                               ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

const I18n = {
  /**
   * Initialise the translation system.
   * Call ONCE at the end of init() in index.html, after buildPanel(),
   * buildHotspots(), and buildEraSwitcher() have all completed.
   */
  init() {
    requestAnimationFrame(() => {
      stampAllNodes();
      buildSelector();
      document.documentElement.lang = 'nl';
    });
  },

  /**
   * Stamp a newly-created annotation entry and (if not in Dutch)
   * translate it immediately using the populated cache.
   *
   * Call from buildPanel() right after list.appendChild(entry):
   *   if (typeof I18n !== 'undefined') I18n.stampSubtree(entry);
   *
   * @param {Element} root - The newly appended .annotation-entry.
   */
  stampSubtree(root) {
    if (!root) return;

    ['  .entry-title', '.entry-date', '.entry-body > p',
     '.inscription-transcription', '.inscription-translation'].forEach(sel => {
      root.querySelectorAll(sel.trim()).forEach(el => stampNL(el));
    });

    if (_currentLang !== 'nl') {
      const items = [];
      root.querySelectorAll('[data-nl]').forEach(el => {
        const nl = el.getAttribute('data-nl');
        if (nl && nl.trim()) items.push({ el, nl });
      });
      if (items.length) {
        batchTranslate(items, _currentLang)
          .catch(err => console.warn('[i18n] stampSubtree:', err));
      }
    }
  },

  /** Currently active language code. */
  get currentLang() { return _currentLang; },

  /**
   * Programmatically switch language (e.g. restore from localStorage).
   * Also updates the <select> to match.
   * @param {string} code - 'nl' | 'en' | 'fr' | 'zh'
   */
  setLang(code) {
    const sel = document.getElementById('i18n-select');
    if (sel) sel.value = code;
    return applyLanguage(code);
  },
};

window.I18n = I18n;
