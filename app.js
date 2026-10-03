/* Group Speed Dial — local-only new tab dial. Manifest V3, no remote code. */
'use strict';

const DEFAULTS = {
  groups: [
    { id: 'g1', name: 'Codzienne', color: 'var(--accent)', open: true, tiles: [
      { id: 't1', title: 'Gmail', url: 'https://mail.google.com' },
      { id: 't2', title: 'YouTube', url: 'https://youtube.com' },
      { id: 't3', title: 'X', url: 'https://x.com' },
      { id: 't4', title: 'GitHub', url: 'https://github.com' },
    ]},
    { id: 'g2', name: 'Dev', color: '#00a2c7', open: true, tiles: [
      { id: 't5', title: 'Hermes docs', url: 'https://hermes-agent.nousresearch.com/docs' },
      { id: 't6', title: 'MDN', url: 'https://developer.mozilla.org' },
    ]},
  ],
};

const LAYOUT_DEFAULTS = { cols: 6, rows: 4, paginate: true };

/* pkt 37: i18n PL/ENG — słownik + t() + applyLang(); domyślnie PL */
const I18N = {
  pl: {
    'search.ph': 'Szukaj wśród kafelków…',
    'menu.settings': 'Ustawienia', 'menu.view': 'Widok', 'menu.lang': 'Język',
    'menu.thumbnails': 'Miniatury', 'menu.topsites': 'Najczęściej odwiedzane',
    'label.topsites': 'Najczęściej odwiedzane', 'label.bookmarks': 'Zakładki',
    'btn.newGroup': 'Nowa grupa', 'btn.addTile': 'Dodaj kafelek',
    'btn.cancel': 'Anuluj', 'btn.save': 'Zapisz', 'btn.delete': 'Usuń',
    'dlg.tileTitle': 'Kafelek', 'dlg.groupTitle': 'Grupa',
    'dlg.dbxTitle': 'Dropbox – backup', 'dlg.dbxStatus': 'Status: ',
    'dlg.dbxConnect': 'Połącz z Dropboxem', 'dlg.dbxToken': 'Token OAuth (opcjonalnie)',
    'dlg.dbxDownload': 'Pobierz backup', 'dlg.dbxUpload': 'Wyślij backup',
    'dlg.dbxBackups': 'Backupów na Dropboxie: ',
    'dlg.dbxDownloadok': 'Pobrano backup.',
    'dlg.dbxDownloadempty': 'Brak backupu na Dropboxie.',
    'dlg.dbxUploadok': 'Backup wysłany.',
    'dlg.dbxBackupsok': 'Backupów na Dropboxie: ',
    'stat.tiles': 'kafelków w', 'stat.groups': 'grupach',
    'stat.thumbs': 'miniatur', 'stat.thumbErrors': 'błędów miniatur',
    'stat.thumbsPending': 'w kolejce',
    'stat.none': 'Brak kafelków', 'stat.noneGroup': 'Brak kafelków w grupie',
    'groups.saved': 'Zapisane zakładki', 'groups.history': 'Historia',
    'groups.downloads': 'Pobrane',
    'tile.edit': 'Edytuj kafelek', 'tile.delete': 'Usuń kafelek',
    'confirm.deleteTile': 'Usunąć kafelek?', 'confirm.deleteGroup': 'Usunąć grupę?',
    'toast.saved': 'Zapisano.', 'toast.deleted': 'Usunięto.',
    'toast.thumbError': 'Nie udało się zrobić miniatury: ',
    'toast.dbxOk': 'Gotowe.', 'toast.dbxErr': 'Błąd: ',
    'import.tooBig': 'Plik zbyt duży (limit 50 MB).',
    'import.done': 'Zaimportowano {groups} grup / {tiles} kafelków — zapisano.',
    'import.error': 'Błąd importu: ',
    'lbl.title': 'Tytuł', 'lbl.rowsLong': 'Liczba rzędów',
    'lbl.dbxTokenLong': 'Token dostępowy (OAuth2 Dropbox, scope files.content.write + files.content.read)',
    'hint.dbxAuto': 'Auto-backup przy każdej zmianie (co najmniej raz na 5 min)',
    'hint.paginate': 'Podziel na strony, gdy kafelków > cols × rzędy',
    'dlg.backup': '☁ Backup Dropbox', 'dlg.importTitle': 'Import backup',
    'btn.dbxRestore': 'Wczytaj z Dropbox', 'btn.dbxSave': 'Zapisz ustawienia',
    'btn.importDo': 'Importuj',
    'toast.layout': 'Układ: {c} × {r}',
    'import.confirm': 'Zaimportować {groups} grup / {tiles} kafelków? Obecna zawartość zostanie zastąpiona.',
    'dlg.editGroup': 'Edytuj grupę', 'dlg.newGroup': 'Nowa grupa',
    'dlg.layout': '▦ Układ kafelków', 'label.viewTabs': 'Zakładki grup',
    'badge.clicks': 'kliknięć w speed dialu',
    'common.on': 'wł.', 'common.off': 'wył.', 'common.pages': 'strony',
    'theme.day': 'Tryb dzienny', 'theme.night': 'Tryb nocny',
    'label.topsites': 'Najczęściej odwiedzane', 'label.viewAll': 'Zakładki: wszystkie',
    'lang.self': 'Język: polski',
    'confirm.deleteGroupFull': 'Usunąć grupę „{name}” wraz z kafelkami?',
    'stat.emptyHint': 'Brak wyników / dodaj grupę i kafelki (+ Grupa).',
  },
  en: {
    'search.ph': 'Search tiles…',
    'menu.settings': 'Settings', 'menu.view': 'View', 'menu.lang': 'Language',
    'menu.thumbnails': 'Thumbnails', 'menu.topsites': 'Most visited',
    'label.topsites': 'Most visited', 'label.bookmarks': 'Bookmarks',
    'btn.newGroup': 'New group', 'btn.addTile': 'Add tile',
    'btn.cancel': 'Cancel', 'btn.save': 'Save', 'btn.delete': 'Delete',
    'dlg.tileTitle': 'Tile', 'dlg.groupTitle': 'Group',
    'dlg.dbxTitle': 'Dropbox – backup', 'dlg.dbxStatus': 'Status: ',
    'dlg.dbxConnect': 'Connect to Dropbox', 'dlg.dbxToken': 'OAuth token (optional)',
    'dlg.dbxDownload': 'Download backup', 'dlg.dbxUpload': 'Send backup',
    'dlg.dbxBackups': 'Backups on Dropbox: ',
    'dlg.dbxDownloadok': 'Backup downloaded.',
    'dlg.dbxDownloadempty': 'No backup on Dropbox.',
    'dlg.dbxUploadok': 'Backup sent.',
    'dlg.dbxBackupsok': 'Backups on Dropbox: ',
    'stat.tiles': 'tiles in', 'stat.groups': 'groups',
    'stat.thumbs': 'thumbnails', 'stat.thumbErrors': 'thumb errors',
    'stat.thumbsPending': 'queued',
    'stat.none': 'No tiles', 'stat.noneGroup': 'No tiles in group',
    'groups.saved': 'Saved bookmarks', 'groups.history': 'History',
    'groups.downloads': 'Downloads',
    'tile.edit': 'Edit tile', 'tile.delete': 'Delete tile',
    'confirm.deleteTile': 'Delete tile?', 'confirm.deleteGroup': 'Delete group?',
    'toast.saved': 'Saved.', 'toast.deleted': 'Deleted.',
    'toast.thumbError': 'Thumbnail failed: ',
    'toast.dbxOk': 'Done.', 'toast.dbxErr': 'Error: ',
    'stat.emptyHint': 'No results / add a group and tiles (+ Group).',
    'confirm.deleteGroupFull': 'Delete group "{name}" with its tiles?',
    'common.on': 'on', 'common.off': 'off', 'common.pages': 'pages',
    'theme.day': 'Day mode', 'theme.night': 'Night mode',
    'label.topsites': 'Most visited', 'label.viewAll': 'Bookmarks: all',
    'lang.self': 'Language: English',
    'badge.clicks': 'speed-dial clicks',
    'dlg.editGroup': 'Edit group', 'dlg.newGroup': 'New group',
    'dlg.layout': '▦ Tile layout', 'label.viewTabs': 'Group tabs',
    'import.tooBig': 'File too large (50 MB limit).',
    'import.confirm': 'Import {groups} groups / {tiles} tiles? Current content will be replaced.',
    'import.done': 'Imported {groups} groups / {tiles} tiles — saved.',
    'import.error': 'Import error: ',
    'lbl.title': 'Title', 'lbl.rowsLong': 'Number of rows',
    'lbl.dbxTokenLong': 'Access token (OAuth2 Dropbox, scope files.content.write + files.content.read)',
    'hint.dbxAuto': 'Auto-backup on every change (at least once per 5 min)',
    'hint.paginate': 'Split into pages when tiles > cols × rows',
    'dlg.backup': '☁ Dropbox Backup', 'dlg.importTitle': 'Backup Import',
    'btn.dbxRestore': 'Load from Dropbox', 'btn.dbxSave': 'Save settings',
    'btn.importDo': 'Import',
    'toast.layout': 'Layout: {c} × {r}',
  },
};
const tr = (k) => (I18N[state.lang] && I18N[state.lang][k]) || I18N.pl[k] || k;

