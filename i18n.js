// ═══════════════════════════════════════════════════════════════════════════
//  i18n.js — Real-time Client-Side Translation Layer  v3
//  Heritage 360° Viewer · Universiteit Antwerpen
//
//  HOW IT WORKS
//  ────────────
//  1. On I18n.init() (called after the DOM is fully built), every
//     translatable node gets a permanent data-nl attribute storing its
//     original Dutch innerHTML. This is the source of truth forever.
//
//  2. On language change, ALL data-nl nodes are first restored to Dutch,
//     then translateAll() fires: it strips HTML tags to get plain text,
//     batches all strings into one MyMemory request per batch-chunk,
//     and writes results back into the DOM.
//
//  3. Because we only ever rewrite innerHTML of LEAF nodes (.entry-title,
//     .entry-body > p, etc.), the structural wrappers that carry data-id,
//     data-goto, and event listeners are never touched. setActive(id) and
//     flyTo() remain fully functional after any language switch.
//
//  TRANSLATION API
//  ───────────────
//  Primary:  Google Translate (unofficial, no key, browser CORS open)
//            https://translate.googleapis.com/translate_a/single
//  Fallback: MyMemory (free, 500 req/day, no key needed)
//            https://api.mymemory.translated.net/get
//
//  Both work from any browser. The container build environment has no
//  network, but the end-user's browser will reach both fine.
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

// ── Configuration ──────────────────────────────────────────────────────────

const SUPPORTED_LANGS = [
  { code: 'nl', label: 'NL', name: 'Nederlands' },
  { code: 'en', label: 'EN', name: 'English'    },
  { code: 'fr', label: 'FR', name: 'Français'   },
  { code: 'zh', label: '中文', name: '中文'     },
];

// How many strings to pack per API call.
// Google Translate handles large queries fine; keep chunks manageable.
const CHUNK_SIZE = 20;

// Per-request timeout (ms)
const TIMEOUT_MS = 15000;

// ── Internal state ─────────────────────────────────────────────────────────

let _lang       = 'nl';   // current active language
let _busy       = false;  // true while a translation is running
let _queued     = null;   // language queued while busy

// Cache: Map<"lang::plainText", translatedText>
const _cache = new Map();

// ── DOM helpers ────────────────────────────────────────────────────────────

/**
 * Stamp el with its Dutch innerHTML as data-nl.
 * Idempotent — will never overwrite an existing stamp.
 */
function stamp(el, html) {
  if (!el || el.hasAttribute('data-nl')) return;
  el.setAttribute('data-nl', html !== undefined ? html : el.innerHTML);
}

/**
 * Which nodes hold translatable text.
 *
 * We target only LEAF nodes — nodes that contain text plus optional inline
 * markup (<strong>, <em>, <a>, <kbd>) but no other translatable descendants.
 * Structural wrappers (.annotation-entry, .hotspot, etc.) are never included
 * because they carry data-id / event listeners that must not be disturbed.
 */
const LEAF_SELECTORS = [
  // Topbar
  '#site-title', '#site-subtitle',
  // Side panel header
  '#panel-label', '#panel-heading', '#panel-meta',
  // Welcome overlay
  '#start-hint-intro', '#start-hint-close',
  '.sh-tab', '.sh-text',
  // Colophon
  '#sh-colophon-body',
  // Era switcher label
  '.era-label',
  // Annotation entries
  '.entry-title', '.entry-date', '.entry-body > p',
  // Inscription blocks — transcriptions are kept verbatim (original wall text);
  // the label ("Transcriptie") IS translated, the contents are not.
  // The authored translation note and the injected machine-translation are also translated.
  '.inscription-label', '.inscription-translation',
  // Viewer hint
  '#viewer-hint',
];

/** Stamp every translatable leaf node in the document with its Dutch source. */
function stampAll() {
  LEAF_SELECTORS.forEach(sel =>
    document.querySelectorAll(sel).forEach(el => stamp(el))
  );

  // Stamp era-btn title attributes (hover tooltip strings)
  document.querySelectorAll('.era-btn').forEach(btn => {
    if (!btn.dataset.nlTitle) btn.dataset.nlTitle = btn.title || '';
  });
}

