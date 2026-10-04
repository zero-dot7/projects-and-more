/* Test harness: injects chrome.* mock BEFORE app.js and stubs extension-only APIs. */
(function () {
  const store = {};
  window.__store = store;
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
  window.fetch = async (url, opts = {}) => {
    if (String(url).includes('dropboxapi.com')) {
      window.__dbxCalls.push({ url: String(url), headers: opts.headers || {}, body: opts.body });
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
