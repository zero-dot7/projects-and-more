/* Test harness: injects chrome.* mock BEFORE app.js and stubs extension-only APIs. */
(function () {
  const store = {};
  window.__store = store;
  const sessionStore = {}; // pkt 1 (Ctrl+Q): osobny obszar session
  window.__session = sessionStore;
  // pkt 54: testowy app key dla OAuth flow (produkcyjnie pusty = disabled)
  window.__TEST_DBX_APP_KEY = 'testappkey';
  Object.defineProperty(window, 'chrome', {
    value: {
      runtime: { id: 'testextensionid' },
      storage: {
        local: {
          async get(k) {
            if (typeof k === 'string') return k in store ? { [k]: store[k] } : {};
            if (Array.isArray(k)) return Object.fromEntries(k.filter(x => x in store).map(x => [x, store[x]]));
            const out = {};
            for (const key of Object.keys(k)) if (key in store) out[key] = store[key];
            return out;
          },
          async set(obj) { Object.assign(store, obj); },
        },
        sync: { // pkt 54: app key trzymany w storage.sync (alias tego samego store w mocku)
          async get(k) {
            if (typeof k === 'string') return k in store ? { [k]: store[k] } : {};
            if (Array.isArray(k)) return Object.fromEntries(k.filter(x => x in store).map(x => [x, store[x]]));
            const out = {};
            for (const key of Object.keys(k)) if (key in store) out[key] = store[key];
            return out;
          },
          async set(obj) { Object.assign(store, obj); },
          async remove(k) { delete store[k]; },
        },
        session: { // Ctrl+Q quick-add
          async get(k) {
            if (typeof k === 'string') return k in sessionStore ? { [k]: sessionStore[k] } : {};
            const out = {};
            for (const key of Object.keys(k)) if (key in sessionStore) out[key] = sessionStore[key];
            return out;
          },
          async set(obj) { Object.assign(sessionStore, obj); },
          async remove(k) { delete sessionStore[k]; },
        },
      },
      identity: { // pkt 54 mock: launchWebAuthFlow zwraca redirect z code
        launchWebAuthFlow(o, cb) {
          window.__authFlows = window.__authFlows || [];
          window.__authFlows.push({ url: o.url, interactive: o.interactive });
          const ru = decodeURIComponent(o.url.split('redirect_uri=')[1].split('&')[0]);
          cb(ru + '?code=testcode123');
        },
      },
      windows: { // pkt 26 mock
        async create(o) {
          window.__thumbWins = window.__thumbWins || [];
          window.__thumbWins.push(o);
          return { id: 900 + window.__thumbWins.length, tabs: [{ id: 500 + window.__thumbWins.length }] };
        },
        async remove(id) {
          window.__thumbRemoved = window.__thumbRemoved || [];
          window.__thumbRemoved.push(id);
        },
      },
      tabs: { // pkt 26 mock
        onUpdated: {
          _ls: [],
          addListener(fn) { this._ls.push(fn); },
          removeListener(fn) { this._ls = this._ls.filter(f => f !== fn); },
          fire(id, info) { for (const fn of [...this._ls]) fn(id, info); },
        },
        async update(id, o) { setTimeout(() => chrome.tabs.onUpdated.fire(id, { status: 'complete' }), 10); return { id }; },
        __captures: window.__captures = [],
        async captureVisibleTab(winId, opts) { // pkt 26: pod chrome.tabs jak w prawdziwym API
          window.__captures.push({ winId, opts });
          return 'data:image/jpeg;base64,THUMB' + winId;
        },
      },
    },
    writable: false,
  });

  // fetch mock: Dropbox endpoints
  const realFetch = window.fetch.bind(window);
  window.__dbxCalls = [];
  window.__TEST_NO_AUTO_THUMB = true; // testy sterują auto-podglądem jawnie (sekcja auto-thumb)
  window.fetch = async (url, opts = {}) => {
    if (String(url).endsWith('/oauth2/token')) {
      window.__dbxCalls.push({ url: String(url), body: opts.body });
      return new Response(JSON.stringify({ access_token: 'sl.testAccess', refresh_token: 'sl.testRefresh', expires_in: 14400 }), { status: 200 });
    }
    if (String(url).includes('dropboxapi.com')) {
      window.__dbxCalls.push({ url: String(url), headers: opts.headers || {}, body: opts.body });
      if (String(url).endsWith('/files/list_folder')) {
        // sd4/sd5: dynamiczne daty — świeży backup (dziś), stary (10 dni) i bardzo stary (30 dni);
        // rotacja 7 dni ma usunąć dwa ostatnie
        const fmt = ms => {
          const d = new Date(Date.now() - ms);
          const p = n => String(n).padStart(2, '0');
          return { name: `speed-dial_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.json`, iso: d.toISOString() };
        };
        const f = fmt(60 * 1000), o10 = fmt(10 * 86400 * 1000), o30 = fmt(30 * 86400 * 1000);
        return new Response(JSON.stringify({
          entries: [
            { '.tag': 'file', name: f.name, path_display: '/backups/' + f.name, server_modified: f.iso },
            { '.tag': 'file', name: o10.name, path_display: '/backups/' + o10.name, server_modified: o10.iso },
            { '.tag': 'file', name: o30.name, path_display: '/backups/' + o30.name, server_modified: o30.iso },
            { '.tag': 'folder', name: 'backups', path_display: '/backups' },
          ],
          has_more: false,
        }), { status: 200 });
      }
      if (String(url).endsWith('/files/list_folder/continue')) {
        return new Response(JSON.stringify({ entries: [], has_more: false }), { status: 200 });
      }
      if (String(url).endsWith('/files/delete_v2')) {
        return new Response(JSON.stringify({ metadata: {} }), { status: 200 });
      }
      if (String(url).endsWith('/files/upload')) {
        return new Response(JSON.stringify({ id: 'dbxid123' }), { status: 200 });
      }
      if (String(url).endsWith('/files/download')) {
        return new Response(JSON.stringify({
          groups: [{ id: 'gr1', name: 'Z Dropboxa', color: '#46a758', open: true,
            tiles: [{ id: 't1', title: 'Przywrócone', url: 'https://example.com' }] }],
          savedAt: '2026-10-02T10:00:00Z',
        }), { status: 200 });
      }
    }
    return realFetch(url, opts);
  };
})();