/* pkt 37: aplikuje tłumaczenia na elementy [data-i18n] + placeholder szukajki;
   wywoływana po init i po zmianie języka; re-renderuje UI (render, dialogi, menu) */
function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = tr(el.dataset.i18n);
  });
  const q = $('#q');
  if (q) q.placeholder = tr('search.ph');
  const bl = $('#btn-lang');
  if (bl) bl.textContent = state.lang === 'pl' ? 'EN' : 'PL';
  const ll = $('#lang-label');
  if (ll) ll.textContent = '🌐 ' + tr('lang.self');
  applyTheme(); // odświeża label motywu w aktywnym języku
}

const state = {
  groups: [],
  filter: '',
  view: { mode: 'all', activeId: null, pages: {} },
  layout: { ...LAYOUT_DEFAULTS },
  topSites: true, // pkt 24–25: pseudo-grupa „Najczęściej odwiedzane”
  lang: 'pl', // pkt 37: 'pl' | 'en'
};
const uid = () => Math.random().toString(36).slice(2, 10);
const $ = (s) => document.querySelector(s);

const board = $('#board');
const tplGroup = $('#tpl-group');
const tplTile = $('#tpl-tile');

/* ---------- storage ---------- */

async function load() {
  const data = await chrome.storage.local.get(['groups', 'viewMode', 'layout', 'theme', 'topSites', 'lang']);
  state.groups = Array.isArray(data.groups) && data.groups.length
    ? data.groups
    : structuredClone(DEFAULTS.groups);
  if (!data.groups || !data.groups.length) await save();
  state.view.mode = data.viewMode === 'tabs' ? 'tabs' : 'all';
  if (state.view.mode === 'tabs' && !state.groups.some(g => g.id === state.view.activeId)) {
    state.view.activeId = state.groups[0]?.id ?? null;
  }
  if (data.layout && typeof data.layout === 'object') {
    state.layout = {
      cols: clampInt(data.layout.cols, 1, 12, LAYOUT_DEFAULTS.cols),
      rows: clampInt(data.layout.rows, 1, 8, LAYOUT_DEFAULTS.rows),
      paginate: data.layout.paginate !== false,
    };
  }
  state.theme = data.theme === 'day' ? 'day' : 'night';
  state.lang = data.lang === 'en' ? 'en' : 'pl'; // pkt 37: domyślnie PL
  state.topSites = data.topSites !== false; // pkt 25: domyślnie włączone
  state.topStats = data.topSitesStats || { clicks: {}, hidden: [] }; // pkt 27: licznik + ukryte
  applyTheme();
  applyLang(); // pkt 37: statyczne labelki + placeholder szukajki
}

