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
      topSites: { // pkt 24 mock
        async get() {
          return [
            { url: 'https://github.com', title: 'GitHub' },
            { url: 'https://news.ycombinator.com', title: 'Hacker News' },
            { url: 'https://developer.mozilla.org', title: 'MDN' },
          ];
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
