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

const state = {
  groups: [],
  filter: '',
  view: { mode: 'all', activeId: null, pages: {} },
  layout: { ...LAYOUT_DEFAULTS },
};
const uid = () => Math.random().toString(36).slice(2, 10);
const $ = (s) => document.querySelector(s);

const board = $('#board');
const tplGroup = $('#tpl-group');
const tplTile = $('#tpl-tile');

/* ---------- storage ---------- */

async function load() {
  const data = await chrome.storage.local.get(['groups', 'viewMode', 'layout', 'theme']);
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
  applyTheme();
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

function visibleGroups() {
  const groups = filteredGroups();
  if (state.view.mode === 'tabs' && !state.filter) return groups.filter(g => g.id === state.view.activeId);
  return groups;
}

function render() {
  board.innerHTML = '';
  if (state.view.mode === 'tabs') renderTabBar();
  const groups = visibleGroups();
  if (!groups.length) {
    board.innerHTML = '<div class="empty-hint">Brak wyników / dodaj grupę i kafelki (+ Grupa).</div>';
    return;
  }
  for (const g of groups) board.appendChild(renderGroup(g));
  $('#stats').textContent = `${state.groups.reduce((n, g) => n + g.tiles.length, 0)} kafelków w ${state.groups.length} grupach`;
}

function renderTabBar() {
  const bar = document.createElement('div');
  bar.className = 'tab-bar';
  bar.hidden = !!state.filter; // podczas szukania pokaż wszystkie dopasowania, bez kart
  for (const g of state.groups) {
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
      if (e.button === 1) { e.preventDefault(); removeGroup(g.id); }
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
  const plus = document.createElement('button');
  plus.className = 'tab-new';
  plus.title = 'Nowa grupa';
  plus.textContent = '+';
  plus.onclick = () => openGroupDialog(null);
  bar.appendChild(plus);
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
  if (!confirm(`Usunąć grupę "${g.name}" wraz z kafelkami?`)) return;
  state.groups.splice(idx, 1);
  if (state.view.activeId === id) {
    // jak karty w przeglądarce: aktywna staje się sąsiednia (następna, w braku poprzedniej)
    state.view.activeId = state.groups[Math.min(idx, state.groups.length - 1)]?.id ?? null;
  }
  if (modeIsTabs() && !state.view.activeId && state.groups.length) state.view.activeId = state.groups[0].id;
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
  if (modeIsTabs() && !state.groups.some(g => g.id === state.view.activeId)) {
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
  if (lbl) lbl.textContent = modeIsTabs() ? '✓ Zakładki grup' : 'Zakładki grup';
}

/* pkt 14: motyw dzień/noc */
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const lbl = $('#theme-label');
  if (lbl) lbl.textContent = state.theme === 'day' ? '☾ Tryb nocny' : '☀ Tryb dzienny';
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

  el.querySelector('.add-tile').onclick = () => openTileDialog(null, g.id);
  el.querySelector('.edit-group').onclick = () => openGroupDialog(g);
  el.querySelector('.del-group').onclick = () => removeGroup(g.id);

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

  a.querySelector('.edit-tile').onclick = (e) => { e.preventDefault(); e.stopPropagation(); openTileDialog(t, g.id); };
  a.querySelector('.del-tile').onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
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
  $('#dlg-group-title').textContent = group ? 'Edytuj grupę' : 'Nowa grupa';
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
  const PALETTE = ['var(--accent)', '#e5484d', '#46a758', '#00a2c7', '#ffb224', '#8e4ec6'];
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
  if (file.size > 50 * 1024 * 1024) { alert('Plik zbyt duży (limit 50 MB).'); return; }
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
      `Zaimportować ${groups.length} grup / ${tileCount} kafelków? Obecna zawartość zostanie zastąpiona.`
    );
    if (!ok) return;
    state.groups = groups;
    if (modeIsTabs()) state.view.activeId = groups[0]?.id ?? null;
    await save();
    render();
    toast(`Zaimportowano ${groups.length} grup / ${tileCount} kafelków — zapisano.`);
  }).catch(err => alert('Błąd importu: ' + err.message));
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
  await dbxLoadSettings();
  applyViewMode();
  syncViewMenu();

  // settings menu (gear, bottom-left)
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
    if (act === 'theme') toggleTheme();
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
    toast(`Układ: ${state.layout.cols} × ${state.layout.rows}${state.layout.paginate ? ' + strony' : ''}`);
  };

  $('#file-import').onchange = (e) => {
    if (e.target.files[0]) importJson(e.target.files[0]);
    e.target.value = '';
  };
}

document.addEventListener('DOMContentLoaded', init);