function clampInt(v, min, max, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
}

async function saveLayout() {
  await chrome.storage.local.set({ layout: state.layout });
}

async function save() {
  await chrome.storage.local.set({ groups: state.groups });
  dbxMaybeAutoBackup();
}

async function saveViewMode() {
  await chrome.storage.local.set({ viewMode: state.view.mode });
}

/* ---------- pkt 26: generator miniatur (kolejka, max 2 równoległe) ---------- */

const thumbQueue = []; // [{tile, groupId}]
let thumbActive = 0;
const THUMB_CONCURRENCY = 2;

function enqueueThumbs(tiles, groupId) {
  for (const t of tiles) {
    if (thumbQueue.some(q => q.tile.id === t.id)) continue; // bez duplikatów
    thumbQueue.push({ tile: t, groupId });
  }
  pumpThumbs();
}

function pumpThumbs() {
  while (thumbActive < THUMB_CONCURRENCY && thumbQueue.length) {
    const job = thumbQueue.shift();
    thumbActive++;
    makeThumb(job.tile, job.groupId)
      .catch(() => {}) // błąd = zostaje favicon, kolejka leci dalej
      .finally(() => { thumbActive--; pumpThumbs(); });
  }
}

function findTile(id) {
  for (const g of state.groups) {
    const t = g.tiles.find(t => t.id === id);
    if (t) return t;
  }
  return null;
}

async function makeThumb(tile, groupId) {
  if (!/^https?:/.test(tile.url)) throw new Error('not http(s)');
  // pkt 36: okno w obszarze ekranu (Chrome nie maluje okien poza ekranem,
  // przez co captureVisibleTab zwracał błąd); focused:false = nie kradnie fokusu
  const win = await chrome.windows.create({
    url: tile.url,
    type: 'popup',
    left: 0,
    top: 0,
    width: 1280,
    height: 800,
    focused: false,
  });
  const tab = win.tabs?.[0];
  if (!tab?.id) { await chrome.windows.remove(win.id); throw new Error('no tab'); }
  try {
    await chrome.tabs.update(tab.id, { active: true }); // captureVisibleTab łapie aktywne
    await waitTabsComplete(tab.id, 20000); // onload z limitem 20 s
    await sleep(1200); // time na JS/render strony
    let dataUrl;
    try {
      dataUrl = await chrome.tabs.captureVisibleTab(win.id, { format: 'jpeg', quality: 75 });
    } catch (e) {
      // pkt 36: brak uprawnień hosta lub okno wciąż niewymalowane — nie zapętlać kolejki
      tile.thumbError = true;
      await save();
      return;
    }
    tile.thumb = dataUrl;
    tile.thumbError = false;
    await save(); // persystencja do storage.local (unlimitedStorage)
    const live = findTile(tile.id);
    if (live) live.thumb = dataUrl;
    render(); // live update kafelka
  } finally {
    chrome.windows.remove(win.id).catch(() => {});
  }
}

function waitTabsComplete(tabId, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; chrome.tabs.onUpdated.removeListener(listener); resolve(); } };
    const listener = (id, info) => { if (id === tabId && info.status === 'complete') finish(); };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(finish, timeoutMs); // timeout = kontynuuj z tym co jest
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