// ── HTML ↔ plain text ──────────────────────────────────────────────────────

/**
 * Extract translatable plain-text segments from an HTML string.
 * Returns { text, restore } where restore(translatedText) => translated HTML.
 *
 * Strategy: replace tags with numbered placeholders ⟨0⟩ ⟨1⟩ … so the
 * translation API sees only prose. After translation we put the original tags
 * back by index. This preserves <strong>, <em>, <a href=…>, <kbd>, etc.
 *
 * The placeholder characters (⟨ ⟩) are outside the Basic Latin range and
 * extremely unlikely to appear in real heritage texts.
 */
function htmlToTranslatable(html) {
  const tags = [];
  const text = html.replace(/<[^>]+>/g, match => {
    const idx = tags.length;
    tags.push(match);
    return `\u27E8${idx}\u27E9`; // ⟨N⟩
  });
  function restore(translated) {
    return translated.replace(/\u27E8(\d+)\u27E9/g, (_, i) => tags[+i] || '');
  }
  return { text, restore };
}

// ── Translation API ────────────────────────────────────────────────────────

/**
 * Language code mapping: our UI codes → API-specific codes.
 * Google Translate requires 'zh-CN' for Simplified Chinese; 'zh' is rejected
 * or misrouted. MyMemory likewise expects 'zh-CN'.
 */
const LANG_MAP = { zh: 'zh-CN' };
function apiLang(code) { return LANG_MAP[code] || code; }

/**
 * Translate one plain-text string using the Google Translate unofficial API.
 * Throws on network error or non-200 response.
 *
 * This endpoint is used by many open-source projects. It has no CORS
 * restriction when called from a browser. There is no official SLA but
 * it has been stable for many years.
 *
 * @param {string} text       – Plain text (no HTML tags)
 * @param {string} targetLang – e.g. 'en', 'fr', 'zh'
 * @returns {Promise<string>} – Translated plain text
 */
async function googleTranslate(text, targetLang) {
  const url =
    'https://translate.googleapis.com/translate_a/single' +
    `?client=gtx&sl=nl&tl=${apiLang(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;

  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Response structure: [[["translatedSegment","original",...], ...], ...]
    const translated = json[0].map(seg => seg[0]).join('');
    return translated;
  } finally {
    clearTimeout(tid);
  }
}

/**
 * Fallback: MyMemory free translation API.
 * 500 requests/day without a key; supports nl→en/fr/zh.
 *
 * @param {string} text
 * @param {string} targetLang
 * @returns {Promise<string>}
 */
async function myMemoryTranslate(text, targetLang) {
  const url =
    `https://api.mymemory.translated.net/get` +
    `?q=${encodeURIComponent(text)}&langpair=nl|${apiLang(targetLang)}`;

  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.responseStatus !== 200) throw new Error(`MyMemory ${json.responseStatus}`);
    return json.responseData.translatedText;
  } finally {
    clearTimeout(tid);
  }
}

/**
 * Translate one plain-text string from NL to targetLang.
 * Tries Google first, falls back to MyMemory, then returns original on failure.
 * Results are cached so switching back to a visited language is instant.
 *
 * @param {string} text
 * @param {string} targetLang
 * @returns {Promise<string>}
 */
async function translateText(text, targetLang) {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const key = `${targetLang}::${trimmed}`;
  if (_cache.has(key)) return _cache.get(key);

  let result = trimmed;
  try {
    result = await googleTranslate(trimmed, targetLang);
  } catch (e1) {
    try {
      result = await myMemoryTranslate(trimmed, targetLang);
    } catch (e2) {
      console.warn('[i18n] Both APIs failed for:', trimmed.slice(0, 60), e2.message);
      // Graceful degradation: keep Dutch text
    }
  }

  _cache.set(key, result);
  return result;
}

