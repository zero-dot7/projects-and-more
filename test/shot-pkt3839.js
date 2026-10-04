// pkt 38/39: screenshoty po usunięciu top-sites i i18n (EN-only)
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const PORT = 9361;
function cdp(ws, id, method, params = {}) {
  return Promise.race([
    new Promise((_, rej) => setTimeout(() => rej(new Error('cdp-timeout:' + method)), 8000)),
    new Promise((res, rej) => {
      const cb = (d) => { const m = JSON.parse(d.toString()); if (m.id === id) { ws.removeEventListener('message', cb); m.error ? rej(new Error(method)) : res(m.result); } };
      ws.on('message', cb); ws.send(JSON.stringify({ id, method, params }));
    })
  ]);
}
async function main() {
  const chrome = spawn('chromium', ['--headless=new','--no-sandbox','--disable-gpu',`--remote-debugging-port=${PORT}`,'--window-size=1280,800','about:blank'], {stdio:['ignore','ignore','pipe']});
  chrome.stderr.on('data', d => { const s = d.toString(); if (/crash|oom|kill|fatal|SIG|Check failed/i.test(s)) console.log('CHROME-STDERR:', s.slice(0,300).trim()); });
  await new Promise(r=>setTimeout(r,2500));
  const targets = await new Promise((res,rej)=>http.get(`http://127.0.0.1:${PORT}/json`,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej));
  const page = targets.find(t=>t.type==='page');
  const WebSocket = (await import('ws')).default;
  const ws = new WebSocket(page.webSocketDebuggerUrl,{perMessageDeflate:false});
  await new Promise((res,rej)=>{ws.on('open',res);ws.on('error',rej);});
  let idc=1;
  await cdp(ws,idc++,'Page.enable');
  await cdp(ws,idc++,'Page.navigate',{url:'http://127.0.0.1:8765/test/test.html'});
  await new Promise(r=>setTimeout(r,1500));
  // import real backup (confirm auto-accept, dropbox fetchy wyciszone)
  await cdp(ws,idc++,'Runtime.evaluate',{expression:`(async () => {
    window.confirm = () => true;
    window.alert = (m) => console.log('alert:', m);
    const realFetch = window.fetch.bind(window);
    window.fetch = (u, o) => String(u).includes('dropboxapi.com') ? new Response('{}', {status:200}) : realFetch(u, o);
    const txt = await (await fetch('/test/backup-real.group_speed_dial')).text();
    importJson(new File([txt], 'b.group_speed_dial'));
  })()`, awaitPromise:true, returnByValue:true});
  await new Promise(r=>setTimeout(r,4000));
  // day theme (backup may contain night)
  await cdp(ws,idc++,'Runtime.evaluate',{expression:`if (state.view.mode !== 'tabs') { state.view.mode = 'tabs'; if(!state.view.activeId && state.groups.length) state.view.activeId = state.groups[0].id; render(); } if (state.theme !== 'day') { state.theme = 'day'; applyTheme(); }`, returnByValue:true});
  await new Promise(r=>setTimeout(r,400));
  let r = await cdp(ws,idc++,'Page.captureScreenshot',{format:'png'});
  fs.writeFileSync('/tmp/sd5-day.png', Buffer.from(r.data,'base64'));
  console.log('day saved');
  // night
  await cdp(ws,idc++,'Runtime.evaluate',{expression:`state.theme='night'; applyTheme();`, returnByValue:true});
  await new Promise(r=>setTimeout(r,400));
  r = await cdp(ws,idc++,'Page.captureScreenshot',{format:'png'});
  fs.writeFileSync('/tmp/sd5-night.png', Buffer.from(r.data,'base64'));
  console.log('night saved');
  // sanity: no top-sites, no i18n
  const chk = (await cdp(ws,idc++,'Runtime.evaluate',{expression:`JSON.stringify({
    topTiles: !!document.querySelector('.top-tile, #top-sites, [data-act="topsites"], [data-act="topreset"]'),
    langBtn: !!document.querySelector('[data-act="lang"], .btn-lang'),
    plText: document.body.innerText.includes('Zakładki'),
    stats: document.querySelector('#stats')?.textContent || ''
  })`, returnByValue:true})).result.value;
  console.log('CHECKS:', chk);
  ws.close(); chrome.kill();
  process.exit(0);
}
main().catch(e => { console.error('ERR', e.message); process.exit(1); });