/* ---------- helpers ---------- */

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function normalizeUrl(u) {
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

function faviconFor(url) {
  return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
}

function filteredGroups() {
  const f = state.filter.trim().toLowerCase();
  if (!f) return state.groups;
  return state.groups
    .map(g => ({ ...g, tiles: g.tiles.filter(t =>
      t.title.toLowerCase().includes(f) || t.url.toLowerCase().includes(f)) }))
    .filter(g => g.tiles.length || g.name.toLowerCase().includes(f));
}

/* ---------- rendering ---------- */

const TOP_SITES_ID = '__top_sites__'; // pkt 24: pseudo-grupa z chrome.topSites

async function fetchTopSites() {
  try {
    const sites = await chrome.topSites.get();
    state._topAll = (sites || []).map(s => ({ // pełna lista, bez cięcia
      title: s.title || new URL(s.url).hostname,
      url: s.url,
    }));
    return applyTopStats(state._topAll);
  } catch { return []; }
}

/* pkt 27: własny ranking — ukryte odpadają, kliknięte lecą wyżej (stabilnie),
   zdalna kolejność Brave zostaje dla remisów; pokazujemy top 10 */
function applyTopStats(list) {
  const { clicks = {}, hidden = [] } = state.topStats || {};
  return list
    .filter(t => !hidden.includes(t.url))
    .sort((a, b) => (clicks[b.url] || 0) - (clicks[a.url] || 0))
    .slice(0, 10)
    .map(t => ({ ...t, clicks: clicks[t.url] || 0 }));
}

function bumpTopSite(url) { // pkt 27: klik w kafelek top sites
  if (!url) return;
  state.topStats.clicks[url] = (state.topStats.clicks[url] || 0) + 1;
  chrome.storage.local.set({ topSitesStats: state.topStats });
  state.topTiles = applyTopStats(state._topAll || []);
  const badge = document.querySelector(`.group[data-id="${TOP_SITES_ID}"] .tile[data-url="${CSS.escape(url)}"] .top-clicks`); // aktualizacja badge bez pełnego re-renderu
  if (badge) badge.textContent = state.topStats.clicks[url];
}

function hideTopSite(url) { // pkt 27: ✕ ukrywa stronę z sekcji (do resetu w menu)
  if (!state.topStats.hidden.includes(url)) state.topStats.hidden.push(url);
  chrome.storage.local.set({ topSitesStats: state.topStats });
  state.topTiles = applyTopStats(state._topAll || []);
  render();
}

function resetTopStats() { // pkt 27: „↺ Reset" w menu ⚙ — kasuje licznik i ukryte
  state.topStats = { clicks: {}, hidden: [] };
  chrome.storage.local.set({ topSitesStats: state.topStats });
  state.topTiles = applyTopStats(state._topAll || []);
  render();
}

function tabGroups() {
  if (!state.topSites || !chrome.topSites) return state.groups; // pkt 25: wyłączone lub brak API
  return [{ id: TOP_SITES_ID, name: '★ ' + tr('label.topsites'), color: 'var(--accent)', tiles: state.topTiles || [], fixed: true }, ...state.groups]; // pkt 24: zawsze pierwsza od lewej
}

function visibleGroups() {
  if (state.view.mode === 'tabs' && !state.filter) {
    if (state.view.activeId === TOP_SITES_ID) {
      return [{ id: TOP_SITES_ID, name: '★ ' + tr('label.topsites'), color: 'var(--accent)', tiles: state.topTiles || [], fixed: true }];
    }
    const g = filteredGroups().find(g => g.id === state.view.activeId);
    return g ? [g] : [];
  }
  return filteredGroups();
}

function render() {
  board.innerHTML = '';
  if (state.view.mode === 'tabs') renderTabBar();
  const groups = visibleGroups();
  if (!groups.length) {
    board.innerHTML = '<div class="empty-hint">' + tr('stat.emptyHint') + '</div>';
    return;
  }
  for (const g of groups) board.appendChild(renderGroup(g));
  $('#stats').textContent = `${state.groups.reduce((n, g) => n + g.tiles.length, 0)} ${tr('stat.tiles')} ${state.groups.length} ${tr('stat.groups')}`;
  // pkt 36: licznik miniatur w prawym dolnym rogu
  const tAll = state.groups.reduce((n, g) => n + g.tiles.length, 0);
  const tThumb = state.groups.reduce((n, g) => n + g.tiles.filter(t => t.thumb).length, 0);
  const tErr = state.groups.reduce((n, g) => n + g.tiles.filter(t => t.thumbError).length, 0);
  const span = $('#thumb-stats');
  if (span) span.textContent = tErr ? `${tr('menu.thumbnails')}: ${tThumb}/${tAll} (${tr('stat.thumbErrors')}: ${tErr})` : `${tr('menu.thumbnails')}: ${tThumb}/${tAll}`;
}

function renderTabBar() {
  const bar = document.createElement('div');
  bar.className = 'tab-bar';
  bar.hidden = !!state.filter; // podczas szukania pokaż wszystkie dopasowania, bez kart
  const groups = tabGroups(); // pkt 24: zwykłe grupy + opcjonalna zakładka Top Sites
  for (const g of groups) {
    const tab = document.createElement('div');
    tab.className = 'tab' + (g.id === state.view.activeId ? ' active' : '');
    tab.dataset.id = g.id;
    tab.title = g.name;
    tab.style.setProperty('--gcolor', g.color);
    const lbl = document.createElement('span');
    lbl.className = 'tab-label';
    lbl.textContent = g.name;
    const cnt = document.createElement('span');
    cnt.className = 'tab-count';
    cnt.textContent = g.tiles.length ? String(g.tiles.length) : '';
    tab.append(lbl, cnt);
    tab.onclick = () => selectTab(g.id);
    tab.onauxclick = (e) => { // middle-click closes, jak w przeglądarce
      if (e.button === 1 && g.id !== TOP_SITES_ID) { e.preventDefault(); removeGroup(g.id); }
    };
    bar.appendChild(tab);
    // drag to reorder tabs
    tab.draggable = true;
    tab.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/x-tab', g.id);
      e.dataTransfer.effectAllowed = 'move';
      tab.classList.add('dragging');
    });
    tab.addEventListener('dragend', () => tab.classList.remove('dragging'));
    tab.addEventListener('dragover', (e) => {
      if (e.dataTransfer.types.includes('application/x-tab')) e.preventDefault();
    });
    tab.addEventListener('drop', (e) => {
      e.preventDefault();
      const srcId = e.dataTransfer.getData('application/x-tab');
      if (!srcId || srcId === g.id) return;
      moveGroup(srcId, g.id);
    });
  }
  // pkt 35: stary „+” z paska usunięty — zostaje tylko #btn-new-group w prawym górnym rogu
  board.appendChild(bar);
}

function selectTab(id) {
  state.view.activeId = id;
  render();
}

function removeGroup(id) {
  const idx = state.groups.findIndex(x => x.id === id);
  if (idx === -1) return;
  const g = state.groups[idx];
  if (!confirm(tr('confirm.deleteGroupFull').replace('{name}', g.name))) return;
  state.groups.splice(idx, 1);
  if (state.view.activeId === id) {
    // jak karty w przeglądarce: aktywna staje się sąsiednia (następna, w braku poprzedniej)
    state.view.activeId = state.groups[Math.min(idx, state.groups.length - 1)]?.id ?? null;
  }
  if (modeIsTabs() && !state.view.activeId && state.groups.length) state.view.activeId = tabGroups()[0].id; // pkt 24: pierwsza od lewej (może być Top Sites)
  save(); render();
}

function moveGroup(srcId, beforeId) {
  const from = state.groups.findIndex(g => g.id === srcId);
  const to = state.groups.findIndex(g => g.id === beforeId);
  if (from === -1 || to === -1 || from === to) return;
  const [g] = state.groups.splice(from, 1);
  state.groups.splice(to, 0, g);
  save(); render();
}

const modeIsTabs = () => state.view.mode === 'tabs';