/**
 * Translate an HTML string: strip tags → translate text → reinsert tags.
 *
 * @param {string} html
 * @param {string} targetLang
 * @returns {Promise<string>} – Translated HTML with original tags restored
 */
async function translateHTML(html, targetLang) {
  if (!html || !html.trim()) return html;
  const { text, restore } = htmlToTranslatable(html);
  // If the HTML was only tags (no text content), skip the API call
  if (!text.replace(/\u27E8\d+\u27E9/g, '').trim()) return html;
  const translated = await translateText(text, targetLang);
  return restore(translated);
}

/**
 * Translate an array of { el, nl } objects in chunks of CHUNK_SIZE.
 * Within each chunk all requests run in parallel; chunks run sequentially
 * to avoid rate-limiting.
 *
 * After each chunk completes, onProgress(done, total) is called so the
 * caller can update a progress bar.
 *
 * @param {Array<{el:Element, nl:string}>} items
 * @param {string}   targetLang
 * @param {Function} onProgress
 */
async function translateBatch(items, targetLang, onProgress) {
  let done = 0;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map(({ nl }) => translateHTML(nl, targetLang))
    );
    results.forEach((translated, j) => {
      chunk[j].el.innerHTML = translated;
    });
    done += chunk.length;
    onProgress(done, items.length);
  }
}

// ── Overlay / progress / toast ─────────────────────────────────────────────

function showOverlay(msg) {
  const ov = document.getElementById('i18n-overlay');
  const tx = document.getElementById('i18n-overlay-text');
  if (tx) tx.textContent = msg;
  if (ov) ov.classList.add('visible');
  setProgress(0);
}

function hideOverlay() {
  setProgress(100);
  setTimeout(() => {
    const ov = document.getElementById('i18n-overlay');
    if (ov) ov.classList.remove('visible');
    setProgress(0);
  }, 300);
}

function setProgress(pct) {
  const bar = document.getElementById('i18n-progress-bar');
  if (!bar) return;
  if (pct > 0 && pct < 100) {
    bar.style.animation  = 'none';
    bar.style.marginLeft = '0';
    bar.style.width      = pct + '%';
  } else {
    // Restore indeterminate animation
    bar.style.animation  = '';
    bar.style.marginLeft = '';
    bar.style.width      = '';
  }
}

