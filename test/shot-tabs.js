/* Screenshot tabs mode: import GSD backup, switch to tabs, screenshot. */
const { spawn } = require('child_process');
const http = require('http');
const PORT = 9361;
const URL = 'http://127.0.0.1:8765/test/test.html';
const OUT = '/home/ubuntu/.hermes/cache/scratch/dial-tabs.png';

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
  const chrome = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });
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
  await cdp(ws, idc++, 'Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await cdp(ws, idc++, 'Page.navigate', { url: URL });
  await new Promise(r => setTimeout(r, 1500));

  await evalJs(`window.confirm = (m) => true;`);
  await evalJs(`(async () => {
    const res = await fetch('/test/backup-real.group_speed_dial');
    const txt = await res.text();
    await importJson(new File([txt], 'backup.group_speed_dial'));
  })()`);
  await new Promise(r => setTimeout(r, 1500));
  await evalJs(`
    document.querySelector('#btn-settings').click();
    document.querySelector('#settings-menu [data-act="view"]').click();
  `);
  await new Promise(r => setTimeout(r, 800));

  const info = await evalJs(`JSON.stringify({
    mode: state.view.mode,
    tabs: document.querySelectorAll('.tab').length,
    active: document.querySelectorAll('.tab.active').length,
    groups: document.querySelectorAll('.group').length,
    bodyClass: document.body.className,
  })`);
  console.log('tabs shot ->', info);

  const shot = await cdp(ws, idc++, 'Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log('saved', OUT);

  ws.close(); chrome.kill();
  process.exit(0);
}

main().catch(e => { console.error('ERROR', e.message); process.exit(2); });