function applyViewMode() {
  document.body.classList.toggle('view-tabs', modeIsTabs());
  if (modeIsTabs() && !state.groups.some(g => g.id === state.view.activeId)
      && state.view.activeId !== TOP_SITES_ID) { // pkt 24: zakładka Top Sites też może być aktywna
    state.view.activeId = state.groups[0]?.id ?? null;
  }
  render();
}

function toggleViewMode() {
  state.view.mode = modeIsTabs() ? 'all' : 'tabs';
  saveViewMode();
  applyViewMode();
  syncViewMenu();
}

function syncViewMenu() {
  const lbl = $('#view-label');
  if (lbl) lbl.textContent = (modeIsTabs() ? '✓ ' : '') + tr('label.bookmarks');
}

function syncTopSitesMenu() { // pkt 25
  const lbl = $('#topsites-label');
  if (lbl) lbl.textContent = '★ ' + tr('label.topsites') + ': ' + (state.topSites ? tr('common.on') : tr('common.off'));
}

/* pkt 14: motyw dzień/noc */
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const lbl = $('#theme-label');
  if (lbl) lbl.textContent = state.theme === 'day' ? '☾ ' + tr('theme.night') : '☀ ' + tr('theme.day'); // pkt 37
}

function toggleTheme() {
  state.theme = state.theme === 'day' ? 'night' : 'day';
  chrome.storage.local.set({ theme: state.theme });
  applyTheme();
}

function renderGroup(g) {
  const el = tplGroup.content.firstElementChild.cloneNode(true);
  el.dataset.id = g.id;
  el.style.setProperty('--gcolor', g.color);
  el.classList.toggle('open', g.open !== false);
  // pkt 19: w trybie zakładek bez nagłówka grupy (nazwa jest na zakładce)
  el.classList.toggle('no-head', state.view.mode === 'tabs');

  const h2 = el.querySelector('h2');
  h2.textContent = g.name;
  el.querySelector('.count').textContent = g.tiles.length ? `(${g.tiles.length})` : '';
  el.querySelector('.chev').onclick = () => { g.open = !(g.open !== false); save(); render(); };

  // double-click to rename inline
  h2.ondblclick = () => {
    h2.contentEditable = 'true';
    h2.focus();
    document.getSelection().selectAllChildren(h2);
  };
  h2.onblur = () => {
    h2.contentEditable = 'false';
    const v = h2.textContent.trim();
    if (v) { g.name = v; save(); }
    render();
  };
  h2.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); h2.blur(); } };

  const fixed = !!g.fixed; // pkt 24: „Najczęściej odwiedzane" — bez edycji/usuwania
  el.querySelector('.add-tile').onclick = fixed ? null : () => openTileDialog(null, g.id);
  el.querySelector('.thumb-group').onclick = fixed ? null : () => enqueueThumbs(g.tiles, g.id); // pkt 26
  el.querySelector('.edit-group').onclick = fixed ? null : () => openGroupDialog(g);
  el.querySelector('.del-group').onclick = fixed ? null : () => removeGroup(g.id);

  const tilesEl = el.querySelector('.tiles');
  // pkt 7–8: układ cols × rows z paginacją; kafelki wypełniają szerokość (1fr)
  const perPage = state.layout.cols * state.layout.rows;
  const doPaginate = state.layout.paginate && g.tiles.length > perPage;
  tilesEl.style.setProperty('--cols', state.layout.cols);
  tilesEl.classList.toggle('no-paginate', !state.layout.paginate);
  const page = clampInt(state.view.pages[g.id] ?? 0, 0, Math.max(0, Math.ceil(g.tiles.length / perPage) - 1), 0);
  state.view.pages[g.id] = page;
  const visible = doPaginate ? g.tiles.slice(page * perPage, (page + 1) * perPage) : g.tiles;
  for (const t of visible) tilesEl.appendChild(renderTile(t, g));
  if (doPaginate) tilesEl.appendChild(renderPageBar(g, page, Math.ceil(g.tiles.length / perPage)));

  // group header as drag target for moving whole groups? — keep simple: tile drag only
  enableGroupDrop(tilesEl, g);
  return el;
}

/* ---------- pagination ---------- */

function renderPageBar(g, page, pages) {
  const bar = document.createElement('div');
  bar.className = 'page-bar';
  const mk = (label, target, opts = {}) => {
    const b = document.createElement('button');
    b.className = 'page-btn' + (opts.cur ? ' cur' : '');
    b.textContent = label;
    if (opts.disabled) b.disabled = true;
    else b.onclick = () => { state.view.pages[g.id] = target; render(); };
    bar.appendChild(b);
  };
  mk('‹', page - 1, { disabled: page === 0 });
  const from = Math.max(0, Math.min(page - 1, pages - 3));
  for (let p = from; p < from + 3 && p < pages; p++) mk(String(p + 1), p, { cur: p === page });
  mk('›', page + 1, { disabled: page === pages - 1 });
  return bar;
}