function showToast(msg) {
  const old = document.getElementById('i18n-toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'i18n-toast';
  t.setAttribute('role', 'alert');
  t.innerHTML = `<span>⚠</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 3800);
  setTimeout(() => t.remove(), 4400);
}

// ── Core: applyLanguage ────────────────────────────────────────────────────

/**
 * Switch the viewer to targetLang.
 *
 * 1. If busy → queue and return (will auto-apply when current finishes).
 * 2. Restore all [data-nl] nodes to Dutch (instant).
 * 3. If nl → done.
 * 4. Collect stamped nodes, translate in chunks, write back.
 * 5. Sync tooltips, era titles, dynamic button labels.
 * 6. Drain queue.
 */
async function applyLanguage(targetLang) {
  if (_busy) {
    _queued = targetLang;
    return;
  }
  if (targetLang === _lang) return;

  _lang   = targetLang;
  _queued = null;

  // Step 2 — restore Dutch source into every stamped node
  document.querySelectorAll('[data-nl]').forEach(el => {
    el.innerHTML = el.getAttribute('data-nl');
  });
  document.documentElement.lang = targetLang;
  document.querySelectorAll('.era-btn[data-nl-title]').forEach(btn => {
    btn.title = btn.dataset.nlTitle;
  });

  if (targetLang === 'nl') {
    syncDynamicLabels('nl');
    syncTopbarLang('nl');
    // Remove any injected machine-translation divs from inscription blocks
    document.querySelectorAll('.inscription-i18n').forEach(el => el.remove());
    return;
  }

  // Step 3 — overlay
  _busy = true;
  const msgs = { en: 'Translating…', fr: 'Traduction en cours…', zh: '翻译中…' };
  showOverlay(msgs[targetLang] || 'Translating…');

  let failed = false;
  try {
    // Step 4 — collect and translate all stamped nodes
    const items = [];
    document.querySelectorAll('[data-nl]').forEach(el => {
      const nl = el.getAttribute('data-nl');
      if (nl && nl.trim()) items.push({ el, nl });
    });

    await translateBatch(items, targetLang, (done, total) => {
      setProgress(Math.round((done / total) * 100));
    });

    // Step 5a — sync hotspot tooltips from already-translated panel titles.
    // The coordinate→panel link (.hotspot[data-id] → .annotation-entry[data-id])
    // is purely by data-id and survives innerHTML changes to child nodes.
    document.querySelectorAll('.hotspot[data-id]').forEach(hs => {
      const tip = hs.querySelector('.hotspot-tooltip');
      if (!tip) return;
      const title = document.querySelector(
        `.annotation-entry[data-id="${hs.dataset.id}"] .entry-title`
      );
      if (title) tip.textContent = title.textContent;
    });

    // Step 5b — translate era-btn title attributes
    await Promise.all(
      Array.from(document.querySelectorAll('.era-btn[data-nl-title]')).map(async btn => {
        const nl = btn.dataset.nlTitle;
        if (nl) btn.title = await translateHTML(nl, targetLang);
      })
    );

    // Step 5c — dynamic UI labels (buttons that viewer JS changes at runtime)
    await syncDynamicLabels(targetLang);
    syncTopbarLang(targetLang);

    // Step 5d — inject live machine-translation of each inscription transcription.
    // The .inscription-transcription div itself is NEVER touched (original wall text
    // stays verbatim in Dutch). Instead we inject a .inscription-i18n div directly
    // below it, showing the translated text in the active language.
    await syncInscriptionTranslations(targetLang);

  } catch (err) {
    console.error('[i18n] Fatal:', err);
    failed = true;
    // Revert to Dutch on catastrophic error
    document.querySelectorAll('[data-nl]').forEach(el => {
      el.innerHTML = el.getAttribute('data-nl');
    });
    document.documentElement.lang = 'nl';
    _lang = 'nl';
    syncTopbarLang('nl');
    const sel = document.getElementById('i18n-lang');
    if (sel) sel.value = 'nl';

  } finally {
    hideOverlay();
    _busy = false;

    if (failed) {
      const lg = SUPPORTED_LANGS.find(l => l.code === targetLang);
      showToast(`Vertaling naar <strong>${lg ? lg.label : targetLang}</strong> mislukt. Nederlandse tekst blijft zichtbaar.`);
    }

    // Step 6 — drain queue
    if (_queued && _queued !== _lang) {
      const next = _queued;
      _queued = null;
      await applyLanguage(next);
    }
  }
}

/**
 * For every inscription block in the panel, inject (or refresh) a
 * .inscription-i18n div that shows the transcription translated into
 * targetLang. The original .inscription-transcription is never modified.
 *
 * Strategy:
 *  - Extract plain text from the transcription lines (strip .line-num spans).
 *  - Translate with the normal translateText() pipeline (cached).
 *  - Insert the result as a new labelled block directly after the transcription.
 *
 * Label localisation — "Translation" in each supported language:
 *   en → Translation  fr → Traduction  zh → 翻译
 *
 * @param {string} targetLang
 */
async function syncInscriptionTranslations(targetLang) {
  // Label for the injected block in each target language
  const LABELS = { en: 'Translation', fr: 'Traduction', zh: '翻译' };
  const label = LABELS[targetLang] || 'Translation';

  // Remove stale injections from a previous language switch first
  document.querySelectorAll('.inscription-i18n').forEach(el => el.remove());

  const blocks = document.querySelectorAll('.inscription-block');
  await Promise.all(Array.from(blocks).map(async block => {
    const transcEl = block.querySelector('.inscription-transcription');
    if (!transcEl) return;

    // Collect the plain text of each line, skipping the .line-num counter span.
    // We join lines with " / " so the translator sees a coherent sentence rather
    // than an abrupt newline that some APIs interpret as separate sentences.
    const lines = Array.from(transcEl.querySelectorAll('.line')).map(lineEl => {
      // Clone the line, remove the line-num span, return remaining text
      const clone = lineEl.cloneNode(true);
      clone.querySelectorAll('.line-num').forEach(n => n.remove());
      return clone.textContent.trim();
    }).filter(Boolean);

    if (!lines.length) return;
    const sourceText = lines.join(' / ');

    // Translate — result comes from cache if this transcription was already
    // translated during the current session
    const translated = await translateText(sourceText, targetLang);

    // Build the injected div
    const div = document.createElement('div');
    div.className = 'inscription-i18n';
    div.innerHTML =
      `<span class="inscription-i18n-label">${label}</span>` +
      `<span class="inscription-i18n-text">${translated}</span>`;

    // Insert directly after the transcription (before any existing
    // .inscription-translation authored note, if present)
    transcEl.insertAdjacentElement('afterend', div);
  }));
}

/**
 * Translate or restore the dynamic button labels that the viewer JS
 * controls programmatically (autoplay, panel toggle, "Zie ook", "Bekijk in 360°").
 * Results are stored in window._i18nLabels for the viewer to consume.
 */
async function syncDynamicLabels(targetLang) {
  const NL = {
    autoplayStart: '⟳ Rondleiding',
    autoplayStop:  '⏹ Stop',
    panelShow:     'Details ◧',
    panelHide:     'Details ◨',
    seeAlso:       'Zie ook',
    lookAt:        'Bekijk in 360°',
  };

  let L;
  if (targetLang === 'nl') {
    L = { ...NL };
  } else {
    const keys    = Object.keys(NL);
    const results = await Promise.all(keys.map(k => translateHTML(NL[k], targetLang)));
    L = {};
    keys.forEach((k, i) => { L[k] = results[i]; });
  }
  window._i18nLabels = L;

  // Apply immediately to any currently-rendered instances
  const autoBtn = document.getElementById('btn-autoplay');
  if (autoBtn) {
    autoBtn.textContent = autoBtn.textContent.startsWith('⏹') ? L.autoplayStop : L.autoplayStart;
  }
  const toggleBtn = document.getElementById('btn-toggle-panel');
  if (toggleBtn) {
    toggleBtn.textContent = toggleBtn.textContent.includes('◨') ? L.panelHide : L.panelShow;
  }
  document.querySelectorAll('.see-also-label').forEach(el => { el.textContent = L.seeAlso; });
  document.querySelectorAll('.look-at-btn').forEach(btn => {
    const svg = btn.querySelector('svg');
    btn.textContent = L.lookAt;
    if (svg) btn.insertBefore(svg, btn.firstChild);
  });
}

/** Update the topbar language indicator to show active language. */
function syncTopbarLang(lang) {
  const el = document.getElementById('i18n-lang');
  if (el) el.value = lang;
  // Visual active state on topbar buttons
  document.querySelectorAll('.i18n-lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

// ── Widget: topbar integration + overlay ───────────────────────────────────

function buildUI() {
  injectStyles();
  buildTopbarSelector();
  buildOverlay();
}

function buildTopbarSelector() {
  // Find the controls div in the topbar and inject the selector there
  const controls = document.querySelector('#topbar .controls');
  if (!controls) return;

  const wrap = document.createElement('div');
  wrap.id = 'i18n-topbar-wrap';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Taal / Language');

  // Compact button group — each language as a button for clarity on desktop,
  // collapses to a <select> on narrow viewports via CSS
  wrap.innerHTML =
    // Pill button group (desktop)
    `<div id="i18n-btns" aria-hidden="false">` +
      SUPPORTED_LANGS.map(l =>
        `<button class="i18n-lang-btn${l.code === 'nl' ? ' active' : ''}" ` +
        `data-lang="${l.code}" title="${l.name}" aria-label="${l.name}">${l.label}</button>`
      ).join('') +
    `</div>` +
    // Compact <select> (mobile)
    `<select id="i18n-lang" aria-label="Taal / Language">` +
      SUPPORTED_LANGS.map(l =>
        `<option value="${l.code}"${l.code === 'nl' ? ' selected' : ''}>${l.label}</option>`
      ).join('') +
    `</select>`;

  // Insert BEFORE the ⓘ button so it sits naturally in the controls row
  const infoBtn = document.getElementById('btn-info');
  controls.insertBefore(wrap, infoBtn || null);

  // Button-group click handler
  wrap.querySelectorAll('.i18n-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
  });

  // <select> handler (mobile)
  wrap.querySelector('#i18n-lang').addEventListener('change', e => {
    applyLanguage(e.target.value);
  });
}

function buildOverlay() {
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
}

function injectStyles() {
  const s = document.createElement('style');
  s.id = 'i18n-styles';
  s.textContent = `
    /* ─── Topbar language selector ────────────────────────────────── */

    #i18n-topbar-wrap {
      display: flex;
      align-items: center;
    }

    /* Desktop: pill button group */
    #i18n-btns {
      display: flex;
      align-items: center;
      gap: 1px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 2px;
      padding: 2px;
      overflow: hidden;
    }

    .i18n-lang-btn {
      background: transparent;
      border: 1px solid transparent;
      color: rgba(200,217,216,0.6);
      font-family: var(--sans,'Source Sans 3',Arial,sans-serif);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 3px 9px;
      cursor: pointer;
      border-radius: 1px;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      white-space: nowrap;
      line-height: 1.6;
    }
    .i18n-lang-btn:hover {
      background: rgba(255,255,255,0.12);
      color: #fff;
    }
    .i18n-lang-btn.active {
      background: var(--ua-teal, #82A1AD);
      border-color: var(--ua-teal, #82A1AD);
      color: #fff;
    }
    /* Spinning ring while translating: dim active btn */
    #i18n-overlay.visible ~ * .i18n-lang-btn.active,
    body.i18n-busy .i18n-lang-btn.active {
      opacity: 0.65;
    }

    /* Mobile: hide pill group, show <select> */
    #i18n-lang { display: none; }

    @media (max-width: 600px) {
      #i18n-btns { display: none; }
      #i18n-lang {
        display: block;
        appearance: none;
        -webkit-appearance: none;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 2px;
        color: rgba(200,217,216,0.9);
        font-family: var(--sans,'Source Sans 3',Arial,sans-serif);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 4px 8px;
        height: 28px;
        cursor: pointer;
        color-scheme: dark;
      }
      #i18n-lang option { background: #002e65; color: #fff; }
    }

    /* ─── Translation progress overlay ────────────────────────────── */

    #i18n-overlay {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 7800;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 14px;
    }
    #i18n-overlay.visible { opacity: 1; }

    #i18n-overlay-bar {
      background: var(--ua-blue, #002e65);
      border: 1px solid rgba(130,161,173,0.3);
      border-top: 3px solid var(--ua-teal, #82A1AD);
      padding: 8px 18px 8px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: var(--sans,'Source Sans 3',Arial,sans-serif);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: rgba(200,217,216,0.85);
      box-shadow: 0 -2px 16px rgba(0,46,101,0.4);
      border-radius: 1px;
    }

    #i18n-spinner {
      width: 13px; height: 13px;
      border: 2px solid rgba(130,161,173,0.18);
      border-top-color: var(--ua-teal, #82A1AD);
      border-radius: 50%;
      animation: i18n-spin 0.65s linear infinite;
      flex-shrink: 0;
    }
    @keyframes i18n-spin { to { transform: rotate(360deg); } }

    #i18n-progress {
      width: 100px; height: 2px;
      background: rgba(200,217,216,0.08);
      border-radius: 1px;
      overflow: hidden;
      flex-shrink: 0;
    }
    #i18n-progress-bar {
      height: 100%;
      background: var(--ua-teal, #82A1AD);
      width: 0;
      transition: width 0.15s ease;
      animation: i18n-prog 1.5s ease-in-out infinite;
    }
    @keyframes i18n-prog {
      0%   { width:0%;  margin-left:0;    }
      50%  { width:60%; margin-left:20%;  }
      100% { width:0%;  margin-left:100%; }
    }

    /* ─── Error toast ─────────────────────────────────────────────── */

    #i18n-toast {
      position: fixed;
      bottom: 70px; left: 50%;
      transform: translateX(-50%);
      z-index: 9200;
      background: var(--ua-blue, #002e65);
      border: 1px solid rgba(234,44,56,0.4);
      border-top: 3px solid var(--ua-red, #ea2c38);
      color: rgba(200,217,216,0.9);
      font-family: var(--sans,'Source Sans 3',Arial,sans-serif);
      font-size: 12px; font-weight: 600;
      padding: 9px 16px;
      display: flex; align-items: center; gap: 8px;
      box-shadow: 0 4px 18px rgba(0,0,0,0.35);
      border-radius: 2px;
      max-width: 90vw;
      pointer-events: none;
      animation: i18n-toast-in 0.22s ease forwards;
    }
    #i18n-toast strong { color: #fff; }
    #i18n-toast.out { animation: i18n-toast-out 0.28s ease forwards; }
    @keyframes i18n-toast-in  { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
    @keyframes i18n-toast-out { from{opacity:1} to{opacity:0;transform:translateX(-50%) translateY(6px)} }

    /* ─── Injected inscription translation block ──────────────────── */

    .inscription-i18n {
      margin: 0;
      padding: 8px 10px 10px;
      border-top: 1px solid var(--ua-teal-light, #C8D9D8);
      border-left: 2px solid var(--ua-teal, #82A1AD);
      background: rgba(130,161,173,0.06);
    }

    .inscription-i18n-label {
      display: block;
      font-family: var(--sans, 'Source Sans 3', Arial, sans-serif);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ua-teal-dark, #5c7e8a);
      margin-bottom: 4px;
    }

    .inscription-i18n-text {
      display: block;
      font-family: var(--sans, 'Source Sans 3', Arial, sans-serif);
      font-size: 12.5px;
      font-style: italic;
      line-height: 1.65;
      color: var(--ua-text-soft, #4a5568);
    }
  `;
  document.head.appendChild(s);
}

// ── Public API ─────────────────────────────────────────────────────────────

const I18n = {
  /**
   * Call ONCE at the end of init() in index.html, after buildPanel(),
   * buildHotspots(), and buildEraSwitcher() have all run.
   */
  init() {
    // rAF ensures all synchronous DOM writes in init() have flushed
    requestAnimationFrame(() => {
      stampAll();
      buildUI();
      document.documentElement.lang = 'nl';
    });
  },

  /**
   * Stamp a newly-built annotation entry and translate it immediately
   * if a non-Dutch language is already active.
   * Call from buildPanel() after list.appendChild(entry).
   */
  stampSubtree(root) {
    if (!root) return;
    ['.entry-title', '.entry-date', '.entry-body > p',
     '.inscription-translation'].forEach(sel => {
      root.querySelectorAll(sel).forEach(el => stamp(el));
    });
    if (_lang !== 'nl') {
      const items = [];
      root.querySelectorAll('[data-nl]').forEach(el => {
        const nl = el.getAttribute('data-nl');
        if (nl && nl.trim()) items.push({ el, nl });
      });
      if (items.length) {
        translateBatch(items, _lang, () => {}).catch(console.warn);
      }
    }
  },

  get currentLang() { return _lang; },

  setLang(code) {
    syncTopbarLang(code);
    return applyLanguage(code);
  },
};

window.I18n = I18n;
