/* Headless functional test via CDP-free approach: use --dump-dom after driving with query-driven script.
   Simpler: puppeteer-style using raw CDP over chromium --remote-debugging-port. */
const { spawn, execSync } = require('child_process');
const http = require('http');

const PORT = 9333;
const URL = 'http://127.0.0.1:8765/test/test.html';

function cdp(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const cb = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.removeEventListener('message', cb);
        msg.error ? reject(new Error(method + ': ' + JSON.stringify(msg.error))) : resolve(msg.result);
      }
    };
    ws.on('message', cb);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const chrome = spawn('chromium', [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    `--remote-debugging-port=${PORT}`, 'about:blank',
  ], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 2000));

  const targets = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}/json`, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
  const page = targets.find(t => t.type === 'page');
  const WebSocket = (await import('ws')).default;
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise(r => ws.on('open', r));

  let idc = 1;
  const evalJs = async (expr) => (await cdp(ws, idc++, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

  await cdp(ws, idc++, 'Page.enable');
  await cdp(ws, idc++, 'Page.navigate', { url: URL });
  await new Promise(r => setTimeout(r, 1500));

  const results = [];
  const check = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}`);

  // 1. initial render: default groups
  let groups = await evalJs(`document.querySelectorAll('.group').length`);
  check('render: 2 default groups', groups === 2);
  let tiles = await evalJs(`document.querySelectorAll('.tile').length`);
  check('render: 6 default tiles', tiles === 6);
  let stats = await evalJs(`document.querySelector('#stats').textContent`);
  check('stats text', /6 kafelków w 2 grupach/.test(stats));

  // 2. add group via dialog logic (call openGroupDialog + fill + ok)
  await evalJs(`
    openGroupDialog(null);
    document.querySelector('#f-group-name').value = 'Testowa';
    document.querySelector('#dlg-group-ok').click();
  `);
  await new Promise(r => setTimeout(r, 300));
  groups = await evalJs(`document.querySelectorAll('.group').length`);
  check('add group: 3 groups', groups === 3);
  const stored = await evalJs(`JSON.stringify(window.__store.groups.map(g => g.name))`);
  check('persist: group saved to storage', stored.includes('Testowa'));

  // 3. add tile to group 3
  await evalJs(`
    const gid = window.__store.groups.find(g => g.name === 'Testowa').id;
    openTileDialog(null, gid);
    document.querySelector('#f-title').value = 'Onet';
    document.querySelector('#f-url').value = 'onet.pl';
    document.querySelector('#dlg-ok').click();
  `);
  await new Promise(r => setTimeout(r, 300));
  tiles = await evalJs(`document.querySelectorAll('.tile').length`);
  check('add tile: 7 tiles', tiles === 7);
  const tileHref = await evalJs(`[...document.querySelectorAll('.tile')].map(a => a.href).join(' ')`);
  check('normalizeUrl: onet.pl -> https://onet.pl', tileHref.includes('https://onet.pl/'));

  // 4. search filter
  await evalJs(`(() => { const sf = document.querySelector('#search'); sf.value = 'onet'; sf.dispatchEvent(new Event('input')); })()`);
  await new Promise(r => setTimeout(r, 200));
  tiles = await evalJs(`document.querySelectorAll('.tile').length`);
  check('filter: 1 tile for "onet"', tiles === 1);
  await evalJs(`(() => { const sf2 = document.querySelector('#search'); sf2.value = ''; sf2.dispatchEvent(new Event('input')); })()`);

  // 5. delete tile (stub confirm first — headless default may auto-accept)
  await evalJs(`window.confirm = () => true;`);
  await evalJs(`document.querySelectorAll('.tile .del-tile')[0]?.click();`);
  await new Promise(r => setTimeout(r, 200));
  const cnt = await evalJs(`window.__store.groups.reduce((n,g)=>n+g.tiles.length,0)`);
  check('delete tile: storage count decremented', cnt === 6); // one tile deleted from 7

  // 6. Dropbox: save token + push (mocked fetch)
  await evalJs(`
    openBackupDialog();
    document.querySelector('#f-dbx-token').value = 'sl.TESTTOKEN';
    document.querySelector('#f-dbx-auto').checked = true;
    document.querySelector('#dlg-backup-ok').click();
  `);
  await new Promise(r => setTimeout(r, 500));
  const calls = await evalJs(`JSON.stringify(window.__dbxCalls.map(c => c.url))`);
  check('dropbox: upload called', calls.includes('files/upload'));
  const argHdr = await evalJs(`window.__dbxCalls[0].headers['Dropbox-API-Arg'] || ''`);
  check('dropbox: overwrite mode', argHdr.includes('overwrite'));
  const body = await evalJs(`window.__dbxCalls[0].body`);
  check('dropbox: body has groups', body.includes('"groups"'));

  // 7. Dropbox restore
  await evalJs(`
    openBackupDialog();
    document.querySelector('#btn-dbx-restore').click();
  `);
  await new Promise(r => setTimeout(r, 500));
  const restoredName = await evalJs(`window.__store.groups[0].name`);
  check('dropbox restore: group from mock', restoredName === 'Z Dropboxa');
  const status = await evalJs(`document.querySelector('#dbx-status').textContent`);
  check('dropbox restore: status ok', status.includes('✓'));

  // 8. clock
  const clock = await evalJs(`document.querySelector('#clock').textContent`);
  check('clock renders', /\d{2}:\d{2}/.test(clock));

  // 9. settings menu: hidden options, gear toggles
  const menuHidden0 = await evalJs(`document.querySelector('#settings-menu').hidden`);
  check('settings menu: hidden initially', menuHidden0 === true);
  await evalJs(`document.querySelector('#btn-settings').click();`);
  const menuHidden1 = await evalJs(`document.querySelector('#settings-menu').hidden`);
  check('settings menu: opens on gear click', menuHidden1 === false);
  await evalJs(`document.body.click();`);
  const menuHidden2 = await evalJs(`document.querySelector('#settings-menu').hidden`);
  check('settings menu: closes on outside click', menuHidden2 === true);

  // 10. GSD import conversion (synthetic sample of real structure)
  await evalJs(`
    window.confirm = (m) => { window.__confirmMsg = m; return true; };
    confirmDlg = async (t, m) => { window.__confirmMsg = m; return true; };
    save = async () => { window.__gsdImported = state.groups; };
    const sample = {
      dataVersion: 39,
      groups: [
        { id: 'A', name: ' Grupa A ', dials: [ { name: '  Wiki  ', url: 'https://wikipedia.org' }, {}, { name: '', url: 'chrome://settings' } ] },
        { id: 'B', name: 'Archiwum', archived: true, dials: [ { name: 'stara', url: 'https://old.example.com' } ] },
        { id: 'C', name: 'Zdjęcia', dials: [ { name: 'Imgur', url: 'https://imgur.com' } ] },
      ],
      ___thumbnails: [ { url: 'https://wikipedia.org', group: 'A', img: 'data:image/png;base64,AAA' } ],
    };
    window.__gsdImported = null; importJson(new File([JSON.stringify(sample)], 'backup.group_speed_dial', { type: 'application/json' }));
  `);
  await new Promise(r => setTimeout(r, 400));
  const gsd = await evalJs(`JSON.stringify({
    groups: (window.__gsdImported||[]).map(g => ({ name: g.name, tiles: g.tiles.map(t => ({ title: t.title, url: t.url, thumb: t.thumb || null })) })),
    confirm: window.__confirmMsg || '',
  })`);
  const g = JSON.parse(gsd);
  check('gsd import: 2 groups (archived skipped)', g.groups.length === 2);
  check('gsd import: group name trimmed', g.groups[0]?.name === 'Grupa A');
  check('gsd import: dial name trimmed', g.groups[0]?.tiles[0]?.title === 'Wiki');
  check('gsd import: empty + non-http dials skipped', g.groups[0]?.tiles.length === 1);
  check('gsd import: thumbnail matched to tile', g.groups[0]?.tiles[0]?.thumb === 'data:image/png;base64,AAA');
  check('gsd import: confirm shows counts', /2 grup.*2 kafelk/.test(g.confirm));

  // 11. GSD import end-to-end na REALNYM backupie (fetch z serwera testowego)
  await evalJs(`(async () => {
    const res = await fetch('/test/backup-real.group_speed_dial');
    const txt = await res.text();
    importJson(new File([txt], 'backup.group_speed_dial'));
  })()`);
  await new Promise(r => setTimeout(r, 1500));
  const real = await evalJs(`JSON.stringify({
    groups: (window.__gsdImported||[]).map(g => ({ name: g.name, n: g.tiles.length })),
    withThumb: (window.__gsdImported||[]).reduce((n,g)=>n+g.tiles.filter(t=>t.thumb).length,0),
  })`);
  const r = JSON.parse(real);
  check('gsd real: 19 groups', r.groups.length === 19);
  check('gsd real: 471 tiles', r.groups.reduce((n,g)=>n+g.n,0) === 471);
  check('gsd real: 459 tiles with thumbnails (non-http skipped)', r.withThumb === 459);
  check('gsd real: first group Toolsy', r.groups[0]?.name === 'Toolsy');

  // 12. Tabs view (Brave-style)
  await evalJs(`window.confirm = () => true;`);
  // clear any active search filter (stale from step 8) — tabs view needs no filter
  await evalJs(`const s0 = document.querySelector('#search'); s0.value = ''; s0.dispatchEvent(new Event('input'));`);
  // start: mode 'all'
  let mode = await evalJs(`state.view.mode`);
  check('tabs: default mode all', mode === 'all');
  let tabbarCount = await evalJs(`document.querySelectorAll('.tab-bar').length`);
  check('tabs: no tab-bar in all mode', tabbarCount === 0);
  // switch to tabs via gear menu
  await evalJs(`
    document.querySelector('#btn-settings').click();
    document.querySelector('#settings-menu [data-act="view"]').click();
  `);
  await new Promise(r => setTimeout(r, 300));
  mode = await evalJs(`state.view.mode`);
  check('tabs: mode switched to tabs', mode === 'tabs');
  check('tabs: body has view-tabs class', await evalJs(`document.body.classList.contains('view-tabs')`) === true);
  let tabCount = await evalJs(`document.querySelectorAll('.tab').length`);
  check('tabs: one tab per group (19)', tabCount === 19);
  let activeTabs = await evalJs(`document.querySelectorAll('.tab.active').length`);
  check('tabs: exactly one active', activeTabs === 1);
  let visibleGroups = await evalJs(`document.querySelectorAll('.group').length`);
  check('tabs: only active group rendered (1)', visibleGroups === 1);
  const label1 = await evalJs(`document.querySelector('#view-label').textContent`);
  check('tabs: menu label shows check', label1.includes('✓'));

  // click second tab -> active changes
  await evalJs(`document.querySelectorAll('.tab')[1].click();`);
  await new Promise(r => setTimeout(r, 200));
  activeTabs = await evalJs(`document.querySelectorAll('.tab.active').length`);
  check('tabs: still one active after switch', activeTabs === 1);
  const activeName = await evalJs(`document.querySelector('.tab.active .tab-label').textContent`);
  const boardName = await evalJs(`document.querySelector('.group h2').textContent`);
  check('tabs: board shows active group', activeName === boardName && !!activeName);

  // mode persisted
  const savedMode = await evalJs(`window.__store.viewMode`);
  check('tabs: viewMode persisted to storage', savedMode === 'tabs');

  // close active tab via ✕ -> neighbor becomes active
  const beforeTabs = await evalJs(`document.querySelectorAll('.tab').length`);
  await evalJs(`document.querySelector('.tab.active .tab-close').click();`);
  await new Promise(r => setTimeout(r, 200));
  const afterTabs = await evalJs(`document.querySelectorAll('.tab').length`);
  const groupsOnBoard = await evalJs(`document.querySelectorAll('.group').length`);
  check('tabs: close tab removes group (n-1)', beforeTabs - afterTabs === 1);
  check('tabs: neighbor becomes active after close', activeTabs === 1 && groupsOnBoard === 1);

  // middle-click closes
  await evalJs(`
    const t = document.querySelectorAll('.tab')[0];
    t.dispatchEvent(new MouseEvent('auxclick', { button: 1, bubbles: true }));
  `);
  await new Promise(r => setTimeout(r, 200));
  const afterMid = await evalJs(`document.querySelectorAll('.tab').length`);
  check('tabs: middle-click closes tab', afterMid === afterTabs - 1);

  // new group via "+" becomes active
  await evalJs(`
    openGroupDialog(null);
    document.querySelector('#f-group-name').value = 'Nowa Zakładka';
    document.querySelector('#dlg-group-ok').click();
  `);
  await new Promise(r => setTimeout(r, 300));
  const activeNew = await evalJs(`document.querySelector('.tab.active .tab-label').textContent`);
  check('tabs: new group becomes active tab', activeNew === 'Nowa Zakładka');

  // search in tabs mode: tab-bar hidden, all matches shown
  await evalJs(`(() => { const probe2 = state.groups[0].name.slice(0, 4); const sr = document.querySelector('#search'); sr.value = probe2; sr.dispatchEvent(new Event('input')); })()`);
  await new Promise(r => setTimeout(r, 200));
  const barHidden = await evalJs(`document.querySelector('.tab-bar')?.hidden`);
  const searchGroups = await evalJs(`document.querySelectorAll('.group').length`);
  check('tabs: search shows matches across groups', searchGroups >= 1 && barHidden === true);
  await evalJs(`(() => { const sc = document.querySelector('#search'); sc.value = ''; sc.dispatchEvent(new Event('input')); })()`);

  // back to all mode
  await evalJs(`
    document.querySelector('#btn-settings').click();
    document.querySelector('#settings-menu [data-act="view"]').click();
  `);
  await new Promise(r => setTimeout(r, 300));
  check('tabs: back to all mode renders all groups', await evalJs(`document.querySelectorAll('.group').length`) === 18);

  // 13. Pagination + layout dialog (pkt 7–8)
  await evalJs(`(async () => {
    state.view.mode = 'all';
    state.groups = [{ id: 'g1', name: 'Paged', color: '', collapsed: false, tiles: [] }];
    for (let i = 0; i < 10; i++) state.groups[0].tiles.push({ id: 't' + i, title: 'T' + i, url: 'https://x' + i + '.pl/', thumb: '' });
    state.layout = { cols: 3, rows: 2, paginate: true };
    save = async () => {};
    render();
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check('pagin: 6 tiles on page 1', await evalJs(`document.querySelectorAll('.tiles .tile').length`) === 6);
  check('pagin: page-bar present', await evalJs(`document.querySelectorAll('.page-bar').length`) === 1);
  check('pagin: 4 page buttons (prev+2pages+next)', await evalJs(`document.querySelectorAll('.page-btn').length`) === 4);
  check('pagin: cols var set on board', await evalJs(`getComputedStyle(document.querySelector('.tiles')).gridTemplateColumns.split(' ').length`) === 3);
  // click page 2
  await evalJs(`document.querySelectorAll('.page-btn')[2].click();`);
  await new Promise(r => setTimeout(r, 200));
  check('pagin: page 2 shows T6..T9 (4 tiles)', await evalJs(`document.querySelectorAll('.tiles .tile').length`) === 4);
  check('pagin: page 2 first tile is T6', await evalJs(`document.querySelector('.tiles .tile .t-title').textContent`) === 'T6');
  // paginate off → all tiles, no bar
  await evalJs(`state.layout.paginate = false; render();`);
  await new Promise(r => setTimeout(r, 200));
  check('pagin: off → all 10 tiles', await evalJs(`document.querySelectorAll('.tiles .tile').length`) === 10);
  check('pagin: off → no page-bar', await evalJs(`document.querySelectorAll('.page-bar').length`) === 0);
  // layout dialog saves to storage and applies --cols
  await evalJs(`(async () => {
    document.querySelector('#btn-settings').click();
    document.querySelector('#settings-menu [data-act="layout"]').click();
    document.querySelector('#f-cols').value = 5;
    document.querySelector('#f-rows').value = 2;
    document.querySelector('#f-paginate').checked = true;
    document.querySelector('#dlg-layout-ok').click();
  })()`);
  await new Promise(r => setTimeout(r, 400));
  const lay = JSON.parse(await evalJs(`JSON.stringify(window.__store.layout || null)`));
  check('layout: saved cols=5 rows=2 paginate', lay && lay.cols === 5 && lay.rows === 2 && lay.paginate === true);
  check('layout: dialog closed after ok', await evalJs(`document.querySelector('#dlg-layout').open`) === false);
  check('layout: 5 columns applied', await evalJs(`getComputedStyle(document.querySelector('.tiles')).gridTemplateColumns.split(' ').length`) === 5);
  check('layout: pagination with 5×2 → 10 tiles one page', await evalJs(`document.querySelectorAll('.tiles .tile').length`) === 10);

  console.log(results.join('\n'));
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  ws.close(); chrome.kill();
  process.exit(fails ? 1 : 0);
}

main().catch(e => { console.error('ERROR', e.message); process.exit(2); });