function renderTile(t, g) {
  const a = tplTile.content.firstElementChild.cloneNode(true);
  a.href = t.url;
  a.dataset.id = t.id;
  a.querySelector('.t-title').textContent = t.title;
  a.querySelector('.t-host').textContent = hostOf(t.url);

  const isTop = g.id === TOP_SITES_ID; // pkt 27
  if (isTop) {
    a.classList.add('top-tile');
    a.dataset.url = t.url; // pkt 27: cel dla aktualizacji badge bez re-renderu
    a.addEventListener('click', () => bumpTopSite(t.url), true); // pkt 27: policz klik (capture, przed nawigacją)
    const badge = document.createElement('span');
    badge.className = 'top-clicks';
    badge.textContent = t.clicks ? String(t.clicks) : '';
    badge.title = tr('badge.clicks');
    a.appendChild(badge);
  }

  const img = a.querySelector('.fav');
  const letter = a.querySelector('.letter');
  if (t.thumb) {
    img.src = t.thumb; // własna miniaturka z backupu GSD
    a.classList.add('has-thumb'); // pkt 5: pokaż zrzut strony zamiast małej ikonki
  } else {
    img.src = faviconFor(t.url);
  }
  img.onload = () => { letter.hidden = true; };
  img.onerror = () => { img.hidden = true; letter.textContent = (t.title[0] || '?').toUpperCase(); };

  // pkt 18: mała favicon w pasku tytułu kafelka (pod zrzutem, jak w IMG2/IMG8)
  const capFav = a.querySelector('.cap-fav');
  capFav.src = faviconFor(t.url);
  capFav.onload = () => { capFav.classList.remove('cap-off'); };
  capFav.onerror = () => { capFav.classList.add('cap-off'); };

  a.querySelector('.edit-tile').onclick = (e) => { e.preventDefault(); e.stopPropagation(); openTileDialog(t, g.id); };
  a.querySelector('.del-tile').onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (isTop) { hideTopSite(t.url); return; } // pkt 27: w top sites ✕ = ukryj z sekcji
    g.tiles = g.tiles.filter(x => x.id !== t.id);
    save(); render();
  };

  // drag: move tile
  a.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('application/x-dial', JSON.stringify({ tileId: t.id, fromGroup: g.id }));
    e.dataTransfer.effectAllowed = 'move';
    a.classList.add('dragging');
  });
  a.addEventListener('dragend', () => a.classList.remove('dragging'));

  // drop before this tile
  a.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('application/x-dial')) {
      e.preventDefault();
      a.classList.add('drag-over');
    }
  });
  a.addEventListener('dragleave', () => a.classList.remove('drag-over'));
  a.addEventListener('drop', (e) => {
    e.preventDefault();
    a.classList.remove('drag-over');
    const payload = dragPayload(e);
    if (!payload) return;
    moveTile(payload, g.id, t.id);
  });

  return a;
}

function dragPayload(e) {
  try { return JSON.parse(e.dataTransfer.getData('application/x-dial')); }
  catch { return null; }
}

function moveTile({ tileId, fromGroup }, toGroupId, beforeTileId) {
  const from = state.groups.find(g => g.id === fromGroup);
  const to = state.groups.find(g => g.id === toGroupId);
  if (!from || !to) return;
  const idx = from.tiles.findIndex(t => t.id === tileId);
  if (idx === -1) return;
  const [tile] = from.tiles.splice(idx, 1);
  let pos = to.tiles.findIndex(t => t.id === beforeTileId);
  if (pos === -1 || from === to && pos > idx) pos = to.tiles.length;
  if (pos === -1) pos = to.tiles.length;
  to.tiles.splice(pos, 0, tile);
  save(); render();
}

function enableGroupDrop(tilesEl, g) {
  tilesEl.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('application/x-dial')) e.preventDefault();
  });
  tilesEl.addEventListener('drop', (e) => {
    if (e.target !== tilesEl) return; // tile-level drop handled on tiles
    e.preventDefault();
    const payload = dragPayload(e);
    if (payload) moveTile(payload, g.id, null);
  });
}

/* ---------- dialogs ---------- */

function openTileDialog(tile, groupId) {
  const dlg = $('#dlg');
  $('#dlg-title').textContent = tile ? 'Edytuj kafelek' : 'Dodaj kafelek';
  $('#f-title').value = tile ? tile.title : '';
  $('#f-url').value = tile ? tile.url : '';
  const sel = $('#f-group');
  sel.innerHTML = '';
  for (const g of state.groups) {
    const o = document.createElement('option');
    o.value = g.id; o.textContent = g.name;
    sel.appendChild(o);
  }
  sel.value = groupId || state.groups[0]?.id;
  dlg.showModal();
  $('#f-title').focus();

  $('#dlg-cancel').onclick = () => dlg.close();
  dlg.onclose = () => {
    if (dlg.returnValue !== 'ok') return;
    const title = $('#f-title').value.trim();
    const url = normalizeUrl($('#f-url').value.trim());
    const gid = sel.value;
    const g = state.groups.find(x => x.id === gid);
    if (!g || !title || !url) return;
    if (tile) {
      tile.title = title; tile.url = url;
      // move if group changed
      const oldG = state.groups.find(x => x.tiles.includes(tile));
      if (oldG && oldG !== g) {
        oldG.tiles = oldG.tiles.filter(t => t !== tile);
        g.tiles.push(tile);
      }
    } else {
      g.tiles.push({ id: uid(), title, url });
    }
    save(); render();
  };
  $('#dlg-ok').onclick = () => { dlg.returnValue = 'ok'; dlg.close(); };
}

function openGroupDialog(group) {
  const dlg = $('#dlg-group');
  $('#dlg-group-title').textContent = group ? tr('dlg.editGroup') : tr('dlg.newGroup');
  $('#f-group-name').value = group ? group.name : '';
  let color = group ? group.color : 'var(--accent)';
  const picker = $('#color-picker');
  const sync = () => picker.querySelectorAll('.swatch').forEach(s =>
    s.classList.toggle('selected', s.dataset.c === color));
  picker.onclick = (e) => {
    const s = e.target.closest('.swatch');
    if (s) { color = s.dataset.c; sync(); }
  };
  sync();
  dlg.showModal();
  $('#f-group-name').focus();

  $('#dlg-group-cancel').onclick = () => dlg.close();
  $('#dlg-group-ok').onclick = () => { dlg.returnValue = 'ok'; dlg.close(); };
  dlg.onclose = () => {
    if (dlg.returnValue !== 'ok') return;
    const name = $('#f-group-name').value.trim();
    if (!name) return;
    if (group) { group.name = name; group.color = color; }
    else {
      const ng = { id: uid(), name, color, open: true, tiles: [] };
      state.groups.push(ng);
      if (modeIsTabs()) state.view.activeId = ng.id; // nowa grupa = nowa aktywna karta
    }
    save(); render();
  };
}

/* ---------- Dropbox backup ---------- */

