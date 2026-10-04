const { spawn } = require('child_process');
const http = require('http');
const PORT = 9334;
const URL = 'http://127.0.0.1:8765/test/test.html';
function cdp(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const cb = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) { ws.removeEventListener('message', cb); msg.error ? reject(new Error(method + ': ' + JSON.stringify(msg.error))) : resolve(msg.result); }
    };
    ws.on('message', cb);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function main() {
  const chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 2000));
  const targets = await new Promise((res, rej) => {
    http.get(`http://127.0.0.1:${PORT}/json`, (r) => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(JSON.parse(d))); }).on('error', rej);
  });
  const page = targets.find(t => t.type === 'page');
  const WebSocket = require('ws');
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise(r => ws.on('open', r));
  let idc = 1;
  const evalJs = async (expr) => {
    const r = await cdp(ws, idc++, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) console.log('EXC:', JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 300));
    return r.result?.value;
  };
  const log = async (label, expr) => console.log(label, '=>', await evalJs(expr));
  await cdp(ws, idc++, 'Runtime.enable');
  ws.on('message', (d) => { const m = JSON.parse(d); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.log('CONSOLE-ERR:', m.params.args.map(a=>a.value||a.description).join(' ')); });
  await cdp(ws, idc++, 'Page.enable');
  await cdp(ws, idc++, 'Page.navigate', { url: URL });
  await new Promise(r => setTimeout(r, 1500));

  await log('typeof chrome', `typeof chrome`);
  await log('__dbxCalls init', `JSON.stringify(window.__dbxCalls)`);
  await log('groups DOM', `document.querySelectorAll('.group').length`);
  await log('backup dialog exists', `!!document.querySelector('#dlg-backup-ok')`);
  await evalJs(`window.confirm = () => true;`);
  await evalJs(`
    openBackupDialog();
    document.querySelector('#f-dbx-token').value = 'sl.TESTTOKEN';
    document.querySelector('#f-dbx-auto').checked = true;
    document.querySelector('#dlg-backup-ok').click();
  `);
  await new Promise(r => setTimeout(r, 800));
  await log('__dbxCalls after push', `JSON.stringify(window.__dbxCalls)`);
  await log('dbx-status', `document.querySelector('#dbx-status')?.textContent`);
  ws.close(); chrome.kill(); process.exit(0);
}
main().catch(e => { console.error('ERROR', e); process.exit(2); });