const DBX_PATH = '/speed-dial-backup.json';
const dbxState = { token: '', auto: true, lastPush: 0, busy: false };

async function dbxLoadSettings() {
  const s = await chrome.storage.local.get(['dbxToken', 'dbxAuto']);
  dbxState.token = s.dbxToken || '';
  dbxState.auto = s.dbxAuto !== false;
}

async function dbxSaveSettings(token, auto) {
  await chrome.storage.local.set({ dbxToken: token, dbxAuto: auto });
  dbxState.token = token;
  dbxState.auto = auto;
}

async function dbxRequest(endpoint, body, isJson = true) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + dbxState.token,
      ...(isJson ? { 'Content-Type': 'application/json' } : {}),
    },
    body: isJson ? JSON.stringify(body) : body,
  });
  if (!res.ok) {
    let msg = res.status + ' ' + res.statusText;
    try { const e = await res.json(); msg = e.error_summary || msg; } catch {}
    throw new Error('Dropbox: ' + msg);
  }
  return res;
}

async function dbxPush(silent = false) {
  if (!dbxState.token || dbxState.busy) return;
  dbxState.busy = true;
  try {
    const payload = JSON.stringify({ groups: state.groups, savedAt: new Date().toISOString() }, null, 2);
    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + dbxState.token,
        'Dropbox-API-Arg': JSON.stringify({ path: DBX_PATH, mode: 'overwrite', mute: true }),
      },
      body: payload,
    });
    if (!res.ok) {
      let msg = res.status + ' ' + res.statusText;
      try { const e = await res.json(); msg = e.error_summary || msg; } catch {}
      throw new Error('Dropbox: ' + msg);
    }
    dbxState.lastPush = Date.now();
    if (!silent) $('#dbx-status').textContent = '✓ Zapisano na Dropbox (' + new Date().toLocaleTimeString('pl-PL') + ')';
  } catch (e) {
    if (!silent) $('#dbx-status').textContent = '✗ ' + e.message;
    else console.warn(e);
  } finally {
    dbxState.busy = false;
  }
}

async function dbxRestore() {
  if (!dbxState.token) { alert('Najpierw podaj token.'); return; }
  $('#dbx-status').textContent = 'Pobieram…';
  try {
    const res = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + dbxState.token, 'Dropbox-API-Arg': JSON.stringify({ path: DBX_PATH }) },
    });
    if (!res.ok) {
      let msg = res.status + ' ' + res.statusText;
      try { const e = await res.json(); msg = e.error_summary || msg; } catch {}
      throw new Error(msg);
    }
    const data = await res.json();
    state.groups = sanitizeGroups(data.groups);
    await save();
    render();
    $('#dbx-status').textContent = '✓ Wczytano z Dropbox (' + data.savedAt + ')';
  } catch (e) {
    $('#dbx-status').textContent = '✗ ' + e.message;
  }
}

function dbxMaybeAutoBackup() {
  if (!dbxState.auto || !dbxState.token) return;
  if (Date.now() - dbxState.lastPush < 5 * 60 * 1000) return;
  dbxPush(true);
}

function openBackupDialog() {
  const dlg = $('#dlg-backup');
  $('#f-dbx-token').value = dbxState.token;
  $('#f-dbx-auto').checked = dbxState.auto;
  $('#dbx-status').textContent = '';
  dlg.showModal();
  $('#dlg-backup-cancel').onclick = () => dlg.close();
  $('#dlg-backup-ok').onclick = async () => {
    await dbxSaveSettings($('#f-dbx-token').value.trim(), $('#f-dbx-auto').checked);
    dlg.close();
    if (dbxState.token) dbxPush(); // immediate test-push
  };
  $('#btn-dbx-restore').onclick = () => dbxRestore();
}

/* ---------- import / export ---------- */

function exportJson() {
  const blob = new Blob([JSON.stringify({ groups: state.groups, savedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'speed-dial-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* Format oryginalnego Group Speed Dial: dataVersion/groups[].dials[]/___thumbnails[] */
function convertGsd(data) {
  if (!Array.isArray(data.groups)) throw new Error('bad format: brak groups');
  const thumbs = {};
  if (Array.isArray(data.___thumbnails)) {
    for (const t of data.___thumbnails) if (t.url && t.img) thumbs[t.url] = t.img;
  }
  const PALETTE = ['var(--accent)', '#e5484d', '#46a758', '#00a2c7', '#ffb224', '#8e4ec6', '#f76b15', '#12a594', '#e93a82', '#3e63dd']; // pkt 22: rozszerzona paleta
  const groups = data.groups
    .filter(g => g && !g.archived && Array.isArray(g.dials))
    .map((g, i) => ({
      id: uid(),
      name: (g.name || `Grupa ${i + 1}`).trim(),
      color: PALETTE[i % PALETTE.length],
      open: true,
      tiles: g.dials
        .filter(t => t && typeof t.url === 'string' && t.url.startsWith('http'))
        .map(t => {
          const tile = { id: uid(), title: (t.name || '').trim() || hostOf(t.url), url: t.url };
          const th = thumbs[t.url];
          if (th) tile.thumb = th;
          return tile;
        }),
    }))
    .filter(g => g.tiles.length || g.name);
  return groups;
}

/* ---------- import sanitization ---------- */

const okUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
const okColor = (c) => typeof c === 'string' && /^(#[0-9a-f]{3,8})$/i.test(c);

// filtruje grupy z niezaufanego JSON (import pliku / restore z Dropbox):
// wyrzuca całe niepoprawne grupy i pojedyncze kafelki ze złym URL-em
function sanitizeGroups(raw) {
  if (!Array.isArray(raw)) throw new Error('bad format');
  const out = [];
  for (const g of raw) {
    if (!g || typeof g.name !== 'string' || !Array.isArray(g.tiles)) continue;
    const tiles = g.tiles.filter(t => t && typeof t.title === 'string' && okUrl(t.url));
    if (!tiles.length) continue;
    out.push({
      id: typeof g.id === 'string' ? g.id : uid(),
      name: g.name,
      color: okColor(g.color) ? g.color : '#00a2c7',
      open: !!g.open,
      tiles: tiles.map(t => ({
        id: typeof t.id === 'string' ? t.id : uid(),
        title: t.title,
        url: t.url,
        ...(typeof t.thumb === 'string' && (okUrl(t.thumb) || t.thumb.startsWith('data:image/')) ? { thumb: t.thumb } : {}),
        ...(typeof t.img === 'string' && (okUrl(t.img) || t.img.startsWith('data:image/')) ? { img: t.img } : {}),
      })),
    });
  }
  if (!out.length) throw new Error('brak poprawnych grup w pliku');
  return out;
}

function importJson(file) {
  if (file.size > 50 * 1024 * 1024) { alert(tr('import.tooBig')); return; }
  file.text().then(async txt => {
    const data = JSON.parse(txt);
    let groups;
    if (data && typeof data.dataVersion === 'number' && Array.isArray(data.groups)) {
      groups = sanitizeGroups(convertGsd(data)); // backup oryginalnego Group Speed Dial
    } else if (Array.isArray(data.groups)) {
      groups = sanitizeGroups(data.groups); // nasz format
    } else {
      throw new Error('nieznany format');
    }
    const tileCount = groups.reduce((n, g) => n + g.tiles.length, 0);
    const ok = await confirmDlg(
      'Import backup',
      tr('import.confirm').replace('{groups}', groups.length).replace('{tiles}', tileCount)
    );
    if (!ok) return;
    state.groups = groups;
    if (modeIsTabs()) state.view.activeId = groups[0]?.id ?? null;
    await save();
    render();
    toast(tr('import.done').replace('{groups}', groups.length).replace('{tiles}', tileCount));
  }).catch(err => alert(tr('import.error') + err.message));
}

/* Własny confirm oparty o <dialog> — window.confirm bywa blokowane w MV3 new tab
   i wtedy po cichu zwraca false, przez co import nie zapisywał stanu. */
function confirmDlg(title, message) {
  return new Promise(resolve => {
    const dlg = $('#dlg-import');
    $('#dlg-import-title').textContent = title;
    $('#dlg-import-summary').textContent = message;
    const done = (v) => { dlg.close(); cleanup(); resolve(v); };
    const onBtn = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      done(b.value === 'ok');
    };
    const onCancel = () => { cleanup(); resolve(false); };
    const cleanup = () => {
      dlg.removeEventListener('click', onBtn);
      dlg.removeEventListener('cancel', onCancel);
    };
    dlg.addEventListener('click', onBtn);
    dlg.addEventListener('cancel', onCancel);
    dlg.showModal();
  });
}

function toast(msg, ms = 4000) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

/* ---------- init ---------- */

async function init() {
  await load();
  state.topTiles = await fetchTopSites(); // pkt 24
  await dbxLoadSettings();
  applyViewMode();
  syncViewMenu();
  syncTopSitesMenu();

  // settings menu (gear, bottom-left)
  $('#btn-new-group').onclick = () => openGroupDialog(null); // pkt 30: stały + w prawym górnym rogu
  const menu = $('#settings-menu');
  $('#btn-settings').onclick = (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  };
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== $('#btn-settings')) menu.hidden = true;
  });
  menu.onclick = (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    menu.hidden = true;
    if (act === 'import') $('#file-import').click();
    if (act === 'export') exportJson();
    if (act === 'backup') openBackupDialog();
    if (act === 'view') toggleViewMode();
    if (act === 'topsites') { // pkt 25
      state.topSites = !state.topSites;
      chrome.storage.local.set({ topSites: state.topSites });
      if (state.view.activeId === TOP_SITES_ID) state.view.activeId = state.groups[0]?.id ?? null;
      syncTopSitesMenu();
      render();
    }
    if (act === 'topreset') resetTopStats(); // pkt 27
    if (act === 'theme') toggleTheme();
    if (act === 'lang') { // pkt 37: przełącznik PL/ENG
      state.lang = state.lang === 'pl' ? 'en' : 'pl';
      chrome.storage.local.set({ lang: state.lang });
      applyLang();
      render();
    }
    if (act === 'layout') {
      fCols.value = state.layout.cols;
      fRows.value = state.layout.rows;
      fPag.checked = state.layout.paginate;
      dlgLayout.showModal();
    }
  };

  // dialog układu kafelków (pkt 7–8)
  const dlgLayout = $('#dlg-layout');
  const fCols = $('#f-cols'), fRows = $('#f-rows'), fPag = $('#f-paginate');
  dlgLayout.addEventListener('click', (e) => {
    if (e.target === dlgLayout) dlgLayout.close(); // klik w tło = anuluj
  });
  dlgLayout.addEventListener('cancel', () => dlgLayout.close());
  $('#dlg-layout-cancel').onclick = () => dlgLayout.close();
  $('#dlg-layout-ok').onclick = async () => {
    dlgLayout.close();
    state.layout = {
      cols: clampInt(parseInt(fCols.value, 10), 1, 12, LAYOUT_DEFAULTS.cols),
      rows: clampInt(parseInt(fRows.value, 10), 1, 12, LAYOUT_DEFAULTS.rows),
      paginate: fPag.checked,
    };
    state.view.pages = {};
    await saveLayout();
    render();
    toast(tr('toast.layout').replace('{c}', state.layout.cols).replace('{r}', state.layout.rows) + (state.layout.paginate ? ' + ' + tr('common.pages') : ''));
  };

  $('#file-import').onchange = (e) => {
    if (e.target.files[0]) importJson(e.target.files[0]);
    e.target.value = '';
  };
}

document.addEventListener('DOMContentLoaded', init);
